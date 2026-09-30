import type { Page, Route } from "@playwright/test";

/**
 * Playwright stand-in for the system-control contract (GET /system/status,
 * POST /system/wake), answered per page with `page.route` — never through the
 * dev server's shared simulator, so parallel tests cannot see each other's
 * state.
 *
 * `routeSystemReady` is installed for every test by the app fixture; a test
 * that needs another state calls `routeSystemControl`, whose routes take
 * precedence (Playwright runs the most recently added matching route first).
 */

export type SystemStatusState = "READY" | "SLEEPING" | "STARTING" | "FAILED";

type StatusBody = {
  version: 1;
  state: SystemStatusState;
  phase?: string | null;
  retry_after_seconds?: number;
  estimated_remaining_seconds?: number | null;
  message_code?: string;
};

export function systemStatusBody(state: SystemStatusState): StatusBody {
  switch (state) {
    case "READY":
      return { version: 1, state };
    case "SLEEPING":
      return { version: 1, state, retry_after_seconds: 3 };
    case "STARTING":
      return {
        version: 1,
        state,
        phase: "SERVER",
        retry_after_seconds: 1,
        estimated_remaining_seconds: 20,
      };
    case "FAILED":
      return { version: 1, state, retry_after_seconds: 5 };
  }
}

const isStatusUrl = (url: URL): boolean => url.pathname === "/system/status";
const isWakeUrl = (url: URL): boolean => url.pathname === "/system/wake";

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: { "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  });
}

/** Answers /system/status and /system/wake with READY. */
export async function routeSystemReady(page: Page): Promise<void> {
  await page.route(isStatusUrl, (route) =>
    fulfillJson(route, 200, systemStatusBody("READY")),
  );
  await page.route(isWakeUrl, (route) =>
    fulfillJson(route, 202, systemStatusBody("READY")),
  );
}

export type SystemControlMock = {
  /** What GET /system/status answers from now on. */
  setState(state: SystemStatusState): void;
  readonly state: SystemStatusState;
  readonly wakeCalls: number;
  readonly statusCalls: number;
  /**
   * Holds every wake response until the returned function is called (to see
   * the "waking" screen while the wake is in flight).
   */
  holdWake(): () => void;
};

export type SystemControlOptions = {
  initial: SystemStatusState;
  /**
   * The state a wake moves a SLEEPING system to (the wake answers with it).
   * Default STARTING.
   */
  wakeTo?: SystemStatusState;
};

/**
 * A stateful control plane: status answers the current state; a wake counts,
 * and moves a SLEEPING system to `wakeTo`.
 */
export async function routeSystemControl(
  page: Page,
  { initial, wakeTo = "STARTING" }: SystemControlOptions,
): Promise<SystemControlMock> {
  let state = initial;
  let wakeCalls = 0;
  let statusCalls = 0;
  let wakeGate: Promise<void> | null = null;

  await page.route(isStatusUrl, async (route) => {
    statusCalls += 1;
    await fulfillJson(route, 200, systemStatusBody(state));
  });
  await page.route(isWakeUrl, async (route) => {
    if (route.request().method() !== "POST") {
      await fulfillJson(route, 405, { error: "method_not_allowed" });
      return;
    }
    wakeCalls += 1;
    if (state === "SLEEPING") state = wakeTo;
    const body = systemStatusBody(state);
    if (wakeGate) await wakeGate;
    await fulfillJson(route, 202, body);
  });

  return {
    setState(next) {
      state = next;
    },
    get state() {
      return state;
    },
    get wakeCalls() {
      return wakeCalls;
    },
    get statusCalls() {
      return statusCalls;
    },
    holdWake() {
      let release = (): void => {};
      wakeGate = new Promise<void>((resolve) => {
        release = () => {
          wakeGate = null;
          resolve();
        };
      });
      return release;
    },
  };
}

/**
 * Answers /system/status and /system/wake with the SPA's index.html (a
 * misrouted proxy): the gate must fail closed.
 */
export async function routeSystemHtml(page: Page): Promise<{ readonly wakeCalls: number }> {
  let wakeCalls = 0;
  const html =
    '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>ManagerBeyo</title></head><body><div id="root"></div></body></html>';
  await page.route(isStatusUrl, (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }),
  );
  await page.route(isWakeUrl, (route) => {
    wakeCalls += 1;
    return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
  });
  return {
    get wakeCalls() {
      return wakeCalls;
    },
  };
}
