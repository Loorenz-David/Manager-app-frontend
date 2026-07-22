import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeConsumerSlide } from "../test/fixtures";
import type { ConsumerPresentationSlide } from "../types";
import { usePresentationPlayback } from "./usePresentationPlayback";

function PlaybackHarness({
  slides,
  onEnd,
}: {
  slides: ConsumerPresentationSlide[];
  onEnd: () => void;
}) {
  const playback = usePresentationPlayback(slides, onEnd);
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <>
      <output data-testid="index">{playback.activeSlideIndex}</output>
      <output data-testid="time">{playback.slideTimeMs}</output>
      <output data-testid="fraction">{playback.activeFraction}</output>
      <button type="button" onClick={playback.next}>next</button>
      <div ref={playback.attachMediaContainer}>
        {slides[playback.activeSlideIndex]?.playback_mode === "media_driven"
          ? <video ref={videoRef} data-testid="video" />
          : null}
      </div>
    </>
  );
}

describe("presentation playback modes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("auto-advances timed slides using the runtime clock", () => {
    const onEnd = vi.fn();
    render(<PlaybackHarness slides={[makeConsumerSlide("timed", 200), makeConsumerSlide("timed", 200, 2)]} onEnd={onEnd} />);
    act(() => vi.advanceTimersByTime(260));
    expect(screen.getByTestId("index")).toHaveTextContent("1");
    expect(onEnd).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(240));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("waits for tap-next in manual mode", () => {
    const onEnd = vi.fn();
    render(<PlaybackHarness slides={[makeConsumerSlide("manual", 100), makeConsumerSlide("manual", 100, 2)]} onEnd={onEnd} />);
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByTestId("index")).toHaveTextContent("0");
    fireEvent.click(screen.getByRole("button", { name: "next" }));
    expect(screen.getByTestId("index")).toHaveTextContent("1");
  });

  it("uses video currentTime and ended for media-driven playback", () => {
    const onEnd = vi.fn();
    render(<PlaybackHarness slides={[makeConsumerSlide("media_driven", 5_000), makeConsumerSlide("manual", 1_000, 2)]} onEnd={onEnd} />);
    const video = screen.getByTestId("video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { configurable: true, value: 5 });
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 2.5 });
    fireEvent(video, new Event("timeupdate"));
    expect(screen.getByTestId("time")).toHaveTextContent("2500");
    expect(Number(screen.getByTestId("fraction").textContent)).toBeCloseTo(0.5);
    fireEvent(video, new Event("ended"));
    expect(screen.getByTestId("index")).toHaveTextContent("1");
  });
});

