import { GripVertical, X } from "lucide-react";

import { cn } from "@beyo/lib";

import { MediaStripe } from "../dashboard/MediaStripe";
import type { SlideRailItemData } from "./types";

type SlideRailCardProps = {
  slide: SlideRailItemData;
  slideNumber: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  deleteDisabled?: boolean;
  readOnly?: boolean;
  /** Pointer-down on the drag handle; the rail owns the drag. */
  onHandlePointerDown?: (event: React.PointerEvent, id: string) => void;
  isDragging?: boolean;
};

export function SlideRailCard({
  slide,
  slideNumber,
  isSelected,
  onSelect,
  onDelete,
  deleteDisabled,
  readOnly,
  onHandlePointerDown,
  isDragging,
}: SlideRailCardProps): React.JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(slide.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(slide.id);
        }
      }}
      data-testid={`presentation-editor-slide-card-${slide.id}`}
      aria-pressed={isSelected}
      className={cn(
        "relative cursor-pointer rounded-[9px] bg-white px-2.5 pb-2 pt-5 transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]",
        isSelected
          ? "border-[1.5px] border-[#3f78a8] shadow-[0_0_0_3px_rgba(63,120,168,0.14)]"
          : "border border-[#e7e7e7] hover:border-[#cdcdcd]",
        isDragging && "opacity-60 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.4)]",
      )}
    >
      {!readOnly && (
        <button
          type="button"
          aria-label="Reorder slide"
          onPointerDown={(event) => onHandlePointerDown?.(event, slide.id)}
          onClick={(event) => event.stopPropagation()}
          data-testid={`presentation-editor-slide-drag-handle-${slide.id}`}
          className="absolute left-1 top-1 cursor-grab touch-none rounded p-0.5 text-[#b0b0b0] hover:text-[#767676] active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-3.5" strokeWidth={2} />
        </button>
      )}
      <span className="absolute right-2 top-1.5 text-[11px] font-bold text-[#9a9a9a]">
        {slideNumber}
      </span>
      <div className="mx-auto h-[104px] w-[58px] overflow-hidden rounded-[7px] bg-[#474d56]">
        {slide.thumbnail ?? (
          <div className="relative h-full w-full">
            <MediaStripe />
            {slide.mediaLabel && (
              <span className="absolute inset-x-0 bottom-1 text-center font-mono text-[8px] font-medium uppercase text-white/80">
                {slide.mediaLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-[#9a9a9a]">{slide.textCountLabel}</span>
        {!readOnly && (
          <button
            type="button"
            aria-label="Delete slide"
            disabled={deleteDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(slide.id);
            }}
            data-testid={`presentation-editor-slide-delete-${slide.id}`}
            className="rounded p-0.5 text-[#c05a5a] transition-colors duration-150 hover:bg-[#fdecea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X aria-hidden className="size-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
