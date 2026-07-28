import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  compositionMediaEndMs,
  compositionMediaTimeMs,
  isBeyondCompositionMediaEnd,
  VIDEO_SEEK_TOLERANCE_MS,
} from "./composition-video";
import type { CompositionElement, SlideMedia } from "./schemas";
import { SlideCompositionRenderer } from "./SlideCompositionRenderer";

const media: SlideMedia = {
  client_id: "aupm_clip",
  sequence_order: 1,
  media_type: "video",
  media_url: "https://example.com/clip.mp4",
  poster_url: null,
  fallback_url: null,
  alt_text: "Clip",
  mime_type: "video/mp4",
  width: 1080,
  height: 1920,
  duration_ms: 8_000,
  is_looping: false,
};

const videoElement = (overrides: Partial<CompositionElement> = {}): CompositionElement => ({
  client_id: "aupe_clip",
  element_type: "media",
  sequence_order: 0,
  layer_index: 0,
  start_ms: 0,
  end_ms: null,
  media,
  text_content: null,
  layout: { x: 0, y: 0, width: 1, height: 1, fit: "cover" },
  style: null,
  enter_animation: null,
  exit_animation: null,
  ...overrides,
});

const renderAt = (timeMs: number, isPlaying: boolean | undefined, element = videoElement()) =>
  render(
    <SlideCompositionRenderer
      elements={[element]}
      timeMs={timeMs}
      containerWidth={390}
      containerHeight={690}
      {...(isPlaying === undefined ? {} : { videoPlayback: { isPlaying } })}
    />,
  );

const video = () => document.querySelector("video") as HTMLVideoElement;

describe("composition media time", () => {
  it("maps slide time onto the clip's own timeline from the element's start", () => {
    expect(compositionMediaTimeMs(videoElement(), 0)).toBe(0);
    expect(compositionMediaTimeMs(videoElement(), 2_500)).toBe(2_500);
    // An element that enters at 1s is 1s into the slide when the clip is at 0.
    expect(compositionMediaTimeMs(videoElement({ start_ms: 1_000 }), 1_000)).toBe(0);
    expect(compositionMediaTimeMs(videoElement({ start_ms: 1_000 }), 3_000)).toBe(2_000);
    // Before the element opens, clamp rather than seek negative.
    expect(compositionMediaTimeMs(videoElement({ start_ms: 1_000 }), 0)).toBe(0);
  });

  it("has no out-point until trimming exists", () => {
    expect(compositionMediaEndMs(videoElement())).toBeNull();
    expect(isBeyondCompositionMediaEnd(videoElement(), 999_999)).toBe(false);
  });
});

describe("renderer-driven video playback", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      Object.defineProperty(this, "paused", { configurable: true, value: true });
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("leaves the clip alone when no playback state is supplied (thumbnails)", () => {
    renderAt(3_000, undefined);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(video().currentTime).toBe(0);
  });

  it("seeks to the scrubbed frame while paused", () => {
    const view = renderAt(0, false);
    view.rerender(
      <SlideCompositionRenderer
        elements={[videoElement()]}
        timeMs={3_000}
        containerWidth={390}
        containerHeight={690}
        videoPlayback={{ isPlaying: false }}
      />,
    );
    expect(video().currentTime).toBeCloseTo(3);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("plays and only corrects the clip once it drifts past the tolerance", () => {
    renderAt(0, true);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();

    const node = video();
    Object.defineProperty(node, "paused", { configurable: true, value: false });
    // Within tolerance: the clip keeps its own time rather than being re-seeked.
    node.currentTime = 1;
    render(
      <SlideCompositionRenderer
        elements={[videoElement()]}
        timeMs={1_000 + VIDEO_SEEK_TOLERANCE_MS / 2}
        containerWidth={390}
        containerHeight={690}
        videoPlayback={{ isPlaying: true }}
      />,
    );
    expect(node.currentTime).toBe(1);
  });

  it("starts a mid-slide clip at its own zero, not at the slide time", () => {
    renderAt(4_000, false, videoElement({ start_ms: 4_000 }));
    expect(video().currentTime).toBe(0);
  });
});
