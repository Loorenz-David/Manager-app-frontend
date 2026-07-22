import { useRef } from "react";

import { cn } from "@beyo/lib";

import type { TimelineBarGesture, TimelineBarGestureKind } from "./types";

type TimelineBarProps = {
  /** Position within the lane, both 0..1 (computed by the logic layer). */
  leftFraction: number;
  widthFraction: number;
  isSelected: boolean;
  /** Center label, e.g. "Slide · Fade". */
  label: string;
  onSelect: () => void;
  /** Continuous during a drag; the logic layer converts px→time, clamps, and re-renders. */
  onGesture: (gesture: TimelineBarGesture) => void;
  onGestureEnd: (kind: TimelineBarGestureKind) => void;
  disabled?: boolean;
  testId: string;
};

/** A text/media element's timing bar: draggable body + two resize handles.
 * Reports raw pointer deltas only — no time math here. */
export function TimelineBar({
  leftFraction,
  widthFraction,
  isSelected,
  label,
  onSelect,
  onGesture,
  onGestureEnd,
  disabled,
  testId,
}: TimelineBarProps): React.JSX.Element {
  const barRef = useRef<HTMLDivElement>(null);

  const startGesture = (event: React.PointerEvent, kind: TimelineBarGestureKind) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    const startX = event.clientX;
    const laneWidthPx = barRef.current?.parentElement?.offsetWidth ?? 0;
    if (laneWidthPx === 0) return;

    const handleMove = (moveEvent: PointerEvent) => {
      onGesture({ kind, deltaPx: moveEvent.clientX - startX, laneWidthPx });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      onGestureEnd(kind);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      ref={barRef}
      role="button"
      tabIndex={0}
      onPointerDown={(event) => startGesture(event, "move")}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      data-testid={testId}
      aria-pressed={isSelected}
      className={cn(
        "absolute inset-y-[3px] flex min-w-[24px] cursor-grab items-center justify-center overflow-hidden rounded-[6px] border-[1.5px] border-[#3f78a8] active:cursor-grabbing",
        isSelected ? "bg-[rgba(63,120,168,0.30)]" : "bg-[rgba(63,120,168,0.16)]",
        disabled && "cursor-default active:cursor-default",
      )}
      style={{
        left: `${leftFraction * 100}%`,
        width: `${widthFraction * 100}%`,
      }}
    >
      <span className="pointer-events-none truncate px-2.5 text-[11px] font-semibold text-[#2c5372]">
        {label}
      </span>
      {!disabled && (
        <>
          <span
            onPointerDown={(event) => startGesture(event, "resize-start")}
            data-testid={`${testId}-handle-start`}
            className="absolute inset-y-0 left-0 w-[7px] cursor-ew-resize bg-[#3f78a8]/70 hover:bg-[#3f78a8]"
          />
          <span
            onPointerDown={(event) => startGesture(event, "resize-end")}
            data-testid={`${testId}-handle-end`}
            className="absolute inset-y-0 right-0 w-[7px] cursor-ew-resize bg-[#3f78a8]/70 hover:bg-[#3f78a8]"
          />
        </>
      )}
    </div>
  );
}
