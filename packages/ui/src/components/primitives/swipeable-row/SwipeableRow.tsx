import { useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import { animate, m, useMotionValue, useTransform } from "framer-motion";

import { cn, durations, easings } from "@beyo/lib";

import type { SwipeableRowProps } from "./swipeable-row.types";

const DEFAULT_THRESHOLD = 0.4;
const MAX_OVERSHOOT_PX = 48;
const HAPTIC_MS = 12;

function triggerThresholdHaptic(): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  void navigator.vibrate(HAPTIC_MS);
}

export function SwipeableRow({
  children,
  leftToRightAction,
  rightToLeftAction,
  onSwipeLeftToRight,
  onSwipeRightToLeft,
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
  className,
}: SwipeableRowProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const thresholdTriggeredRef = useRef<"left" | "right" | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const x = useMotionValue(0);
  const leftOpacity = useTransform(x, [0, 48], [0, 1], { clamp: true });
  const rightOpacity = useTransform(x, [-48, 0], [1, 0], { clamp: true });
  const leftScale = useTransform(x, [0, 96], [0.92, 1], { clamp: true });
  const rightScale = useTransform(x, [-96, 0], [1, 0.92], { clamp: true });

  function getCommitThreshold(): number {
    const width = containerRef.current?.offsetWidth ?? 0;
    return Math.max(56, width * threshold);
  }

  function clampMovement(nextX: number): number {
    const limit = getCommitThreshold() + MAX_OVERSHOOT_PX;
    return Math.max(-limit, Math.min(limit, nextX));
  }

  async function commit(direction: "left" | "right"): Promise<void> {
    const width = containerRef.current?.offsetWidth ?? 320;
    const exitX = direction === "right" ? width : -width;
    const callback =
      direction === "right" ? onSwipeLeftToRight : onSwipeRightToLeft;

    setIsCommitting(true);
    await animate(x, exitX, {
      duration: durations.fast,
      ease: easings.standard,
    });

    try {
      await callback?.();
    } catch {
      // The action rejected: restore the row to its resting position and stay
      // interactive. Error messaging is the callback owner's responsibility, so
      // the rejection is intentionally not re-thrown (avoids an unhandled
      // rejection at the fire-and-forget call site).
      await animate(x, 0, {
        type: "spring",
        stiffness: 320,
        damping: 28,
      });
      setIsCommitting(false);
    }
  }

  const bind = useDrag(
    ({ active, movement: [mx], direction: [dx], first, last, cancel }) => {
      if (first) {
        thresholdTriggeredRef.current = null;
      }

      if (disabled || isCommitting) {
        cancel();
        return;
      }

      if (active) {
        const nextX = clampMovement(mx);
        x.set(nextX);

        const commitThreshold = getCommitThreshold();
        const thresholdDirection =
          nextX >= commitThreshold
            ? "right"
            : nextX <= -commitThreshold
              ? "left"
              : null;

        if (
          thresholdDirection &&
          thresholdTriggeredRef.current !== thresholdDirection
        ) {
          thresholdTriggeredRef.current = thresholdDirection;
          triggerThresholdHaptic();
        }

        if (!thresholdDirection) {
          thresholdTriggeredRef.current = null;
        }

        return;
      }

      if (!last) {
        return;
      }

      const currentX = x.get();
      const commitThreshold = getCommitThreshold();
      const shouldCommitRight =
        currentX >= commitThreshold && dx >= 0 && leftToRightAction && onSwipeLeftToRight;
      const shouldCommitLeft =
        currentX <= -commitThreshold && dx <= 0 && rightToLeftAction && onSwipeRightToLeft;

      if (shouldCommitRight) {
        void commit("right");
        return;
      }

      if (shouldCommitLeft) {
        void commit("left");
        return;
      }

      void animate(x, 0, {
        type: "spring",
        stiffness: 320,
        damping: 28,
      });
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true },
    },
  );
  const bindProps = bind() as React.HTMLAttributes<HTMLDivElement>;

  return (
    <div
      ref={containerRef}
      // The row owns horizontal drags started on it — they must never also
      // reach the enclosing slide-page dismiss or tab/pane slide-stack swipe.
      data-slide-dismiss-ignore=""
      className={cn("relative overflow-hidden", className)}
    >
      {leftToRightAction ? (
        <m.div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 flex w-40 items-center gap-2 px-5 text-sm font-semibold text-white",
            leftToRightAction.className,
          )}
          style={{ opacity: leftOpacity, scale: leftScale }}
        >
          <leftToRightAction.icon className="size-4 shrink-0" />
          <span>{leftToRightAction.label}</span>
        </m.div>
      ) : null}

      {rightToLeftAction ? (
        <m.div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 flex w-40 items-center justify-end gap-2 px-5 text-sm font-semibold text-white",
            rightToLeftAction.className,
          )}
          style={{ opacity: rightOpacity, scale: rightScale }}
        >
          <span>{rightToLeftAction.label}</span>
          <rightToLeftAction.icon className="size-4 shrink-0" />
        </m.div>
      ) : null}

      <div
        {...bindProps}
        className={cn(isCommitting ? "pointer-events-none" : null)}
      >
        <m.div style={{ x }}>{children}</m.div>
      </div>
    </div>
  );
}
