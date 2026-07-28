import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeConsumerSlide } from "../test/fixtures";
import type { ConsumerPresentationSlide } from "../types";
import { usePresentationPlayback } from "./usePresentationPlayback";

function PlaybackHarness({
  slides,
  onFirstLoop,
}: {
  slides: ConsumerPresentationSlide[];
  onFirstLoop: () => void;
}) {
  const playback = usePresentationPlayback(slides, onFirstLoop);
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <>
      <output data-testid="index">{playback.activeSlideIndex}</output>
      <output data-testid="loop">{playback.loopCount}</output>
      <output data-testid="time">{playback.slideTimeMs}</output>
      <output data-testid="fraction">{playback.activeFraction}</output>
      <output data-testid="paused">{String(playback.isPaused)}</output>
      <button type="button" onClick={playback.next}>next</button>
      <button type="button" onClick={playback.previous}>previous</button>
      <button type="button" onClick={playback.togglePause}>toggle</button>
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

  // The looping clock always has a frame in flight; unmount while the rAF stubs are still
  // installed, or the runtime cancels a fake-timer id through the real cancelAnimationFrame.
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("auto-advances timed slides using the runtime clock", () => {
    const onFirstLoop = vi.fn();
    render(<PlaybackHarness slides={[makeConsumerSlide("timed", 200), makeConsumerSlide("timed", 200, 2)]} onFirstLoop={onFirstLoop} />);
    act(() => vi.advanceTimersByTime(260));
    expect(screen.getByTestId("index")).toHaveTextContent("1");
    expect(onFirstLoop).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(240));
    expect(onFirstLoop).toHaveBeenCalledTimes(1);
  });

  it("loops back to the first slide instead of ending, reporting the first loop once", () => {
    const onFirstLoop = vi.fn();
    // Stepped rather than one jump: a single large advance batches the frames into one commit.
    const runFor = (totalMs: number) => {
      for (let elapsed = 0; elapsed < totalMs; elapsed += 50) act(() => vi.advanceTimersByTime(50));
    };
    render(<PlaybackHarness slides={[makeConsumerSlide("timed", 200), makeConsumerSlide("timed", 200, 2)]} onFirstLoop={onFirstLoop} />);
    runFor(500);
    expect(screen.getByTestId("index")).toHaveTextContent("0");
    expect(screen.getByTestId("loop")).toHaveTextContent("1");
    runFor(500);
    expect(screen.getByTestId("loop")).toHaveTextContent("2");
    expect(onFirstLoop).toHaveBeenCalledTimes(1);
  });

  it("auto-advances authored manual slides so the deck can loop", () => {
    const onFirstLoop = vi.fn();
    render(<PlaybackHarness slides={[makeConsumerSlide("manual", 200), makeConsumerSlide("manual", 200, 2)]} onFirstLoop={onFirstLoop} />);
    act(() => vi.advanceTimersByTime(260));
    expect(screen.getByTestId("index")).toHaveTextContent("1");
  });

  it("wraps a single-slide deck without stalling the clock", () => {
    const onFirstLoop = vi.fn();
    render(<PlaybackHarness slides={[makeConsumerSlide("timed", 200)]} onFirstLoop={onFirstLoop} />);
    act(() => vi.advanceTimersByTime(260));
    expect(screen.getByTestId("loop")).toHaveTextContent("1");
    act(() => vi.advanceTimersByTime(260));
    expect(screen.getByTestId("loop")).toHaveTextContent("2");
  });

  it("holds the timer on the centre tap and resumes on the next one", () => {
    const onFirstLoop = vi.fn();
    render(<PlaybackHarness slides={[makeConsumerSlide("timed", 400), makeConsumerSlide("timed", 400, 2)]} onFirstLoop={onFirstLoop} />);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("paused")).toHaveTextContent("true");
    const heldAt = screen.getByTestId("time").textContent;
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByTestId("time")).toHaveTextContent(heldAt!);
    expect(screen.getByTestId("index")).toHaveTextContent("0");
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByTestId("index")).toHaveTextContent("1");
  });

  it("restarts the current slide when tapping back on the first one", () => {
    const onFirstLoop = vi.fn();
    render(<PlaybackHarness slides={[makeConsumerSlide("timed", 400), makeConsumerSlide("timed", 400, 2)]} onFirstLoop={onFirstLoop} />);
    act(() => vi.advanceTimersByTime(200));
    expect(Number(screen.getByTestId("time").textContent)).toBeGreaterThan(0);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "previous" }));
    });
    expect(screen.getByTestId("index")).toHaveTextContent("0");
    expect(screen.getByTestId("time")).toHaveTextContent("0");
  });

  it("uses video currentTime and ended for media-driven playback", () => {
    const onFirstLoop = vi.fn();
    render(<PlaybackHarness slides={[makeConsumerSlide("media_driven", 5_000), makeConsumerSlide("manual", 1_000, 2)]} onFirstLoop={onFirstLoop} />);
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
