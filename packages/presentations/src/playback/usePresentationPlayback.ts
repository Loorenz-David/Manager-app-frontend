import { usePlaybackClock } from "@beyo/presentation-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ConsumerPresentationSlide } from "../types";

/**
 * The deck loops until the user quits, so every slide has to advance on its own —
 * authored `manual` slides and slides without a duration fall back to this.
 */
export const DEFAULT_SLIDE_DURATION_MS = 4_000;

const slideDuration = (slide: ConsumerPresentationSlide | undefined): number => {
  const authored = slide?.duration_ms ?? 0;
  return authored > 0 ? authored : DEFAULT_SLIDE_DURATION_MS;
};

const mediaDuration = (slide: ConsumerPresentationSlide | undefined): number => {
  const elementDuration = slide?.elements.find(
    (element) => element.element_type === "media" && element.media?.media_type === "video",
  )?.media?.duration_ms;
  return elementDuration !== undefined && elementDuration !== null && elementDuration > 0
    ? elementDuration
    : slideDuration(slide);
};

/** `seq` increments on every playhead move so a one-slide deck still re-arms its clock. */
type Playhead = { index: number; loop: number; seq: number };

export type PresentationPlayback = {
  activeSlideIndex: number;
  /** Completed passes over the whole deck. `> 0` unlocks the exit affordances. */
  loopCount: number;
  slideTimeMs: number;
  activeFraction: number;
  isPlaying: boolean;
  isPaused: boolean;
  previous: () => void;
  next: () => void;
  togglePause: () => void;
  attachMediaContainer: (node: HTMLDivElement | null) => void;
};

export function usePresentationPlayback(
  slides: readonly ConsumerPresentationSlide[],
  onFirstLoopComplete: () => void,
): PresentationPlayback {
  const [playhead, setPlayhead] = useState<Playhead>({ index: 0, loop: 0, seq: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [mediaElement, setMediaElement] = useState<HTMLVideoElement | null>(null);
  const [mediaTimeMs, setMediaTimeMs] = useState(0);
  const [mediaDurationMs, setMediaDurationMs] = useState(0);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const slide = slides[playhead.index];
  const durationMs = slideDuration(slide);
  const isMediaDriven = (slide?.playback_mode ?? "manual") === "media_driven";
  const firstLoopCallbackRef = useRef(onFirstLoopComplete);
  const firstLoopReportedRef = useRef(false);
  const advanceGuardRef = useRef(false);
  const clockResetPendingSeqRef = useRef<number | null>(null);
  firstLoopCallbackRef.current = onFirstLoopComplete;

  const clock = usePlaybackClock({ durationMs, loop: false });
  const { timeMs, isPlaying, play, pause, seek } = clock;

  /** The last slide wraps back to the first and counts a loop — the deck never ends by itself. */
  const advance = useCallback(() => {
    if (advanceGuardRef.current || slides.length === 0) return;
    advanceGuardRef.current = true;
    setPlayhead(({ index, loop, seq }) => index >= slides.length - 1
      ? { index: 0, loop: loop + 1, seq: seq + 1 }
      : { index: index + 1, loop, seq: seq + 1 });
  }, [slides.length]);

  /** Story convention: on the first slide, back restarts it rather than leaving the deck. */
  const previous = useCallback(() => {
    if (slides.length === 0) return;
    advanceGuardRef.current = true;
    setPlayhead(({ index, loop, seq }) => ({
      index: Math.max(0, index - 1),
      loop,
      seq: seq + 1,
    }));
  }, [slides.length]);

  const togglePause = useCallback(() => setIsPaused((paused) => !paused), []);

  useEffect(() => {
    advanceGuardRef.current = false;
    clockResetPendingSeqRef.current = playhead.seq;
    seek(0);
    setMediaTimeMs(0);
    setMediaDurationMs(mediaDuration(slides[playhead.index]));
    setMediaPlaying(isMediaDriven);
  }, [isMediaDriven, playhead.index, playhead.seq, seek, slides]);

  useEffect(() => {
    if (playhead.loop === 0 || firstLoopReportedRef.current) return;
    firstLoopReportedRef.current = true;
    firstLoopCallbackRef.current();
  }, [playhead.loop]);

  useEffect(() => {
    if (isMediaDriven || isPaused) pause();
    else play();
  }, [isMediaDriven, isPaused, pause, play, playhead.seq]);

  useEffect(() => {
    if (clockResetPendingSeqRef.current === playhead.seq && timeMs === 0) {
      clockResetPendingSeqRef.current = null;
    }
    if (isMediaDriven || isPaused) return;
    if (
      durationMs > 0
      && clockResetPendingSeqRef.current === null
      && timeMs >= durationMs
    ) advance();
  }, [advance, durationMs, isMediaDriven, isPaused, playhead.seq, timeMs]);

  useEffect(() => {
    if (!isMediaDriven || mediaElement === null) return undefined;
    const updateTime = () => {
      setMediaTimeMs(Math.max(0, mediaElement.currentTime * 1_000));
      if (Number.isFinite(mediaElement.duration) && mediaElement.duration > 0) {
        setMediaDurationMs(mediaElement.duration * 1_000);
      }
    };
    const handleEnded = () => {
      updateTime();
      setMediaPlaying(false);
      advance();
    };
    mediaElement.addEventListener("loadedmetadata", updateTime);
    mediaElement.addEventListener("timeupdate", updateTime);
    mediaElement.addEventListener("ended", handleEnded);
    return () => {
      mediaElement.removeEventListener("loadedmetadata", updateTime);
      mediaElement.removeEventListener("timeupdate", updateTime);
      mediaElement.removeEventListener("ended", handleEnded);
    };
  }, [advance, isMediaDriven, mediaElement]);

  /**
   * Only media-driven slides need the hook to touch the video: there the video is the
   * clock. Clock-driven slides are seeked and played by the renderer (`videoPlayback`),
   * which also lands them on the right frame when the element starts mid-slide.
   */
  useEffect(() => {
    if (!isMediaDriven || mediaElement === null) return undefined;
    if (isPaused) {
      mediaElement.pause();
      setMediaPlaying(false);
      return undefined;
    }
    try {
      const result = mediaElement.play();
      void result?.catch(() => undefined);
    } catch {
      // Autoplay policy may reject; the tap zones remain a manual fallback.
    }
    setMediaPlaying(true);
    return () => mediaElement.pause();
  }, [isMediaDriven, isPaused, mediaElement]);

  const attachMediaContainer = useCallback((node: HTMLDivElement | null) => {
    setMediaElement(node?.querySelector("video") ?? null);
  }, [playhead.seq]);

  const slideTimeMs = isMediaDriven ? mediaTimeMs : timeMs;
  const fractionDuration = isMediaDriven ? mediaDurationMs : durationMs;
  const activeFraction = useMemo(
    () => fractionDuration <= 0 ? 0 : Math.min(1, Math.max(0, slideTimeMs / fractionDuration)),
    [fractionDuration, slideTimeMs],
  );

  return {
    activeSlideIndex: playhead.index,
    loopCount: playhead.loop,
    slideTimeMs,
    activeFraction,
    isPlaying: isPaused ? false : isMediaDriven ? mediaPlaying : isPlaying,
    isPaused,
    previous,
    next: advance,
    togglePause,
    attachMediaContainer,
  };
}
