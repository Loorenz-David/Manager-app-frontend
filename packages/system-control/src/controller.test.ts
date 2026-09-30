import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSystemController, type SystemController } from "./controller";
import {
  BACKOFF_CAP_MS,
  PROBE_SETTLE_MS,
  SLOW_POLL_MS,
  type SystemState,
} from "./machine";
import {
  AUTOMATIC_RELOAD_STORAGE_KEY,
  markAutomaticReload,
  resetAutomaticReloadMarkerForTests,
} from "./reload-marker";
import {
  createFakeControlPlane,
  dispatchAvailable,
  dispatchUnavailable,
  installVisibility,
  setVisibility,
  type Override,
} from "./test/fake-control-plane";

let controller: SystemController | null = null;

function start(
  plane: ReturnType<typeof createFakeControlPlane>,
  options: { automaticReload?: boolean } = {},
): SystemController {
  controller = createSystemController({ fetch: plane.fetch, ...options });
  controller.start();
  return controller;
}

function state(): SystemState {
  return controller!.getSnapshot().state;
}

/** Lets pending promise callbacks run without moving the clock. */
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

/** Brings a fresh controller to READY (children mounted). */
async function startReady(plane: ReturnType<typeof createFakeControlPlane>) {
  const gate = start(plane);
  await flush();
  expect(state()).toBe("READY");
  return gate;
}

beforeEach(() => {
  vi.useFakeTimers();
  installVisibility("visible");
  resetAutomaticReloadMarkerForTests();
  sessionStorage.clear();
});

afterEach(() => {
  controller?.stop();
  controller = null;
  vi.useRealTimers();
});

describe("boot", () => {
  it("READY releases at once, without a wake", async () => {
    const plane = createFakeControlPlane("ready");
    start(plane);
    expect(state()).toBe("BOOT");
    expect(controller!.getSnapshot().online).toBe(false);

    await flush();

    expect(state()).toBe("READY");
    expect(controller!.getSnapshot()).toMatchObject({ hasBeenReady: true, online: true });
    expect(plane.wakeCalls()).toBe(0);
  });

  it("SLEEPING on a visible page: exactly one wake, then STARTING through the phases, then READY", async () => {
    const plane = createFakeControlPlane("sleep", 8);
    start(plane);
    const seen: string[] = [];
    controller!.subscribe((snapshot) => {
      seen.push(`${snapshot.state}:${snapshot.phase ?? "-"}`);
    });

    await flush();
    expect(plane.wakeCalls()).toBe(1);
    // The wake answered STARTING (DATABASE).
    expect(state()).toBe("STARTING");
    expect(controller!.getSnapshot().phase).toBe("DATABASE");
    expect(controller!.getSnapshot().estimatedRemainingSeconds).toBe(8);

    await advance(10_000);

    expect(state()).toBe("READY");
    expect(plane.wakeCalls()).toBe(1);
    expect(seen[0]).toBe("SLEEPING:-");
    expect(seen).toContain("STARTING:SERVER");
    expect(seen).toContain("STARTING:HEALTH_CHECK");
    expect(seen.at(-1)).toBe("READY:-");
  });

  it("never sends a second wake once one was acknowledged, even if status lags on SLEEPING", async () => {
    const plane = createFakeControlPlane("sleep");
    start(plane);
    await flush();
    expect(plane.wakeCalls()).toBe(1);

    // The control plane keeps answering SLEEPING for a while.
    plane.override("GET", {
      kind: "raw",
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: 1, state: "SLEEPING" }),
    });
    await advance(120_000);

    expect(plane.wakeCalls()).toBe(1);
    expect(state()).toBe("STARTING");

    plane.override("GET", null);
    await advance(15_000);
    expect(state()).toBe("READY");
    expect(plane.wakeCalls()).toBe(1);
  });

  it("hidden at boot: no wake until the page becomes visible, then one wake", async () => {
    installVisibility("hidden");
    const plane = createFakeControlPlane("sleep");
    start(plane);

    await flush();
    await advance(10 * 60_000);
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
    expect(plane.wakeCalls()).toBe(0);
    expect(state()).toBe("SLEEPING");

    setVisibility("visible");
    await flush();
    expect(plane.wakeCalls()).toBe(1);

    await advance(10_000);
    expect(state()).toBe("READY");
    expect(plane.wakeCalls()).toBe(1);
  });

  const failClosed: Array<[string, Override]> = [
    ["malformed JSON", { kind: "raw", status: 200, contentType: "application/json", body: "{version: 1," }],
    [
      "index.html",
      {
        kind: "raw",
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: '<!doctype html><html><body><div id="root"></div></body></html>',
      },
    ],
    [
      "a READY body with the wrong content type",
      { kind: "raw", status: 200, contentType: "text/plain", body: '{"version":1,"state":"READY"}' },
    ],
    [
      "a READY body without a content type",
      { kind: "raw", status: 200, contentType: null, body: '{"version":1,"state":"READY"}' },
    ],
    [
      "an unknown state",
      { kind: "raw", status: 200, contentType: "application/json", body: '{"version":1,"state":"AWAKE"}' },
    ],
    [
      "version 2",
      { kind: "raw", status: 200, contentType: "application/json", body: '{"version":2,"state":"READY"}' },
    ],
    [
      "a missing version",
      { kind: "raw", status: 200, contentType: "application/json", body: '{"state":"READY"}' },
    ],
    [
      "a mistyped optional field",
      {
        kind: "raw",
        status: 200,
        contentType: "application/json",
        body: '{"version":1,"state":"READY","retry_after_seconds":"3"}',
      },
    ],
    [
      "404",
      { kind: "raw", status: 404, contentType: "application/json", body: '{"version":1,"state":"READY"}' },
    ],
    [
      "500",
      { kind: "raw", status: 500, contentType: "application/json", body: '{"version":1,"state":"READY"}' },
    ],
    [
      "503",
      { kind: "raw", status: 503, contentType: "text/html", body: "<html>unavailable</html>" },
    ],
    ["a network error", { kind: "network" }],
  ];

  it.each(failClosed)("%s is FAILED, never READY, and is retried automatically", async (_label, override) => {
    const plane = createFakeControlPlane("ready");
    plane.override("GET", override);
    const gate = start(plane);
    const states = new Set<string>();
    gate.subscribe((snapshot) => states.add(snapshot.state));

    await flush();
    expect(state()).toBe("FAILED");
    await advance(60_000);

    expect(states.has("READY")).toBe(false);
    expect(gate.getSnapshot()).toMatchObject({ hasBeenReady: false, online: false });
    // Retried with backoff: 3 s, 6 s, 12 s, 15 s, 15 s ... within the minute.
    expect(plane.statusCalls()).toBeGreaterThanOrEqual(5);
    expect(plane.wakeCalls()).toBe(0);
  });

  it("a request that never answers times out as FAILED", async () => {
    const plane = createFakeControlPlane("ready");
    plane.override("GET", { kind: "hang" });
    const gate = start(plane);

    await advance(7_999);
    expect(state()).toBe("BOOT");
    await advance(1);
    expect(state()).toBe("FAILED");
    expect(gate.getSnapshot().failure).toBe("timeout");
  });

  it("FAILED backs off exponentially, capped at 15 s, and releases once the status is READY", async () => {
    const plane = createFakeControlPlane("ready");
    plane.override("GET", { kind: "network" });
    start(plane);
    await flush();
    expect(plane.statusCalls()).toBe(1);

    await advance(2_999);
    expect(plane.statusCalls()).toBe(1);
    await advance(1);
    expect(plane.statusCalls()).toBe(2);
    await advance(6_000);
    expect(plane.statusCalls()).toBe(3);
    await advance(12_000);
    expect(plane.statusCalls()).toBe(4);
    await advance(BACKOFF_CAP_MS);
    expect(plane.statusCalls()).toBe(5);
    await advance(BACKOFF_CAP_MS);
    expect(plane.statusCalls()).toBe(6);

    plane.override("GET", null);
    await advance(BACKOFF_CAP_MS);
    expect(state()).toBe("READY");
  });

  it("a control plane that says FAILED shows FAILED and recovers to READY", async () => {
    const plane = createFakeControlPlane("failed");
    const gate = start(plane);
    await flush();
    expect(gate.getSnapshot()).toMatchObject({ state: "FAILED", failure: "system_failed" });

    plane.reset("ready");
    await advance(BACKOFF_CAP_MS);
    expect(state()).toBe("READY");
    expect(plane.wakeCalls()).toBe(0);
  });

  it("'Try again' only re-polls the status: never a wake", async () => {
    const plane = createFakeControlPlane("failed");
    const gate = start(plane);
    await flush();
    const before = plane.statusCalls();

    gate.retry();
    await flush();

    expect(plane.statusCalls()).toBe(before + 1);
    expect(plane.wakeCalls()).toBe(0);
  });

  it("an unknown phase is a generic STARTING", async () => {
    const plane = createFakeControlPlane("ready");
    plane.override("GET", {
      kind: "raw",
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: 1, state: "STARTING", phase: "WARMING_CACHES" }),
    });
    const gate = start(plane);
    await flush();
    expect(gate.getSnapshot()).toMatchObject({ state: "STARTING", phase: null });
  });

  it("requests go to the page origin, without cookies and without cache", async () => {
    const plane = createFakeControlPlane("sleep");
    start(plane);
    await flush();

    const [status, wake] = plane.calls;
    expect(status.method).toBe("GET");
    expect(status.url).toBe(`${window.location.origin}/system/status`);
    expect(wake.method).toBe("POST");
    expect(wake.url).toBe(`${window.location.origin}/system/wake`);
    for (const call of plane.calls) {
      expect(call.url.startsWith("http://api.test")).toBe(false);
      expect(call.init).toMatchObject({ credentials: "omit", cache: "no-store" });
      expect(call.init?.body).toBeUndefined();
    }
  });

  it("an unacknowledged wake (network error) is sent again only when the status still says SLEEPING", async () => {
    const plane = createFakeControlPlane("sleep");
    plane.override("POST", { kind: "network" });
    start(plane);
    await flush();
    expect(plane.wakeCalls()).toBe(1);
    expect(state()).toBe("FAILED");

    plane.override("POST", null);
    await advance(3_000);
    expect(plane.wakeCalls()).toBe(2);
    await advance(10_000);
    expect(state()).toBe("READY");
    expect(plane.wakeCalls()).toBe(2);
  });

  it("a stop before the first answer (StrictMode remount) neither wakes twice nor loses the reload marker", async () => {
    markAutomaticReload();
    const plane = createFakeControlPlane("sleep");
    const gate = start(plane);
    gate.stop();
    gate.start();
    await flush();

    expect(state()).toBe("DORMANT");
    expect(plane.wakeCalls()).toBe(0);
  });
});

describe("automatic reloads", () => {
  it("a fresh auto-reload marker + SLEEPING is DORMANT: no wake", async () => {
    markAutomaticReload();
    const plane = createFakeControlPlane("sleep");
    start(plane);
    await flush();
    await advance(10 * 60_000);

    expect(state()).toBe("DORMANT");
    expect(plane.wakeCalls()).toBe(0);
    expect(sessionStorage.getItem(AUTOMATIC_RELOAD_STORAGE_KEY)).toBeNull();
  });

  it("a stale marker (older than 60 s) counts as a visible page load", async () => {
    markAutomaticReload(Date.now() - 61_000);
    const plane = createFakeControlPlane("sleep");
    start(plane);
    await flush();
    expect(plane.wakeCalls()).toBe(1);
  });

  it("the marker does not matter when the system is READY", async () => {
    markAutomaticReload();
    const plane = createFakeControlPlane("ready");
    start(plane);
    await flush();
    expect(state()).toBe("READY");
  });
});

describe("unavailable while running", () => {
  it("background request + SLEEPING: DORMANT, and nothing but a trusted input wakes it", async () => {
    const plane = createFakeControlPlane("ready");
    const gate = await startReady(plane);
    plane.sleep();

    dispatchUnavailable(true);
    await flush();
    expect(state()).toBe("DORMANT");
    expect(gate.getSnapshot()).toMatchObject({ hasBeenReady: true, online: false });

    // Timers, focus, visibility, online, reconnect-style events, untrusted input.
    await advance(30 * 60_000);
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
    setVisibility("hidden");
    setVisibility("visible");
    window.dispatchEvent(new Event("pointerdown"));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    document.body.dispatchEvent(new Event("touchstart", { bubbles: true }));
    dispatchUnavailable(true);
    dispatchUnavailable(false);
    dispatchAvailable();
    gate.retry();
    gate.handleInputEvent({ isTrusted: false });
    await advance(5 * 60_000);

    expect(plane.wakeCalls()).toBe(0);
    expect(state()).toBe("DORMANT");
    // The slow poll is GET only: at most one per minute.
    expect(plane.statusCalls()).toBeLessThanOrEqual(2 + 36);

    // A trusted input on a hidden page does not count either.
    setVisibility("hidden");
    gate.handleInputEvent({ isTrusted: true });
    await flush();
    expect(plane.wakeCalls()).toBe(0);
    setVisibility("visible");

    gate.handleInputEvent({ isTrusted: true });
    await flush();
    expect(plane.wakeCalls()).toBe(1);
    expect(state()).toBe("STARTING");

    gate.handleInputEvent({ isTrusted: true });
    await advance(10_000);
    expect(state()).toBe("READY");
    expect(plane.wakeCalls()).toBe(1);
  });

  it("DORMANT polls GET /system/status at most once a minute and leaves when someone else woke the system", async () => {
    const plane = createFakeControlPlane("ready");
    await startReady(plane);
    plane.sleep();
    dispatchUnavailable(true);
    await flush();
    const polls = plane.statusCalls();

    await advance(SLOW_POLL_MS - 1);
    expect(plane.statusCalls()).toBe(polls);
    await advance(1);
    expect(plane.statusCalls()).toBe(polls + 1);

    plane.reset("ready");
    await advance(SLOW_POLL_MS);
    expect(state()).toBe("READY");
    expect(plane.wakeCalls()).toBe(0);
  });

  it("user request + SLEEPING: wakes at once (STARTING)", async () => {
    const plane = createFakeControlPlane("ready");
    await startReady(plane);
    plane.sleep();

    dispatchUnavailable(false);
    await flush();

    expect(plane.wakeCalls()).toBe(1);
    expect(state()).toBe("STARTING");
    await advance(10_000);
    expect(state()).toBe("READY");
    expect(plane.wakeCalls()).toBe(1);
  });

  it("control plane READY + API failing: UNAVAILABLE, offline, cleared by system:available", async () => {
    const plane = createFakeControlPlane("ready");
    const gate = await startReady(plane);

    dispatchUnavailable(true);
    dispatchUnavailable(false);
    await flush();
    expect(gate.getSnapshot()).toMatchObject({ state: "UNAVAILABLE", online: false });
    // One status check for the burst of failures.
    expect(plane.statusCalls()).toBe(2);

    // Re-check after 3 s: control plane READY -> one reconnect wave.
    await advance(3_000);
    expect(gate.getSnapshot()).toMatchObject({ state: "UNAVAILABLE", online: true });

    // The wave fails: offline again, back off.
    dispatchUnavailable(true);
    expect(gate.getSnapshot()).toMatchObject({ state: "UNAVAILABLE", online: false });
    await advance(6_000);
    expect(gate.getSnapshot().online).toBe(true);

    dispatchAvailable();
    expect(gate.getSnapshot()).toMatchObject({ state: "READY", online: true });
    expect(plane.wakeCalls()).toBe(0);
  });

  it("UNAVAILABLE clears when a reconnect wave produces no new failure", async () => {
    const plane = createFakeControlPlane("ready");
    await startReady(plane);
    dispatchUnavailable(true);
    await flush();
    await advance(3_000);
    expect(state()).toBe("UNAVAILABLE");

    await advance(PROBE_SETTLE_MS);
    expect(state()).toBe("READY");
  });

  it("UNAVAILABLE that finds the system asleep goes DORMANT (background) without a wake", async () => {
    const plane = createFakeControlPlane("ready");
    await startReady(plane);
    dispatchUnavailable(true);
    await flush();
    expect(state()).toBe("UNAVAILABLE");

    plane.sleep();
    await advance(3_000);
    expect(state()).toBe("DORMANT");
    expect(plane.wakeCalls()).toBe(0);
  });

  it("a recovery during the status check keeps READY", async () => {
    const plane = createFakeControlPlane("ready");
    await startReady(plane);

    dispatchUnavailable(true);
    dispatchAvailable();
    await flush();

    expect(state()).toBe("READY");
  });

  it("control plane STARTING or FAILED while running shows it, then READY", async () => {
    const plane = createFakeControlPlane("ready");
    await startReady(plane);
    plane.reset("failed");

    dispatchUnavailable(true);
    await flush();
    expect(state()).toBe("FAILED");

    plane.reset("ready");
    await advance(BACKOFF_CAP_MS);
    expect(state()).toBe("READY");
    expect(plane.wakeCalls()).toBe(0);
  });
});
