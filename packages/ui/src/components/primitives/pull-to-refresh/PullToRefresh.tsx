import {
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
  type RefObject,
} from "react";
import { useDrag } from "@use-gesture/react";
import { animate, m, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@beyo/lib";
import { useScrollElementRegistration } from "../scroll-visibility/ScrollElementRegistrationContext";

const THRESHOLD = 80;
const INDICATOR_HEIGHT = 56;
const RESISTANCE = 0.4;
const THRESHOLD_HAPTIC_MS = 12;

export type PullToRefreshProps = {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
  scrollClassName?: string;
  className?: string;
  scrollRef?: RefObject<HTMLDivElement | null>;
};

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  scrollClassName,
  className,
  scrollRef: externalScrollRef,
}: PullToRefreshProps): JSX.Element {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const activeRef = externalScrollRef ?? internalScrollRef;
  const thresholdHapticTriggeredRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullY = useMotionValue(0);

  function triggerThresholdHaptic() {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      return;
    }

    void navigator.vibrate(THRESHOLD_HAPTIC_MS);
  }

  // Only auto-register when PTR owns the scroll ref (no external ref supplied).
  // When the caller passes scrollRef they manage scroll visibility themselves —
  // either locally via useScrollVisibility() or globally via useRegisterScrollElement().
  const registerScrollElement = useScrollElementRegistration();
  useEffect(() => {
    if (externalScrollRef || !registerScrollElement) return;
    const el = activeRef.current;
    if (!el) return;
    return registerScrollElement(el);
  }, [externalScrollRef, registerScrollElement]);

  const indicatorOpacity = useTransform(
    pullY,
    [0, INDICATOR_HEIGHT * 0.5],
    [0, 1],
    { clamp: true },
  );
  const indicatorScale = useTransform(pullY, [0, INDICATOR_HEIGHT], [0.5, 1], {
    clamp: true,
  });
  const spinAngle = useTransform(pullY, [0, THRESHOLD], [0, 270]);

  const bind = useDrag(
    ({ active, movement: [, my], first, cancel }) => {
      if (first) {
        thresholdHapticTriggeredRef.current = false;
      }

      if (disabled || isRefreshing) {
        cancel();
        return;
      }

      if (first && (activeRef.current?.scrollTop ?? 0) > 0) {
        cancel();
        return;
      }

      if (my < 0) {
        cancel();
        return;
      }

      if (active) {
        const nextPullY = Math.min(my * RESISTANCE, THRESHOLD * 1.5);
        pullY.set(nextPullY);

        if (
          nextPullY >= THRESHOLD &&
          !thresholdHapticTriggeredRef.current
        ) {
          thresholdHapticTriggeredRef.current = true;
          triggerThresholdHaptic();
        }

        return;
      }

      const currentY = pullY.get();
      if (currentY >= THRESHOLD) {
        setIsRefreshing(true);
        void animate(pullY, INDICATOR_HEIGHT, {
          duration: 0.15,
          ease: "easeOut",
        });
        void Promise.resolve(onRefresh()).finally(() => {
          setIsRefreshing(false);
          void animate(pullY, 0, {
            type: "spring",
            stiffness: 300,
            damping: 30,
          });
        });
        return;
      }

      void animate(pullY, 0, {
        type: "spring",
        stiffness: 300,
        damping: 30,
      });
    },
    {
      axis: "y",
      filterTaps: true,
      pointer: { touch: true },
    },
  );

  return (
    <div
      {...bind()}
      className={cn("relative overflow-hidden", className)}
      data-testid="pull-to-refresh"
    >
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"
        style={{
          height: INDICATOR_HEIGHT,
          opacity: indicatorOpacity,
          scale: indicatorScale,
        }}
      >
        <m.div
          className="size-5 rounded-full border-2 border-muted-foreground/25 border-t-foreground"
          style={{ rotate: isRefreshing ? undefined : spinAngle }}
          animate={isRefreshing ? { rotate: 360 } : undefined}
          transition={
            isRefreshing
              ? { repeat: Infinity, duration: 0.7, ease: "linear" }
              : undefined
          }
          data-testid="pull-to-refresh-indicator"
        />
      </m.div>

      <m.div ref={activeRef} className={cn("h-full", scrollClassName)} style={{ y: pullY }}>
        {children}
      </m.div>
    </div>
  );
}
