import { Pause, Play, X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { cn } from "@beyo/lib";

type PreviewOverlayProps = {
  /** The rendered current slide (runtime renderer at the preview clock's time). */
  children: ReactNode;
  onExit: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  /** Elapsed / total across ALL slides, 0..1. */
  progressFraction: number;
  slideCount: number;
  activeSlideIndex: number;
  /** Jump to a slide; omit to render inert dots. */
  onSelectSlide?: (index: number) => void;
};

/** Full-editor preview overlay per the design: dark cover, centered 300×533 phone,
 * exit top-right, play/pause + total progress + slide dots at the bottom. */
export function PreviewOverlay({
  children,
  onExit,
  isPlaying,
  onTogglePlay,
  progressFraction,
  slideCount,
  activeSlideIndex,
  onSelectSlide,
}: PreviewOverlayProps): React.JSX.Element {
  // Escape exits the takeover, matching the visible "✕ Exit" affordance.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit]);

  return (
    <div
      data-testid="presentation-preview-overlay"
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#161616]"
    >
      <button
        type="button"
        onClick={onExit}
        data-testid="presentation-preview-exit-button"
        className="absolute right-5 top-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
      >
        <X aria-hidden className="size-4" strokeWidth={2} />
        Exit
      </button>
      <div className="relative h-[533px] w-[300px] overflow-hidden rounded-[22px] border-[5px] border-black bg-[#474d56]">
        {children}
      </div>
      <div className="mt-6 flex w-[300px] items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          data-testid="presentation-preview-play-button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-150 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          {isPlaying ? (
            <Pause aria-hidden className="size-3.5 fill-current" strokeWidth={0} />
          ) : (
            <Play aria-hidden className="ml-0.5 size-3.5 fill-current" strokeWidth={0} />
          )}
        </button>
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            data-testid="presentation-preview-progress"
            className="h-full rounded-full bg-white"
            style={{ width: `${Math.min(100, Math.max(0, progressFraction * 100))}%` }}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {Array.from({ length: slideCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Slide ${index + 1}`}
              disabled={onSelectSlide === undefined}
              onClick={() => onSelectSlide?.(index)}
              data-testid={`presentation-preview-dot-${index}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                index === activeSlideIndex ? "w-[18px] bg-white" : "w-1.5 bg-white/35",
                onSelectSlide !== undefined && "cursor-pointer hover:bg-white/70",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
