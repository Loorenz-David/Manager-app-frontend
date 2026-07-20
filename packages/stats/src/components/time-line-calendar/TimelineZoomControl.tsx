import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

export type TimelineZoomControlProps = {
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

// True when the primary input is touch (phone/tablet) — there the two-finger
// pinch is the zoom, so the buttons are redundant and we hide them.
function useHasCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return coarse;
}

// Non-gesture zoom for the time axis (mouse / accessibility) — mirrors the
// two-finger pinch. Floats at the grid's right edge, out of the events' way.
// Hidden on touch devices, where pinch already covers it.
export function TimelineZoomControl({
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
}: TimelineZoomControlProps): React.JSX.Element | null {
  const hasCoarsePointer = useHasCoarsePointer();
  if (hasCoarsePointer) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute right-2 top-3 z-30 flex flex-col gap-1"
      data-testid="timeline-zoom-control"
    >
      <button
        aria-label="Zoom in"
        className="pointer-events-auto flex size-8 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm backdrop-blur disabled:opacity-40"
        data-testid="timeline-zoom-in"
        disabled={!canZoomIn}
        type="button"
        onClick={onZoomIn}
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
      <button
        aria-label="Zoom out"
        className="pointer-events-auto flex size-8 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm backdrop-blur disabled:opacity-40"
        data-testid="timeline-zoom-out"
        disabled={!canZoomOut}
        type="button"
        onClick={onZoomOut}
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
