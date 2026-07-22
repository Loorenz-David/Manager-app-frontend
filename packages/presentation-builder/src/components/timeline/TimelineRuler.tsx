import { useRef } from "react";

import { TIMELINE_LABEL_GUTTER_PX } from "./types";

type TimelineRulerProps = {
  /** Tick labels with axis positions, computed by the logic layer, fractions 0..1. */
  ticks: { label: string; fraction: number }[];
  /** Press/drag anywhere on the axis scrubs to that fraction (0..1, clamped here). */
  onScrub: (fraction: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
};

export function TimelineRuler({
  ticks,
  onScrub,
  onScrubStart,
  onScrubEnd,
}: TimelineRulerProps): React.JSX.Element {
  const axisRef = useRef<HTMLDivElement>(null);

  const fractionFromClientX = (clientX: number): number => {
    const rect = axisRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    onScrubStart?.();
    onScrub(fractionFromClientX(event.clientX));
    const handleMove = (moveEvent: PointerEvent) =>
      onScrub(fractionFromClientX(moveEvent.clientX));
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      onScrubEnd?.();
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div className="flex h-5 items-end" data-testid="presentation-timeline-ruler">
      <div style={{ width: TIMELINE_LABEL_GUTTER_PX }} className="shrink-0" />
      <div
        ref={axisRef}
        onPointerDown={handlePointerDown}
        className="relative h-full min-w-0 flex-1 cursor-pointer"
      >
        {ticks.map((tick) => (
          <span
            key={tick.label}
            style={{ left: `${tick.fraction * 100}%` }}
            className="absolute bottom-0 -translate-x-1/2 font-mono text-[9px] text-[#b0b0b0]"
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
