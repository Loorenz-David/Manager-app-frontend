import { useRef } from "react";
import type { ReactNode } from "react";

import { TIMELINE_LABEL_GUTTER_PX } from "./types";

type TimelineDockProps = {
  /** TimelineControls row. */
  controls: ReactNode;
  /** TimelineRuler. */
  ruler: ReactNode;
  /** TimelineTrack rows. */
  children: ReactNode;
  /** Playhead position as a fraction of the lane axis, 0..1. */
  playheadFraction: number;
  /** Dragging the playhead scrubs; same fraction semantics as the ruler. */
  onPlayheadScrub: (fraction: number) => void;
  onPlayheadScrubStart?: () => void;
  onPlayheadScrubEnd?: () => void;
  playheadDisabled?: boolean;
};

/** The timeline region docked under the canvas: controls, ruler, tracks, and the
 * red playhead spanning the tracks. Owns only pointer→fraction math. */
export function TimelineDock({
  controls,
  ruler,
  children,
  playheadFraction,
  onPlayheadScrub,
  onPlayheadScrubStart,
  onPlayheadScrubEnd,
  playheadDisabled,
}: TimelineDockProps): React.JSX.Element {
  const tracksRef = useRef<HTMLDivElement>(null);

  const fractionFromClientX = (clientX: number): number => {
    const rect = tracksRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const laneLeft = rect.left + TIMELINE_LABEL_GUTTER_PX;
    const laneWidth = rect.width - TIMELINE_LABEL_GUTTER_PX;
    if (laneWidth <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - laneLeft) / laneWidth));
  };

  const handlePlayheadPointerDown = (event: React.PointerEvent) => {
    if (playheadDisabled) return;
    event.preventDefault();
    onPlayheadScrubStart?.();
    const handleMove = (moveEvent: PointerEvent) =>
      onPlayheadScrub(fractionFromClientX(moveEvent.clientX));
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      onPlayheadScrubEnd?.();
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      data-testid="presentation-timeline-dock"
      className="shrink-0 border-t border-[#e7e7e7] bg-white px-4 py-3"
    >
      {controls}
      <div className="mt-2">{ruler}</div>
      <div ref={tracksRef} className="relative mt-1 flex flex-col gap-1.5">
        {children}
        <div
          onPointerDown={handlePlayheadPointerDown}
          data-testid="presentation-timeline-playhead"
          aria-hidden
          style={{
            left: `calc(${TIMELINE_LABEL_GUTTER_PX}px + ${playheadFraction} * (100% - ${TIMELINE_LABEL_GUTTER_PX}px))`,
          }}
          className="absolute inset-y-0 z-10 w-[2px] -translate-x-1/2 cursor-ew-resize bg-[#e04b4b]"
        >
          <span className="absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-[#e04b4b]" />
        </div>
      </div>
    </div>
  );
}
