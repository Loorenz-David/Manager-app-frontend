import { advancePlaybackTime } from "@beyo/presentation-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type PreviewPlaybackState = {
  activeSlideIndex: number;
  slideTimeMs: number;
  isPlaying: boolean;
};

const durationAt = (durations: readonly number[], index: number): number =>
  Math.max(0, durations[index] ?? 0);

export function advancePreviewPlayback(
  state: PreviewPlaybackState,
  deltaMs: number,
  durations: readonly number[],
): PreviewPlaybackState {
  if (!state.isPlaying || durations.length === 0) return state;
  let activeSlideIndex = Math.min(state.activeSlideIndex, durations.length - 1);
  let slideTimeMs = state.slideTimeMs;
  let remaining = Math.max(0, deltaMs);

  while (remaining > 0) {
    const durationMs = durationAt(durations, activeSlideIndex);
    const chunk = Math.min(100, remaining);
    const advanced = advancePlaybackTime(slideTimeMs, chunk, durationMs, false);
    slideTimeMs = advanced.timeMs;
    remaining -= chunk;
    if (!advanced.completed) continue;
    if (activeSlideIndex >= durations.length - 1) {
      return { activeSlideIndex, slideTimeMs: durationMs, isPlaying: false };
    }
    activeSlideIndex += 1;
    slideTimeMs = 0;
  }

  return { activeSlideIndex, slideTimeMs, isPlaying: true };
}

export function previewTotalProgress(
  state: Pick<PreviewPlaybackState, "activeSlideIndex" | "slideTimeMs">,
  durations: readonly number[],
): number {
  const total = durations.reduce((sum, duration) => sum + Math.max(0, duration), 0);
  if (total <= 0) return durations.length === 0 ? 0 : 1;
  const elapsedBefore = durations
    .slice(0, state.activeSlideIndex)
    .reduce((sum, duration) => sum + Math.max(0, duration), 0);
  return Math.min(1, Math.max(0, (elapsedBefore + state.slideTimeMs) / total));
}

export function usePresentationPreviewPlayback(
  durations: readonly number[],
  autoPlay = true,
) {
  const [state, setState] = useState<PreviewPlaybackState>(() => ({
    activeSlideIndex: 0,
    slideTimeMs: 0,
    isPlaying: autoPlay && durations.length > 0,
  }));
  const stateRef = useRef(state);
  const frameRef = useRef<number | null>(null);
  const previousTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setState({
      activeSlideIndex: 0,
      slideTimeMs: 0,
      isPlaying: autoPlay && durations.length > 0,
    });
  }, [autoPlay, durations]);

  useEffect(() => {
    if (!state.isPlaying) {
      previousTimestampRef.current = null;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      return;
    }
    const tick = (timestamp: number) => {
      const previous = previousTimestampRef.current;
      previousTimestampRef.current = timestamp;
      if (previous !== null) {
        setState((current) => advancePreviewPlayback(current, timestamp - previous, durations));
      }
      if (stateRef.current.isPlaying) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      previousTimestampRef.current = null;
    };
  }, [durations, state.isPlaying]);

  const play = useCallback(() => {
    setState((current) => {
      const lastIndex = Math.max(0, durations.length - 1);
      const atEnd = current.activeSlideIndex === lastIndex
        && current.slideTimeMs >= durationAt(durations, lastIndex);
      return atEnd
        ? { activeSlideIndex: 0, slideTimeMs: 0, isPlaying: durations.length > 0 }
        : { ...current, isPlaying: durations.length > 0 };
    });
  }, [durations]);
  const pause = useCallback(() => setState((current) => ({ ...current, isPlaying: false })), []);
  const toggle = useCallback(() => {
    if (stateRef.current.isPlaying) pause();
    else play();
  }, [pause, play]);
  const selectSlide = useCallback((index: number) => {
    setState((current) => ({
      activeSlideIndex: Math.max(0, Math.min(index, Math.max(0, durations.length - 1))),
      slideTimeMs: 0,
      isPlaying: current.isPlaying,
    }));
  }, [durations.length]);

  const progressFraction = useMemo(
    () => previewTotalProgress(state, durations),
    [durations, state],
  );

  return { ...state, progressFraction, play, pause, toggle, selectSlide };
}
