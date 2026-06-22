import { memo } from "react";
import { Plus } from "lucide-react";

import { ImagePlaceholder, StatePill } from "@/components/primitives";

import type { InventoryListCardViewModel } from "../types";

type InventoryListCardProps = {
  card: InventoryListCardViewModel;
  onTapAdd: (card: InventoryListCardViewModel) => void;
  onTapActions: (inventoryId: InventoryListCardViewModel["inventoryId"]) => void;
  onTapCard: (inventoryId: InventoryListCardViewModel["inventoryId"]) => void;
};

export const InventoryListCard = memo(function InventoryListCard({
  card,
  onTapAdd,
  onTapActions,
  onTapCard,
}: InventoryListCardProps): React.JSX.Element {
  return (
    <div
      className="mx-4 flex overflow-hidden rounded-xl bg-card shadow-sm"
      data-testid={`upholstery-inventory-card-${card.inventoryId}`}
    >
      <button
        aria-label={`Open ${card.name}`}
        className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted"
        type="button"
        onClick={() => onTapCard(card.inventoryId)}
      >
        {card.imageUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={card.imageUrl}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
        )}
      </button>

      <div
        className="flex min-w-0 flex-1 cursor-pointer flex-col justify-start px-3 py-2.5"
        role="button"
        tabIndex={0}
        onClick={() => onTapCard(card.inventoryId)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onTapCard(card.inventoryId);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 basis-0 truncate text-sm font-medium text-foreground">
            {card.name}
          </span>
          <StatePill
            label={card.condition.label}
            variant={card.condition.variant}
          />
          <button
            aria-label="Inventory actions"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTapActions(card.inventoryId);
            }}
          >
            <span className="flex flex-col items-center gap-0.5">
              {[0, 1, 2].map((index) => (
                <span key={index} className="size-1 rounded-full bg-current" />
              ))}
            </span>
          </button>
        </div>
        <span className="mt-2 truncate text-sm text-muted-foreground">
          {card.code}
        </span>
        <div className="mt-auto flex justify-end pt-3">
          <button
            aria-label="Add amount"
            className="flex items-stretch overflow-hidden rounded-2xl"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTapAdd(card);
            }}
          >
            <div className="flex flex-col justify-center rounded-l-2xl border-y border-l border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Stored
              </span>
              <span className="text-sm font-semibold text-foreground">
                {card.storedDisplay}
              </span>
            </div>
            <div className="flex items-center rounded-r-2xl bg-primary px-3 text-card">
              <Plus className="size-4" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
});
