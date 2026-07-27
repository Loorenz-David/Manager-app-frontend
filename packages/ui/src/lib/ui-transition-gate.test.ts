import { afterEach, describe, expect, it, vi } from "vitest";

import {
  beginUiTransition,
  isUiTransitioning,
  resetUiTransitionGate,
  runWhenUiSettled,
} from "./ui-transition-gate";

afterEach(() => {
  resetUiTransitionGate();
});

/** Lets every queued requestAnimationFrame callback run. */
async function flushFrames(): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  }
}

describe("ui transition gate", () => {
  it("runs queued work on the next frame when nothing is animating", async () => {
    const work = vi.fn();

    runWhenUiSettled(work);
    // Deferred by a frame so the current commit paints first.
    expect(work).not.toHaveBeenCalled();

    await flushFrames();
    expect(work).toHaveBeenCalledOnce();
  });

  it("holds work until the last transition releases", async () => {
    const work = vi.fn();
    const releaseSurface = beginUiTransition();
    const releaseRow = beginUiTransition();

    runWhenUiSettled(work);
    await flushFrames();
    expect(work).not.toHaveBeenCalled();

    // The surface finished closing, but the row is still animating out.
    releaseSurface();
    await flushFrames();
    expect(work).not.toHaveBeenCalled();
    expect(isUiTransitioning()).toBe(true);

    releaseRow();
    await flushFrames();
    expect(work).toHaveBeenCalledOnce();
    expect(isUiTransitioning()).toBe(false);
  });

  it("keeps queued work in order and runs each item once", async () => {
    const calls: string[] = [];
    const release = beginUiTransition();

    runWhenUiSettled(() => calls.push("first"));
    runWhenUiSettled(() => calls.push("second"));

    release();
    await flushFrames();
    expect(calls).toEqual(["first", "second"]);

    // A later flush must not replay the drained queue.
    await flushFrames();
    expect(calls).toEqual(["first", "second"]);
  });

  it("ignores a release that fires twice", async () => {
    const work = vi.fn();
    const releaseFirst = beginUiTransition();
    const releaseSecond = beginUiTransition();

    releaseFirst();
    releaseFirst();

    runWhenUiSettled(work);
    await flushFrames();
    // The second transition is still holding, despite the double release.
    expect(work).not.toHaveBeenCalled();

    releaseSecond();
    await flushFrames();
    expect(work).toHaveBeenCalledOnce();
  });
});
