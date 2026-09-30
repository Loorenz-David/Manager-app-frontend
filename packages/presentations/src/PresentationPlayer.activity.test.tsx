import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PresentationPlayer } from "./PresentationPlayer";
import { consumerPresentationFixture, makeConsumerSlide } from "./test/fixtures";

// X-Beyo-Activity: records the deck makes by itself (auto-advance) are marked
// background; records a tap caused are left to the API client's classifier.

const originalRaf = globalThis.requestAnimationFrame;
const originalCaf = globalThis.cancelAnimationFrame;

function renderPlayer(durationMs: number) {
  const onProgress = vi.fn();
  const onComplete = vi.fn();
  render(
    <PresentationPlayer
      presentation={{
        ...consumerPresentationFixture,
        slides: [
          makeConsumerSlide("timed", durationMs, 1),
          makeConsumerSlide("timed", durationMs, 2),
        ],
      }}
      navigate={vi.fn()}
      onProgress={onProgress}
      onDismiss={vi.fn()}
      onComplete={onComplete}
      onClose={vi.fn()}
      onMediaExpired={async () => null}
    />,
  );
  return { onProgress, onComplete };
}

describe("PresentationPlayer view-state activity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16)) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((id: number) => window.clearTimeout(id)) as typeof cancelAnimationFrame;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(690);
  });

  // Unmount while the rAF stubs are still installed (the clock has a frame in flight).
  afterEach(() => {
    cleanup();
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCaf;
  });

  it("reports auto-advance progress and the auto-completed first loop as background", () => {
    const { onProgress, onComplete } = renderPlayer(200);

    act(() => vi.advanceTimersByTime(260));
    expect(onProgress).toHaveBeenCalledWith(1, "background");

    act(() => vi.advanceTimersByTime(240));
    expect(onComplete).toHaveBeenCalledWith(1, "background");
  });

  it("leaves tap-driven progress and completion to the classifier", () => {
    const { onProgress, onComplete } = renderPlayer(60_000);

    fireEvent.click(screen.getByTestId("presentation-player-tap-next"));
    expect(onProgress).toHaveBeenCalledWith(1, undefined);

    fireEvent.click(screen.getByTestId("presentation-player-tap-next"));
    expect(onComplete).toHaveBeenCalledWith(1, undefined);
  });
});
