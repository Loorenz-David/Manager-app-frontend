import { usePlaybackClock } from "@beyo/presentation-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ConsumerPresentationSlide } from "../types";

const slideDuration = (slide: ConsumerPresentationSlide | undefined): number =>
  Math.max(0, slide?.duration_ms ?? 4_000);

const mediaDuration = (slide: ConsumerPresentationSlide | undefined): number => {
  const elementDuration = slide?.elements.find(
    (element) => element.element_type === "media" && element.media?.media_type === "video",
  )?.media?.duration_ms;
  return Math.max(0, elementDuration ?? slideDuration(slide));
};

export type PresentationPlayback = {
  activeSlideIndex: number;
  slideTimeMs: number;
  activeFraction: number;
  isPlaying: boolean;
  previous: () => void;
  next: () => void;
  attachMediaContainer: (node: HTMLDivElement | null) => void;
};

export function usePresentationPlayback(
  slides: readonly ConsumerPresentationSlide[],
  onReachedEnd: () => void,
): PresentationPlayback {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [mediaElement, setMediaElement] = useState<HTMLVideoElement | null>(null);
  const [mediaTimeMs, setMediaTimeMs] = useState(0);
  const [mediaDurationMs, setMediaDurationMs] = useState(0);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const slide = slides[activeSlideIndex];
  const durationMs = slideDuration(slide);
  const mode = slide?.playback_mode ?? "manual";
  const endCallbackRef = useRef(onReachedEnd);
  const endedForSlideRef = useRef(false);
  const clockResetPendingRef = useRef<number | null>(null);
  endCallbackRef.current = onReachedEnd;

  const clock = usePlaybackClock({ durationMs, loop: false });
  const { timeMs, isPlaying, play, pause, seek } = clock;

  const finishOrAdvance = useCallback(() => {
    if (endedForSlideRef.current) return;
    if (activeSlideIndex >= slides.length - 1) {
      endedForSlideRef.current = true;
      endCallbackRef.current();
      return;
    }
    setActiveSlideIndex((index) => index + 1);
  }, [activeSlideIndex, slides.length]);

  const previous = useCallback(() => {
    setActiveSlideIndex((index) => Math.max(0, index - 1));
  }, []);

  const next = useCallback(() => {
    finishOrAdvance();
  }, [finishOrAdvance]);

  useEffect(() => {
    endedForSlideRef.current = false;
    clockResetPendingRef.current = activeSlideIndex;
    seek(0);
    setMediaTimeMs(0);
    setMediaDurationMs(mediaDuration(slides[activeSlideIndex]));
    setMediaPlaying(mode === "media_driven");
    if (mode === "timed") play();
    else pause();
  }, [activeSlideIndex, mode, pause, play, seek, slides]);

  useEffect(() => {
    if (clockResetPendingRef.current === activeSlideIndex && timeMs === 0) {
      clockResetPendingRef.current = null;
    }
    if (
      mode === "timed"
      && durationMs > 0
      && clockResetPendingRef.current === null
      && timeMs >= durationMs
    ) finishOrAdvance();
  }, [activeSlideIndex, durationMs, finishOrAdvance, mode, timeMs]);

  useEffect(() => {
    if (mode !== "media_driven" || mediaElement === null) return;
    const updateTime = () => {
      setMediaTimeMs(Math.max(0, mediaElement.currentTime * 1_000));
      if (Number.isFinite(mediaElement.duration) && mediaElement.duration > 0) {
        setMediaDurationMs(mediaElement.duration * 1_000);
      }
    };
    const handleEnded = () => {
      updateTime();
      setMediaPlaying(false);
      finishOrAdvance();
    };
    mediaElement.addEventListener("loadedmetadata", updateTime);
    mediaElement.addEventListener("timeupdate", updateTime);
    mediaElement.addEventListener("ended", handleEnded);
    try {
      const result = mediaElement.play();
      void result?.catch(() => undefined);
    } catch {
      // Autoplay policy may reject; the tap zones remain a manual fallback.
    }
    return () => {
      mediaElement.removeEventListener("loadedmetadata", updateTime);
      mediaElement.removeEventListener("timeupdate", updateTime);
      mediaElement.removeEventListener("ended", handleEnded);
      mediaElement.pause();
    };
  }, [finishOrAdvance, mediaElement, mode]);

  useEffect(() => {
    if (mode !== "timed" || mediaElement === null) return;
    try {
      const result = mediaElement.play();
      void result?.catch(() => undefined);
    } catch {
      // The timed slide clock remains authoritative if autoplay is unavailable.
    }
    return () => mediaElement.pause();
  }, [mediaElement, mode]);

  const attachMediaContainer = useCallback((node: HTMLDivElement | null) => {
    setMediaElement(node?.querySelector("video") ?? null);
  }, [activeSlideIndex]);

  const slideTimeMs = mode === "media_driven" ? mediaTimeMs : timeMs;
  const fractionDuration = mode === "media_driven" ? mediaDurationMs : durationMs;
  const activeFraction = useMemo(
    () => fractionDuration <= 0 ? 0 : Math.min(1, Math.max(0, slideTimeMs / fractionDuration)),
    [fractionDuration, slideTimeMs],
  );

  return {
    activeSlideIndex,
    slideTimeMs,
    activeFraction,
    isPlaying: mode === "media_driven" ? mediaPlaying : isPlaying,
    previous,
    next,
    attachMediaContainer,
  };
}
