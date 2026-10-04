import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { StrictMode, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSystemController } from "./controller";
import { resetAutomaticReloadMarkerForTests } from "./reload-marker";
import { getActiveSystemController, getSystemState, subscribeSystemState } from "./store";
import { startProgress, SystemGate } from "./SystemGate";
import {
  createFakeControlPlane,
  dispatchAvailable,
  dispatchUnavailable,
  installVisibility,
} from "./test/fake-control-plane";
import { useSystemState } from "./use-system-state";

let mounts = 0;
let unmounts = 0;

/** A child with local state: it must survive every later outage. */
function App(): React.JSX.Element {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    mounts += 1;
    return () => {
      unmounts += 1;
    };
  }, []);
  return (
    <input
      data-testid="app-input"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

function renderGate(plane: ReturnType<typeof createFakeControlPlane>, strict = false) {
  const controller = createSystemController({ fetch: plane.fetch });
  const tree = (
    <SystemGate controller={controller}>
      <App />
    </SystemGate>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return controller;
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  installVisibility("visible");
  resetAutomaticReloadMarkerForTests();
  sessionStorage.clear();
  mounts = 0;
  unmounts = 0;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  onlineManager.setOnline(true);
});

describe("<SystemGate>", () => {
  it("shows the boot screen instead of the children, then mounts them once on READY", async () => {
    const plane = createFakeControlPlane("ready");
    renderGate(plane);

    expect(screen.getByTestId("system-gate-boot")).toBeTruthy();
    expect(screen.queryByTestId("app-input")).toBeNull();
    expect(onlineManager.isOnline()).toBe(false);

    await advance(0);

    expect(screen.queryByTestId("system-gate-boot")).toBeNull();
    expect(screen.getByTestId("app-input")).toBeTruthy();
    expect(mounts).toBe(1);
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("SLEEPING: waking, one wake, starting with phase and ETA, then the children once", async () => {
    const plane = createFakeControlPlane("sleep", 8);
    renderGate(plane);

    await advance(0);
    expect(plane.wakeCalls()).toBe(1);
    expect(screen.getByTestId("system-gate-starting")).toBeTruthy();
    expect(screen.getByTestId("system-gate-phase").textContent).toBe("Starting the database");
    expect(screen.getByTestId("system-gate-eta").textContent).toBe("About 8 seconds left");
    expect(screen.queryByTestId("app-input")).toBeNull();
    expect(onlineManager.isOnline()).toBe(false);

    await advance(10_000);
    expect(screen.queryByTestId("system-gate-starting")).toBeNull();
    expect(screen.getByTestId("app-input")).toBeTruthy();
    expect(mounts).toBe(1);
    expect(plane.wakeCalls()).toBe(1);
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("STARTING shows a progress bar that follows the estimate and never goes back", async () => {
    const plane = createFakeControlPlane("sleep", 8);
    renderGate(plane);

    await advance(0);
    const bar = () => screen.getByTestId("system-gate-progress");
    expect(bar().getAttribute("role")).toBe("progressbar");
    const first = Number(bar().getAttribute("aria-valuenow"));
    expect(first).toBeGreaterThanOrEqual(4);
    expect(first).toBeLessThan(20);

    await advance(3_000);
    const second = Number(bar().getAttribute("aria-valuenow"));
    expect(second).toBeGreaterThan(first);
    await advance(3_000);
    const third = Number(bar().getAttribute("aria-valuenow"));
    expect(third).toBeGreaterThanOrEqual(second);
    expect(third).toBeLessThanOrEqual(97);

    await advance(10_000);
    expect(screen.queryByTestId("system-gate-progress")).toBeNull();
    expect(screen.getByTestId("app-input")).toBeTruthy();
  });

  it("startProgress: share of the first estimate, a fixed place per step without one, null when nothing is known", () => {
    expect(startProgress(100, 100, "SERVER")).toBe(0.04);
    expect(startProgress(50, 100, "APPLICATION")).toBe(0.5);
    expect(startProgress(0, 100, "HEALTH_CHECK")).toBe(0.97);
    expect(startProgress(150, 100, null)).toBe(0.04); // an estimate that grew
    expect(startProgress(null, null, "SERVER")).toBe(0.4);
    expect(startProgress(null, 100, "HEALTH_CHECK")).toBe(0.9);
    expect(startProgress(null, null, null)).toBeNull();
  });

  it("shows the waking screen while the wake is in flight", async () => {
    const plane = createFakeControlPlane("sleep");
    plane.override("POST", { kind: "hang" });
    renderGate(plane);

    await advance(0);
    expect(screen.getByTestId("system-gate-sleeping").textContent).toContain(
      "Waking ManagerBeyo",
    );
  });

  it("under StrictMode, one wake and the children mounted for good", async () => {
    const plane = createFakeControlPlane("sleep");
    renderGate(plane, true);

    await advance(10_000);
    expect(plane.wakeCalls()).toBe(1);
    expect(screen.getByTestId("app-input")).toBeTruthy();
    // StrictMode mounts effects twice in development; nothing unmounts later.
    const settledUnmounts = unmounts;
    dispatchUnavailable(true);
    await advance(0);
    dispatchAvailable();
    await advance(0);
    expect(unmounts).toBe(settledUnmounts);
  });

  it("FAILED: message, automatic retry, and 'Try again' that only re-polls", async () => {
    const plane = createFakeControlPlane("ready");
    plane.override("GET", { kind: "network" });
    renderGate(plane);
    await advance(0);

    const failed = screen.getByTestId("system-gate-failed");
    expect(failed.textContent).toContain("can't be reached");
    expect(failed.textContent).toContain("Retrying automatically");

    const before = plane.statusCalls();
    plane.override("GET", null);
    fireEvent.pointerDown(screen.getByTestId("system-gate-retry"));
    fireEvent.click(screen.getByTestId("system-gate-retry"));
    await advance(0);

    expect(plane.statusCalls()).toBe(before + 1);
    expect(plane.wakeCalls()).toBe(0);
    expect(screen.getByTestId("app-input")).toBeTruthy();
  });

  it("'Try again' shows that it was pressed and cannot be pressed twice in a row", async () => {
    const plane = createFakeControlPlane("ready");
    plane.override("GET", { kind: "network" });
    renderGate(plane);
    await advance(0);

    const button = () => screen.getByTestId("system-gate-retry") as HTMLButtonElement;
    expect(button().textContent).toBe("Try again");
    expect(button().disabled).toBe(false);

    const before = plane.statusCalls();
    fireEvent.click(button());
    await advance(0);
    expect(button().textContent).toBe("Checking…");
    expect(button().disabled).toBe(true);
    fireEvent.click(button()); // a disabled button takes no click
    await advance(0);
    expect(plane.statusCalls()).toBe(before + 1);

    await advance(1_500);
    expect(button().textContent).toBe("Try again");
    expect(button().disabled).toBe(false);
  });

  it("READY then API failing: a non-blocking reconnecting overlay over the same children", async () => {
    const plane = createFakeControlPlane("ready");
    renderGate(plane);
    await advance(0);
    fireEvent.change(screen.getByTestId("app-input"), { target: { value: "half-typed" } });

    dispatchUnavailable(true);
    await advance(0);

    expect(screen.getByTestId("system-gate-reconnecting")).toBeTruthy();
    expect((screen.getByTestId("app-input") as HTMLInputElement).value).toBe("half-typed");
    expect(onlineManager.isOnline()).toBe(false);

    await advance(3_000);
    dispatchAvailable();
    await advance(0);

    expect(screen.queryByTestId("system-gate-reconnecting")).toBeNull();
    expect((screen.getByTestId("app-input") as HTMLInputElement).value).toBe("half-typed");
    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("DORMANT overlay keeps the children; a trusted touch wakes once and the overlay goes", async () => {
    const plane = createFakeControlPlane("ready");
    renderGate(plane);
    await advance(0);
    plane.sleep();

    dispatchUnavailable(true);
    await advance(0);
    expect(screen.getByTestId("system-gate-dormant").textContent).toContain("Touch to continue");
    expect(screen.getByTestId("app-input")).toBeTruthy();

    // Synthetic (untrusted) events on the overlay do nothing.
    fireEvent.pointerDown(screen.getByTestId("system-gate-dormant"));
    fireEvent.keyDown(window, { key: "Enter" });
    await advance(0);
    expect(plane.wakeCalls()).toBe(0);

    act(() => getActiveSystemController()!.handleInputEvent({ isTrusted: true }));
    await advance(0);
    expect(plane.wakeCalls()).toBe(1);
    expect(screen.getByTestId("system-gate-starting")).toBeTruthy();
    expect(onlineManager.isOnline()).toBe(false);

    await advance(10_000);
    expect(screen.queryByTestId("system-gate-starting")).toBeNull();
    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);
    expect(onlineManager.isOnline()).toBe(true);
  });

  it("the browser 'online' event cannot put react-query online while the gate is not READY", async () => {
    const plane = createFakeControlPlane("failed");
    renderGate(plane);
    await advance(0);

    window.dispatchEvent(new Event("online"));
    expect(onlineManager.isOnline()).toBe(false);
  });

  it("publishes the state to useSystemState and to non-React subscribers", async () => {
    const plane = createFakeControlPlane("sleep");
    const states: string[] = [];
    const unsubscribe = subscribeSystemState((snapshot) => states.push(snapshot.state));
    const hook = renderHook(() => useSystemState());
    renderGate(plane);

    await advance(10_000);

    expect(hook.result.current).toMatchObject({ state: "READY", hasBeenReady: true, online: true });
    expect(getSystemState().state).toBe("READY");
    expect(states[0]).toBe("BOOT");
    expect(states).toContain("STARTING");
    expect(states.at(-1)).toBe("READY");
    unsubscribe();

    cleanup();
    expect(getSystemState().state).toBe("BOOT");
    expect(onlineManager.isOnline()).toBe(true);
  });
});
