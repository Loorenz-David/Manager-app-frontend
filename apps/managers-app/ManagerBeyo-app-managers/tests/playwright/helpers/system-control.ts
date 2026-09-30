import type { Page, Route } from '@playwright/test';

/**
 * Playwright stand-in for the system-control contract (GET /system/status,
 * POST /system/wake), answered per page with `page.route` — never through the
 * dev server's shared simulator, so parallel tests cannot see each other's
 * state. The app fixture installs `routeSystemReady` for every test; routes a
 * test adds later take precedence.
 */

export type SystemStatusState = 'READY' | 'SLEEPING' | 'STARTING' | 'FAILED';

export function systemStatusBody(state: SystemStatusState): Record<string, unknown> {
  switch (state) {
    case 'READY':
      return { version: 1, state };
    case 'SLEEPING':
      return { version: 1, state, retry_after_seconds: 3 };
    case 'STARTING':
      return {
        version: 1,
        state,
        phase: 'DATABASE',
        retry_after_seconds: 1,
        estimated_remaining_seconds: 30,
      };
    case 'FAILED':
      return { version: 1, state, retry_after_seconds: 5 };
  }
}

const isStatusUrl = (url: URL): boolean => url.pathname === '/system/status';
const isWakeUrl = (url: URL): boolean => url.pathname === '/system/wake';

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  });
}

export async function routeSystemReady(page: Page): Promise<void> {
  await page.route(isStatusUrl, (route) => fulfillJson(route, 200, systemStatusBody('READY')));
  await page.route(isWakeUrl, (route) => fulfillJson(route, 202, systemStatusBody('READY')));
}

export type SystemControlMock = {
  setState(state: SystemStatusState): void;
  readonly wakeCalls: number;
  readonly statusCalls: number;
};

/** Status answers the current state; a wake counts and moves SLEEPING to STARTING. */
export async function routeSystemControl(
  page: Page,
  initial: SystemStatusState,
): Promise<SystemControlMock> {
  let state = initial;
  let wakeCalls = 0;
  let statusCalls = 0;
  await page.route(isStatusUrl, async (route) => {
    statusCalls += 1;
    await fulfillJson(route, 200, systemStatusBody(state));
  });
  await page.route(isWakeUrl, async (route) => {
    wakeCalls += 1;
    if (state === 'SLEEPING') state = 'STARTING';
    await fulfillJson(route, 202, systemStatusBody(state));
  });
  return {
    setState(next) {
      state = next;
    },
    get wakeCalls() {
      return wakeCalls;
    },
    get statusCalls() {
      return statusCalls;
    },
  };
}

/** /system/* answered by the SPA's index.html (a misrouted proxy). */
export async function routeSystemHtml(page: Page): Promise<{ readonly wakeCalls: number }> {
  let wakeCalls = 0;
  const html =
    '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>ManagerBeyo</title></head><body><div id="root"></div></body></html>';
  await page.route(isStatusUrl, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }),
  );
  await page.route(isWakeUrl, (route) => {
    wakeCalls += 1;
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  });
  return {
    get wakeCalls() {
      return wakeCalls;
    },
  };
}
