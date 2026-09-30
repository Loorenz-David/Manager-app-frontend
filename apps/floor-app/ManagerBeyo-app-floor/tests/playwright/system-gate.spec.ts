import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures/app-fixture";
import {
  FLOOR_TOKEN_STORAGE_KEY,
  floorDeviceToken,
  pairFloorDevice,
  routeFloorBackend,
} from "./fixtures/floor-kiosk";
import { routeSystemControl, routeSystemHtml } from "./fixtures/system-control";

/** FLOOR_ROSTER_REFRESH_INTERVAL_MS (@beyo/worker-shifts). */
const ROSTER_REFRESH_MS = 2 * 60 * 1000;
/** SLOW_POLL_MS (@beyo/system-control): DORMANT's GET-only status poll. */
const DORMANT_POLL_MS = 60_000;

/** Every request the page sends to the backend API. */
function countApiRequests(page: Page): { readonly count: number } {
  const counter = { count: 0 };
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) counter.count += 1;
  });
  return counter;
}

/**
 * A real (trusted) touch or click in the middle of the screen — Playwright's
 * input goes through the browser, so `event.isTrusted` is true.
 */
async function touchScreen(page: Page): Promise<void> {
  const viewport = page.viewportSize() ?? { width: 800, height: 600 };
  const x = Math.round(viewport.width / 2);
  const y = Math.round(viewport.height / 2);
  if (test.info().project.use.hasTouch) {
    await page.touchscreen.tap(x, y);
  } else {
    await page.mouse.click(x, y);
  }
}

test("system gate (floor): the kiosk boots through SLEEPING -> wake -> STARTING -> READY with exactly one wake", async ({
  page,
}) => {
  const system = await routeSystemControl(page, { initial: "SLEEPING" });
  await pairFloorDevice(page, floorDeviceToken("gate-boot"));
  const backend = await routeFloorBackend(page);
  const releaseWake = system.holdWake();

  await page.goto("/");

  // The wake is in flight: "waking", and nothing of the app yet.
  await expect(page.getByTestId("system-gate-sleeping")).toBeVisible();
  await expect.poll(() => system.wakeCalls).toBe(1);
  expect(backend.meRequests).toBe(0);
  await expect(page.getByTestId("keypad-screen")).toHaveCount(0);

  releaseWake();
  await expect(page.getByTestId("system-gate-starting")).toBeVisible();
  await expect(page.getByTestId("system-gate-phase")).toHaveText(
    "Starting the server",
  );
  expect(backend.meRequests).toBe(0);

  system.setState("READY");
  await expect(page.getByTestId("keypad-screen")).toBeVisible();
  await expect(page.getByTestId("system-gate-starting")).toHaveCount(0);
  expect(backend.meRequests).toBe(1);
  expect(system.wakeCalls).toBe(1);
});

test("system gate (floor): a text/html /system/status fails closed and the app never renders", async ({
  page,
}) => {
  const html = await routeSystemHtml(page);
  await pairFloorDevice(page, floorDeviceToken("gate-html"));
  const api = countApiRequests(page);

  await page.goto("/");

  await expect(page.getByTestId("system-gate-failed")).toBeVisible();
  // Past the first backoff re-check, and after a manual "Try again".
  await page.waitForTimeout(3_500);
  await page.getByTestId("system-gate-retry").click();
  await page.waitForTimeout(500);

  await expect(page.getByTestId("system-gate-failed")).toBeVisible();
  await expect(page.getByTestId("keypad-screen")).toHaveCount(0);
  await expect(page.getByTestId("auth-email-input")).toHaveCount(0);
  expect(api.count).toBe(0);
  expect(html.wakeCalls).toBe(0);
});

test("system gate (floor): a sleeping production turns a READY kiosk DORMANT; only a real touch wakes it, once, without a reload", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.clock.install({ time: new Date("2026-07-29T13:00:00.000Z") });

  const system = await routeSystemControl(page, { initial: "READY" });
  const token = floorDeviceToken("gate-dormant");
  await pairFloorDevice(page, token);
  const backend = await routeFloorBackend(page);

  // 1. Booted, READY, signed in, on the keypad.
  await page.goto("/");
  await expect(page.getByTestId("keypad-screen")).toBeVisible();
  await expect.poll(() => backend.rosterRequests).toBe(1);
  expect(system.wakeCalls).toBe(0);
  await page.evaluate(() => {
    (window as typeof window & { __sameDocument?: string }).__sameDocument =
      "booted";
  });

  // 2. Production goes to sleep: the API fails, the control plane says so.
  backend.roster = "bad_gateway";
  backend.me = "bad_gateway";
  system.setState("SLEEPING");

  // 3. Nobody touches the kiosk; its roster poll fires and fails.
  await page.clock.fastForward(ROSTER_REFRESH_MS + 1_000);
  await expect(page.getByTestId("system-gate-dormant")).toBeVisible();
  const rosterRequestsWhenDormant = backend.rosterRequests;
  expect(rosterRequestsWhenDormant).toBeGreaterThan(1);
  const statusCallsWhenDormant = system.statusCalls;

  // 4. Ten minutes of automatic life: focus, visibility and online events,
  //    untrusted (scripted) input, roster intervals and the DORMANT slow poll.
  for (let minute = 0; minute < 10; minute += 1) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });
    const before = system.statusCalls;
    await page.clock.fastForward(DORMANT_POLL_MS + 1_000);
    // Let the slow poll's GET land before moving time again.
    await expect.poll(() => system.statusCalls).toBeGreaterThan(before);
    expect(system.wakeCalls).toBe(0);
  }

  await expect(page.getByTestId("system-gate-dormant")).toBeVisible();
  expect(system.wakeCalls).toBe(0);
  // The slow poll kept checking (GET only) ...
  expect(system.statusCalls).toBeGreaterThanOrEqual(statusCallsWhenDormant + 10);
  // ... and react-query stayed offline: no roster request hit the sleeping
  // backend (or the proxy in front of it) for ten minutes.
  expect(backend.rosterRequests).toBe(rosterRequestsWhenDormant);

  // 5. The backend is back once woken; a person touches the kiosk.
  backend.roster = "ok";
  backend.me = "ok";
  await touchScreen(page);

  await expect.poll(() => system.wakeCalls).toBe(1);
  await expect(page.getByTestId("system-gate-starting")).toBeVisible();
  system.setState("READY");
  await page.clock.fastForward(2_000);

  await expect(page.getByTestId("system-gate-starting")).toHaveCount(0);
  await expect(page.getByTestId("system-gate-dormant")).toHaveCount(0);
  await expect(page.getByTestId("keypad-screen")).toBeVisible();
  // Same document (no reload), same paired device.
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __sameDocument?: string }).__sameDocument,
    ),
  ).toBe("booted");
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      FLOOR_TOKEN_STORAGE_KEY,
    ),
  ).toBe(token);
  // The paused roster query resumes against the woken backend.
  await expect
    .poll(() => backend.rosterRequests)
    .toBeGreaterThan(rosterRequestsWhenDormant);
  expect(system.wakeCalls).toBe(1);
});

test("system gate (floor): an automatic reload into a sleeping system shows DORMANT and never wakes it", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-07-29T13:00:00.000Z") });
  const system = await routeSystemControl(page, { initial: "SLEEPING" });
  await pairFloorDevice(page, floorDeviceToken("gate-auto-reload"));
  const backend = await routeFloorBackend(page);
  // What markAutomaticReload() leaves before the service-worker reload
  // (AUTOMATIC_RELOAD_STORAGE_KEY = "beyo:system:auto-reload", epoch ms).
  await page.addInitScript(() => {
    sessionStorage.setItem("beyo:system:auto-reload", String(Date.now()));
  });

  await page.goto("/");

  await expect(page.getByTestId("system-gate-dormant")).toBeVisible();
  for (let minute = 0; minute < 3; minute += 1) {
    const before = system.statusCalls;
    await page.clock.fastForward(DORMANT_POLL_MS + 1_000);
    await expect.poll(() => system.statusCalls).toBeGreaterThan(before);
  }
  await expect(page.getByTestId("system-gate-dormant")).toBeVisible();
  expect(system.wakeCalls).toBe(0);
  expect(backend.meRequests).toBe(0);
  await expect(page.getByTestId("keypad-screen")).toHaveCount(0);
  // The marker is consumed: a later manual reload counts as a person again.
  expect(
    await page.evaluate(() => sessionStorage.getItem("beyo:system:auto-reload")),
  ).toBeNull();

  // A person arrives: one touch wakes it and the kiosk boots.
  await touchScreen(page);
  await expect.poll(() => system.wakeCalls).toBe(1);
  system.setState("READY");
  await page.clock.fastForward(2_000);
  await expect(page.getByTestId("keypad-screen")).toBeVisible();
  expect(system.wakeCalls).toBe(1);
});
