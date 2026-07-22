import { describe, expect, it } from "vitest";

import {
  advancePreviewPlayback,
  previewTotalProgress,
  type PreviewPlaybackState,
} from "./use-presentation-preview-playback";

describe("presentation preview playback", () => {
  const playing: PreviewPlaybackState = {
    activeSlideIndex: 0,
    slideTimeMs: 0,
    isPlaying: true,
  };

  it("advances through slide boundaries at each slide duration", () => {
    expect(advancePreviewPlayback(playing, 1_250, [1_000, 2_000])).toEqual({
      activeSlideIndex: 1,
      slideTimeMs: 250,
      isPlaying: true,
    });
  });

  it("stops on the final frame instead of looping", () => {
    expect(advancePreviewPlayback(playing, 4_000, [1_000, 2_000])).toEqual({
      activeSlideIndex: 1,
      slideTimeMs: 2_000,
      isPlaying: false,
    });
  });

  it("reports total-deck progress rather than per-slide progress", () => {
    expect(previewTotalProgress({ activeSlideIndex: 1, slideTimeMs: 500 }, [1_000, 2_000]))
      .toBe(0.5);
  });
});
