import { describe, expect, it, vi } from "vitest";

import {
  SAFE_RELOAD_INPUT_IDLE_MS,
  createSwReloadController,
  isSafeToReload,
  trackTrustedInput,
  type SafeReloadSnapshot,
} from "@/lib/sw-update/safe-reload";

const NOW = 1_000_000_000;

function snapshot(overrides: Partial<SafeReloadSnapshot> = {}): SafeReloadSnapshot {
  return {
    now: NOW,
    lastTrustedInputAt: null,
    pathname: "/",
    openSurfaceCount: 0,
    ...overrides,
  };
}

describe("isSafeToReload", () => {
  it("is safe on the idle home screen with no input since load", () => {
    expect(isSafeToReload(snapshot())).toBe(true);
  });

  it("is safe once the last trusted input is at least the idle threshold old", () => {
    expect(
      isSafeToReload(
        snapshot({ lastTrustedInputAt: NOW - SAFE_RELOAD_INPUT_IDLE_MS }),
      ),
    ).toBe(true);
  });

  it("is not safe within the idle threshold of the last trusted input", () => {
    expect(
      isSafeToReload(
        snapshot({ lastTrustedInputAt: NOW - SAFE_RELOAD_INPUT_IDLE_MS + 1 }),
      ),
    ).toBe(false);
  });

  it("is not safe while any kiosk surface (confirm, result, settings) is open", () => {
    expect(isSafeToReload(snapshot({ openSurfaceCount: 1 }))).toBe(false);
  });

  it("is safe on the idle device sign-in screen", () => {
    expect(isSafeToReload(snapshot({ pathname: "/sign-in" }))).toBe(true);
  });

  it("is not safe off the resting screens", () => {
    expect(isSafeToReload(snapshot({ pathname: "/somewhere-else" }))).toBe(false);
  });
});

describe("createSwReloadController", () => {
  it("does not reload on the first claim of a page that booted uncontrolled", () => {
    const reload = vi.fn();
    const controller = createSwReloadController({
      hadControllerAtStart: false,
      isSafe: () => true,
      reload,
    });

    controller.onControllerChange();
    controller.tick();

    expect(reload).not.toHaveBeenCalled();
    expect(controller.isReloadPending()).toBe(false);
  });

  it("reloads immediately on a release change when the kiosk is idle", () => {
    const reload = vi.fn();
    const controller = createSwReloadController({
      hadControllerAtStart: true,
      isSafe: () => true,
      reload,
    });

    controller.onControllerChange();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("waits for a safe moment, then reloads exactly once", () => {
    const reload = vi.fn();
    let safe = false;
    const controller = createSwReloadController({
      hadControllerAtStart: true,
      isSafe: () => safe,
      reload,
    });

    controller.onControllerChange();
    controller.tick();
    expect(reload).not.toHaveBeenCalled();
    expect(controller.isReloadPending()).toBe(true);

    safe = true;
    controller.tick();
    controller.tick();
    controller.onControllerChange();
    controller.tick();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads after a first-install claim is followed by a real release change", () => {
    const reload = vi.fn();
    const controller = createSwReloadController({
      hadControllerAtStart: false,
      isSafe: () => true,
      reload,
    });

    controller.onControllerChange();
    controller.onControllerChange();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("never evaluates safety while no reload is pending", () => {
    const isSafe = vi.fn(() => true);
    const controller = createSwReloadController({
      hadControllerAtStart: true,
      isSafe,
      reload: vi.fn(),
    });

    controller.tick();

    expect(isSafe).not.toHaveBeenCalled();
  });
});

describe("trackTrustedInput", () => {
  it("ignores synthetic (untrusted) events", () => {
    const target = new EventTarget();
    const tracker = trackTrustedInput(target, () => NOW);

    target.dispatchEvent(new Event("pointerdown"));
    target.dispatchEvent(new Event("keydown"));

    expect(tracker.lastInputAt()).toBeNull();
    tracker.stop();
  });

  it("records trusted pointer, key and touch input", () => {
    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.set(type, listener as EventListener);
      },
      removeEventListener: vi.fn(),
    };
    let clock = NOW;
    const tracker = trackTrustedInput(target, () => clock);

    expect([...listeners.keys()].sort()).toEqual(["keydown", "pointerdown", "touchstart"]);

    for (const type of ["pointerdown", "keydown", "touchstart"]) {
      clock += 1;
      listeners.get(type)?.({ isTrusted: true } as Event);
      expect(tracker.lastInputAt()).toBe(clock);
    }

    tracker.stop();
    expect(target.removeEventListener).toHaveBeenCalledTimes(3);
  });
});
