import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  readSurfaceDepth,
  useSurfaceStore,
  type SurfaceRegistration,
} from "./SurfaceProvider";

const fakeComponent = (() => null) as unknown as SurfaceRegistration["component"];

function registration(surface: SurfaceRegistration["surface"]): SurfaceRegistration {
  return { surface, component: fakeComponent };
}

let pushSpy: ReturnType<typeof vi.spyOn>;
let goSpy: ReturnType<typeof vi.spyOn>;

function lastPushedDepth(): number {
  const lastCall = pushSpy.mock.calls.at(-1);
  return readSurfaceDepth(lastCall?.[0]);
}

beforeEach(() => {
  useSurfaceStore.setState({
    stack: [],
    navigate: undefined,
    registry: {
      a: registration("slide"),
      b: registration("sheet"),
      c: registration("modal"),
    },
  });
  pushSpy = vi.spyOn(window.history, "pushState");
  goSpy = vi.spyOn(window.history, "go").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("surface stack ↔ history sync", () => {
  it("pushes one history entry per opened overlay, recording its depth", () => {
    const store = useSurfaceStore.getState();

    store.open("a");
    expect(useSurfaceStore.getState().stack).toHaveLength(1);
    expect(lastPushedDepth()).toBe(1);

    store.open("b");
    expect(useSurfaceStore.getState().stack).toHaveLength(2);
    expect(lastPushedDepth()).toBe(2);

    expect(pushSpy).toHaveBeenCalledTimes(2);
  });

  it("does not push a second entry when re-opening an already-open overlay", () => {
    const store = useSurfaceStore.getState();
    store.open("a");
    store.open("b");
    pushSpy.mockClear();

    store.open("a"); // re-surface to top

    expect(pushSpy).not.toHaveBeenCalled();
    expect(useSurfaceStore.getState().stack.map((s) => s.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("pops one history entry when a surface is closed programmatically", () => {
    const store = useSurfaceStore.getState();
    store.open("a");
    store.open("b");
    goSpy.mockClear();

    store.close("b");

    expect(useSurfaceStore.getState().stack.map((s) => s.id)).toEqual(["a"]);
    expect(goSpy).toHaveBeenCalledWith(-1);
  });

  it("pops the exact number of entries for closeAll / closeMany", () => {
    const store = useSurfaceStore.getState();
    store.open("a");
    store.open("b");
    store.open("c");
    goSpy.mockClear();

    store.closeAll();

    expect(useSurfaceStore.getState().stack).toHaveLength(0);
    expect(goSpy).toHaveBeenCalledWith(-3);
  });

  it("closeTop pops one entry", () => {
    const store = useSurfaceStore.getState();
    store.open("a");
    store.open("b");
    goSpy.mockClear();

    store.closeTop();

    expect(useSurfaceStore.getState().stack.map((s) => s.id)).toEqual(["a"]);
    expect(goSpy).toHaveBeenCalledWith(-1);
  });

  it("syncToDepth trims the stack to the recorded depth without touching history", () => {
    const store = useSurfaceStore.getState();
    store.open("a");
    store.open("b");
    store.open("c");
    goSpy.mockClear();

    // Simulates the popstate handler after a single Back press (depth 3 -> 2).
    store.syncToDepth(2);

    expect(useSurfaceStore.getState().stack.map((s) => s.id)).toEqual([
      "a",
      "b",
    ]);
    expect(goSpy).not.toHaveBeenCalled();
  });

  it("syncToDepth is a no-op when the stack is already at or below the depth", () => {
    const store = useSurfaceStore.getState();
    store.open("a");
    const before = useSurfaceStore.getState().stack;

    store.syncToDepth(5);

    expect(useSurfaceStore.getState().stack).toBe(before);
  });

  it("readSurfaceDepth defaults to 0 for non-surface / router history state", () => {
    expect(readSurfaceDepth(null)).toBe(0);
    expect(readSurfaceDepth({ idx: 4, key: "abc" })).toBe(0);
    expect(readSurfaceDepth({ __surfaceDepth: 3 })).toBe(3);
  });
});
