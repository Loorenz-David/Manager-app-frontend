import type { ButtonHTMLAttributes, Ref } from "react";
import { GripHorizontal } from "lucide-react";

import { cn } from "@beyo/lib";

import {
  DRAG_ACCENT_BORDER_CLASS,
  PRIORITY_ACTION_MARKER_CLASS,
} from "../../lib/stock-report-theme";
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
  /** Renders the card's priority bottom button. Omit it to render none. */
  onSetPriority?: (stockNeedId: string) => void;
  /**
   * What that button says. A row with no priority is having one *set*; a row
   * already in a bucket is having it *changed*.
   */
  priorityActionLabel?: string;
};

export function StockNeedCard({
  card,
  onPress,
  dragHandleProps,
  dragHandleRef,
  showDragHandle = false,
  isDragging = false,
  onSetPriority,
  priorityActionLabel = "Set priority",
}: StockNeedCardProps): React.JSX.Element {
  const isPressable = Boolean(onPress);

  return (
    // The row, not the card: the priority action hangs off the card's bottom
    // edge rather than sitting inside it, so the whole row is what dims while
    // it is being dragged. No gap — the tab has to touch the card to read as
    // attached to it.
    <div
      className={cn("flex flex-col", isDragging && "opacity-65")}
      data-dragging={isDragging ? "" : undefined}
      data-testid={`stock-need-card-${card.stockNeedId}`}
    >
      <div
        className={cn(
          "flex overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
          // The card gives up its bottom-left corner to the tab below, which
          // carries the same radius. Without this the card's curve would leave
          // a crescent of background above the tab's square top edge and the
          // two would stop reading as one shape.
          onSetPriority && "rounded-bl-none",
          isDragging && DRAG_ACCENT_BORDER_CLASS,
        )}
      >
        <StockNeedQuantityPanel
          data-testid={`stock-need-card-panel-${card.stockNeedId}`}
          imageAlt={card.title}
          imageUrl={card.imageUrl}
          quantity={card.quantities.requested}
        />

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-2 pr-3.5 py-3",
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
        // A browser tab, upside down: square where it meets the card, rounded
        // where it leaves it, and only as wide as its own label (owner,
        // 2026-09-22 — the full-width button ate a card's worth of list).
        //
        // It starts at the card's own left edge and continues its outline, so
        // the outer corner wears the card's `rounded-2xl` while the inner one
        // is the tab's own smaller `xl`. That pairing is what makes the two
        // read as one shape rather than as a card with a chip beneath it —
        // keep `rounded-bl-2xl` equal to the card's radius.
        <button
          className="flex items-center gap-1.5 self-start rounded-bl-2xl rounded-br-xl bg-primary px-3 py-2.5 text-xs font-semibold text-card"
          data-testid={`stock-need-card-set-priority-${card.stockNeedId}`}
          type="button"
          onClick={() => onSetPriority(card.stockNeedId)}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rotate-45 rounded-[1px]",
              PRIORITY_ACTION_MARKER_CLASS,
            )}
          />
          {priorityActionLabel}
        </button>
      ) : null}
    </div>
  );
}
