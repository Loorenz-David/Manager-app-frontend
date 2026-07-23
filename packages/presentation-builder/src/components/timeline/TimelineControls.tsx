import { ImagePlus, Pause, Play, Plus } from "lucide-react";

type TimelineControlsProps = {
  isPlaying: boolean;
  onTogglePlay: () => void;
  /** Mono timecode, e.g. "0.8s / 4.0s". */
  timecodeLabel: string;
  onAddText: () => void;
  addTextDisabled?: boolean;
  /** Opens the media file picker (multi-select). Button renders only when provided. */
  onAddMedia?: () => void;
  addMediaDisabled?: boolean;
  helperText?: string;
};

export function TimelineControls({
  isPlaying,
  onTogglePlay,
  timecodeLabel,
  onAddText,
  addTextDisabled,
  onAddMedia,
  addMediaDisabled,
  helperText = "Drag the bars to time each text · drag the playhead to scrub",
}: TimelineControlsProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        data-testid="presentation-timeline-play-button"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#303030] text-white transition-colors duration-150 hover:bg-[#1c1c1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]"
      >
        {isPlaying ? (
          <Pause aria-hidden className="size-3.5 fill-current" strokeWidth={0} />
        ) : (
          <Play aria-hidden className="ml-0.5 size-3.5 fill-current" strokeWidth={0} />
        )}
      </button>
      <span
        data-testid="presentation-timeline-timecode"
        className="font-mono text-[12px] text-[#303030]"
      >
        {timecodeLabel}
      </span>
      <button
        type="button"
        onClick={onAddText}
        disabled={addTextDisabled}
        data-testid="presentation-timeline-add-text-button"
        className="flex items-center gap-1 rounded-lg border border-[#dcdcdc] bg-white px-3 py-[6px] text-[13px] font-semibold text-[#303030] transition-colors duration-150 hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus aria-hidden className="size-3.5" strokeWidth={2.5} />
        Text
      </button>
      {onAddMedia && (
        <button
          type="button"
          onClick={onAddMedia}
          disabled={addMediaDisabled}
          data-testid="presentation-timeline-add-media-button"
          className="flex items-center gap-1 rounded-lg border border-[#dcdcdc] bg-white px-3 py-[6px] text-[13px] font-semibold text-[#303030] transition-colors duration-150 hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus aria-hidden className="size-3.5" strokeWidth={2} />
          Media
        </button>
      )}
      {helperText && (
        <span className="ml-auto hidden text-xs text-[#9a9a9a] lg:block">{helperText}</span>
      )}
    </div>
  );
}
