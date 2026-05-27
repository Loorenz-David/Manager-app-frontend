import { useCallback, useRef, useState } from "react";

type ScrollStateOptions = {
  threshold: number;
  hysteresis: number;
};

type ScrollStateResult = {
  isHidden: boolean;
  suspend: (durationMs?: number) => void;
  onScroll: (value: number) => void;
  resetState: (value: number) => void;
  initialize: (value: number) => void;
};

export function useScrollState({
  threshold,
  hysteresis,
}: ScrollStateOptions): ScrollStateResult {
  const [isHidden, setIsHidden] = useState(false);
  const hiddenTargetRef = useRef(false);
  const suppressedUntilRef = useRef(0);

  const applyHidden = useCallback((hidden: boolean) => {
    if (hiddenTargetRef.current === hidden) {
      return;
    }

    hiddenTargetRef.current = hidden;
    setIsHidden(hidden);
  }, []);

  const suspend = useCallback((durationMs = 120) => {
    suppressedUntilRef.current = performance.now() + durationMs;
  }, []);

  const onScroll = useCallback(
    (value: number) => {
      if (performance.now() < suppressedUntilRef.current) {
        return;
      }

      if (!hiddenTargetRef.current && value > threshold) {
        applyHidden(true);
      } else if (hiddenTargetRef.current && value < hysteresis) {
        applyHidden(false);
      }
    },
    [applyHidden, threshold, hysteresis],
  );

  const resetState = useCallback(
    (value: number) => {
      if (value < hysteresis) {
        applyHidden(false);
      }
    },
    [applyHidden, hysteresis],
  );

  const initialize = useCallback((value: number) => {
    hiddenTargetRef.current = false;
    suppressedUntilRef.current = performance.now() + 120;
    setIsHidden(value > threshold ? true : false);
    hiddenTargetRef.current = value > threshold;
  }, [threshold]);

  return { isHidden, suspend, onScroll, resetState, initialize };
}
