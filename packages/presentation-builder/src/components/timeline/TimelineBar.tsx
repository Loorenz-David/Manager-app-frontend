import { useRef } from "react";

import { cn } from "@beyo/lib";

import type { TimelineBarGesture, TimelineBarGestureKind } from "./types";

type TimelineBarVariant = "text" | "media";

/** Per-variant palette: text bars keep the studio blue; media bars get a violet
 * of the same weight so mixed tracks read at a glance. */
const VARIANT_CLASSES: Record<
  TimelineBarVariant,
  { border: string; fill: string; fillSelected: string; label: string; handle: string }
> = {
  text: {
    border: "border-[#3f78a8]",
    fill: "bg-[rgba(63,120,168,0.16)]",
    fillSelected: "bg-[rgba(63,120,168,0.30)]",
    label: "text-[#2c5372]",
    handle: "bg-[#3f78a8]/70 hover:bg-[#3f78a8]",
  },
  media: {
    border: "border-[#7a5ea8]",
    fill: "bg-[rgba(122,94,168,0.16)]",
    fillSelected: "bg-[rgba(122,94,168,0.30)]",
    label: "text-[#4d3d70]",
    handle: "bg-[#7a5ea8]/70 hover:bg-[#7a5ea8]",
  },
};

type TimelineBarProps = {
  /** Position within the lane, both 0..1 (computed by the logic layer). */
  leftFraction: number;
  widthFraction: number;
  isSelected: boolean;
  /** Center label, e.g. "Slide · Fade". */
  label: string;
  /** Visual family of the element this bar times. */
  variant?: TimelineBarVariant;
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
  variant = "text",
  onSelect,
  onGesture,
  onGestureEnd,
  disabled,
  testId,
}: TimelineBarProps): React.JSX.Element {
  const barRef = useRef<HTMLDivElement>(null);
  const palette = VARIANT_CLASSES[variant];

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
        "absolute inset-y-[3px] flex min-w-[24px] cursor-grab items-center justify-center overflow-hidden rounded-[6px] border-[1.5px] active:cursor-grabbing",
        palette.border,
        isSelected ? palette.fillSelected : palette.fill,
        disabled && "cursor-default active:cursor-default",
      )}
      style={{
        left: `${leftFraction * 100}%`,
        width: `${widthFraction * 100}%`,
      }}
    >
      <span
        className={cn(
          "pointer-events-none truncate px-2.5 text-[11px] font-semibold",
          palette.label,
        )}
      >
        {label}
      </span>
      {!disabled && (
        <>
          <span
            onPointerDown={(event) => startGesture(event, "resize-start")}
            data-testid={`${testId}-handle-start`}
            className={cn("absolute inset-y-0 left-0 w-[7px] cursor-ew-resize", palette.handle)}
          />
          <span
            onPointerDown={(event) => startGesture(event, "resize-end")}
            data-testid={`${testId}-handle-end`}
            className={cn("absolute inset-y-0 right-0 w-[7px] cursor-ew-resize", palette.handle)}
          />
        </>
      )}
    </div>
  );
}
