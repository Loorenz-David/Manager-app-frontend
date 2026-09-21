import type { ButtonHTMLAttributes, Ref } from "react";
import { GripHorizontal } from "lucide-react";

import { cn } from "@beyo/lib";

import { DRAG_ACCENT_BORDER_CLASS } from "../../lib/stock-report-theme";
import type { StockNeedCardData } from "../../stock-report.types";
import { FulfilmentBar } from "./FulfilmentBar";
import { StockNeedPropertyTags } from "./StockNeedPropertyTags";
import { StockNeedQuantityPanel } from "./StockNeedQuantityPanel";

export type StockNeedCardProps = {
  card: StockNeedCardData;
  /** Opens the detail. Works in reorganise mode too (intention §6.1). */
  onPress?: (stockNeedId: string) => void;
  /**
   * Reorganise mode only. Drag starts from the handle and nowhere else, so a
   * touch on the card body always scrolls the page.
   */
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: Ref<HTMLButtonElement>;
  showDragHandle?: boolean;
  isDragging?: boolean;
  /** Reorganise mode only: renders the card's "Set priority" bottom button. */
  onSetPriority?: (stockNeedId: string) => void;
};

export function StockNeedCard({
  card,
  onPress,
  dragHandleProps,
  dragHandleRef,
  showDragHandle = false,
  isDragging = false,
  onSetPriority,
}: StockNeedCardProps): React.JSX.Element {
  const isPressable = Boolean(onPress);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        isDragging && cn(DRAG_ACCENT_BORDER_CLASS, "opacity-65"),
      )}
      data-dragging={isDragging ? "" : undefined}
      data-testid={`stock-need-card-${card.stockNeedId}`}
    >
      <div className="flex">
        <StockNeedQuantityPanel
          data-testid={`stock-need-card-panel-${card.stockNeedId}`}
          imageAlt={card.title}
          imageUrl={card.imageUrl}
          isDragging={isDragging}
          quantity={card.quantities.requested}
        />

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-2 px-3.5 py-3",
            isPressable ? "cursor-pointer" : "cursor-default",
          )}
          data-testid={`stock-need-card-body-${card.stockNeedId}`}
          role={isPressable ? "button" : undefined}
          tabIndex={isPressable ? 0 : undefined}
          onClick={() => onPress?.(card.stockNeedId)}
          onKeyDown={(event) => {
            if (!isPressable) {
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onPress?.(card.stockNeedId);
            }
          }}
        >
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 text-base font-bold leading-tight tracking-tight text-foreground">
              {card.title}
            </span>

            {showDragHandle ? (
              <button
                ref={dragHandleRef}
                aria-label={`Reorder ${card.title}`}
                // size-11 is the 44px touch target the design asks for; the
                // negative margins keep the glyph optically at the card's
                // top-right corner while the target stays generous.
                className="-mr-2.5 -mt-2 flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted/90 active:cursor-grabbing"
                data-testid={`stock-need-card-handle-${card.stockNeedId}`}
                type="button"
                onClick={(event) => event.stopPropagation()}
                {...dragHandleProps}
              >
                <GripHorizontal aria-hidden="true" className="size-[18px]" />
              </button>
            ) : null}
          </div>

          <StockNeedPropertyTags
            data-testid={`stock-need-card-tags-${card.stockNeedId}`}
            tags={card.propertyTags}
          />

          <FulfilmentBar
            data-testid={`stock-need-card-bar-${card.stockNeedId}`}
            quantities={card.quantities}
          />
        </div>
      </div>

      {onSetPriority ? (
        <button
          className="border-t border-border px-4 py-3 text-sm font-semibold text-foreground"
          data-testid={`stock-need-card-set-priority-${card.stockNeedId}`}
          type="button"
          onClick={() => onSetPriority(card.stockNeedId)}
        >
          Set priority
        </button>
      ) : null}
    </div>
  );
}
