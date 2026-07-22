type PlayerSegmentedProgressProps = {
  slideCount: number;
  activeIndex: number;
  /** Fill of the active segment, 0..1 (from the playback clock). */
  activeFraction: number;
};

/** Story-style per-slide progress segments across the top of the player. */
export function PlayerSegmentedProgress({
  slideCount,
  activeIndex,
  activeFraction,
}: PlayerSegmentedProgressProps): React.JSX.Element {
  return (
    <div
      data-testid="presentation-player-progress"
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex gap-1 p-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]"
      aria-hidden
    >
      {Array.from({ length: slideCount }, (_, index) => (
        <div key={index} className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white"
            style={{
              width:
                index < activeIndex
                  ? "100%"
                  : index === activeIndex
                    ? `${Math.min(100, Math.max(0, activeFraction * 100))}%`
                    : "0%",
            }}
          />
        </div>
      ))}
    </div>
  );
}
