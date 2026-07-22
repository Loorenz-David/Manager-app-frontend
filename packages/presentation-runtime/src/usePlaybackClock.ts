import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_PLAYBACK_DELTA_MS = 100;

export type PlaybackClockOptions = {
  durationMs: number;
  initialTimeMs?: number;
  loop?: boolean;
};

export type PlaybackClock = {
  timeMs: number;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (timeMs: number) => void;
};

const clampTime = (timeMs: number, durationMs: number): number =>
  Math.min(Math.max(0, timeMs), Math.max(0, durationMs));

export function advancePlaybackTime(
  timeMs: number,
  deltaMs: number,
  durationMs: number,
  loop: boolean,
): { timeMs: number; completed: boolean } {
  if (durationMs <= 0) return { timeMs: 0, completed: true };
  const next = timeMs + Math.min(MAX_PLAYBACK_DELTA_MS, Math.max(0, deltaMs));
  if (next < durationMs) return { timeMs: next, completed: false };
  return loop
    ? { timeMs: next % durationMs, completed: false }
    : { timeMs: durationMs, completed: true };
}

export function usePlaybackClock({
  durationMs,
  initialTimeMs = 0,
  loop = true,
}: PlaybackClockOptions): PlaybackClock {
  const [timeMs, setTimeMs] = useState(() => clampTime(initialTimeMs, durationMs));
  const [isPlaying, setIsPlaying] = useState(false);
  const timeRef = useRef(timeMs);
  const playingRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const previousTimestampRef = useRef<number | null>(null);

  const pause = useCallback(() => {
    playingRef.current = false;
    previousTimestampRef.current = null;
    setIsPlaying(false);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const seek = useCallback((nextTimeMs: number) => {
    const next = clampTime(nextTimeMs, durationMs);
    timeRef.current = next;
    setTimeMs(next);
  }, [durationMs]);

  const tick = useCallback((timestamp: number) => {
    if (!playingRef.current) return;
    const previous = previousTimestampRef.current;
    previousTimestampRef.current = timestamp;
    if (previous !== null) {
      const advanced = advancePlaybackTime(timeRef.current, timestamp - previous, durationMs, loop);
      timeRef.current = advanced.timeMs;
      setTimeMs(advanced.timeMs);
      if (advanced.completed) {
        pause();
        return;
      }
    }
    frameRef.current = requestAnimationFrame(tick);
  }, [durationMs, loop, pause]);

  const play = useCallback(() => {
    if (playingRef.current || durationMs <= 0) return;
    if (!loop && timeRef.current >= durationMs) {
      timeRef.current = 0;
      setTimeMs(0);
    }
    playingRef.current = true;
    previousTimestampRef.current = null;
    setIsPlaying(true);
    frameRef.current = requestAnimationFrame(tick);
  }, [durationMs, loop, tick]);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  useEffect(() => {
    const next = clampTime(timeRef.current, durationMs);
    timeRef.current = next;
    setTimeMs(next);
  }, [durationMs]);

  useEffect(() => pause, [pause]);

  return { timeMs, isPlaying, play, pause, toggle, seek };
}
