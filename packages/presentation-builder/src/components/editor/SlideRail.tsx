import { Plus } from "lucide-react";
import { useRef, useState } from "react";

import { SlideRailCard } from "./SlideRailCard";
import type { SlideRailItemData } from "./types";

type SlideRailProps = {
  slides: SlideRailItemData[];
  selectedSlideId: string | null;
  onSelectSlide: (id: string) => void;
  onAddSlide: () => void;
  addDisabled?: boolean;
  onDeleteSlide: (id: string) => void;
  /** Last remaining slide is not deletable (design rule) — pass true then. */
  deleteDisabled?: boolean;
  /** Called once on drop with the dragged slide and its target index (0-based). */
  onReorder: (id: string, targetIndex: number) => void;
  readOnly?: boolean;
};

type DragState = {
  id: string;
  startY: number;
  currentIndex: number;
};

/** The left slide rail: label + add button, vertical card list with pointer drag-reorder. */
export function SlideRail({
  slides,
  selectedSlideId,
  onSelectSlide,
  onAddSlide,
  addDisabled,
  onDeleteSlide,
  deleteDisabled,
  onReorder,
  readOnly,
}: SlideRailProps): React.JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Visual drag-reorder only: target index comes from sibling card centers in the
  // rail's own DOM; the actual list mutation happens in the injected onReorder.
  const handlePointerDown = (event: React.PointerEvent, id: string) => {
    if (readOnly) return;
    event.preventDefault();
    const startIndex = slides.findIndex((slide) => slide.id === id);
    if (startIndex === -1) return;
    setDrag({ id, startY: event.clientY, currentIndex: startIndex });

    const computeTargetIndex = (clientY: number): number => {
      const cards = Array.from(
        listRef.current?.querySelectorAll<HTMLElement>("[data-rail-card]") ?? [],
      );
      let target = cards.length - 1;
      for (let index = 0; index < cards.length; index += 1) {
        const rect = cards[index]!.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          target = index;
          break;
        }
      }
      return target;
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const target = computeTargetIndex(moveEvent.clientY);
      setDrag((current) => (current ? { ...current, currentIndex: target } : current));
    };
    const handleUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      const target = computeTargetIndex(upEvent.clientY);
      setDrag(null);
      if (target !== startIndex) onReorder(id, target);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div className="flex flex-col gap-2.5 p-3" data-testid="presentation-editor-slide-rail">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9a9a9a]">
          Slides
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onAddSlide}
            disabled={addDisabled}
            aria-label="Add slide"
            data-testid="presentation-editor-add-slide-button"
            className="flex size-6 items-center justify-center rounded-md text-[#767676] transition-colors duration-150 hover:bg-[#f0f0f0] hover:text-[#303030] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus aria-hidden className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>
      <div ref={listRef} className="flex flex-col gap-2.5">
        {slides.map((slide, index) => (
          <div key={slide.id} data-rail-card>
            {drag && drag.currentIndex === index && drag.id !== slide.id && (
              <div className="mb-2.5 h-0.5 rounded bg-[#3f78a8]" aria-hidden />
            )}
            <SlideRailCard
              slide={slide}
              slideNumber={index + 1}
              isSelected={slide.id === selectedSlideId}
              onSelect={onSelectSlide}
              onDelete={onDeleteSlide}
              deleteDisabled={deleteDisabled}
              readOnly={readOnly}
              onHandlePointerDown={handlePointerDown}
              isDragging={drag?.id === slide.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
