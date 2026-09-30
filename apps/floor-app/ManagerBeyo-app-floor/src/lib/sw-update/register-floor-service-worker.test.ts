import { AUTOMATIC_RELOAD_STORAGE_KEY } from "@beyo/system-control";
import { afterEach, describe, expect, it, vi } from "vitest";

import { registerFloorServiceWorker } from "@/lib/sw-update/register-floor-service-worker";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("registerFloorServiceWorker", () => {
  it("marks its release reload as automatic, so a sleeping system is not woken by it", () => {
    vi.useFakeTimers();
    vi.stubEnv("PROD", true);
    const container = new EventTarget() as EventTarget & {
      controller: object | null;
      register: () => Promise<never>;
    };
    container.controller = {};
    container.register = () => new Promise<never>(() => {});
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: container,
    });
    // jsdom does not implement navigation; the reload itself is a no-op here.
    vi.spyOn(console, "error").mockImplementation(() => {});

    registerFloorServiceWorker();
    expect(sessionStorage.getItem(AUTOMATIC_RELOAD_STORAGE_KEY)).toBeNull();

    // A new release takes over an idle kiosk on its resting screen.
    container.dispatchEvent(new Event("controllerchange"));

    const marker = sessionStorage.getItem(AUTOMATIC_RELOAD_STORAGE_KEY);
    expect(marker).not.toBeNull();
    expect(Math.abs(Date.now() - Number(marker))).toBeLessThan(1_000);
  });
});
