import { Calendar, Check } from "lucide-react";
import { cn } from "@beyo/lib";
import {
  RETURN_SOURCE_LABEL,
  TASK_TYPE_ICON,
  TASK_TYPE_LABEL,
} from "@beyo/tasks";

import { ImagePlaceholder } from "@/components/primitives";
import type { Item } from "@/features/items/types";

import type { OrderingItemCardViewModel } from "../types";

type Props = {
  card: OrderingItemCardViewModel;
  selected: boolean;
  onToggle: (itemUpholsteryId: string) => void;
  onOpenTask: (taskId: string) => void;
  onOpenImage: (card: OrderingItemCardViewModel) => void;
};

function getQuantityPillLabel(item: Item | null): string | null {
  if (!item) {
    return null;
  }

  if (item.item_major_category_snapshot?.toLowerCase() === "seat") {
    return `#${item.quantity}`;
  }

  return null;
}

export function OrderingItemCard({
  card,
  selected,
  onToggle,
  onOpenTask,
  onOpenImage,
}: Props): React.JSX.Element {
  const imageUrl = card.firstImage
    ? (card.firstImage.localObjectUrl ?? card.firstImage.imageUrl)
    : null;
  const articleLabel = card.primaryItem
    ? card.primaryItem.article_number
      ? `#${card.primaryItem.article_number}`
      : (card.primaryItem.sku ?? "Article number missing")
    : "No item linked";
  const TypeIcon = TASK_TYPE_ICON[card.task.task_type];
  const typeLabel = TASK_TYPE_LABEL[card.task.task_type];
  const returnSourceLabel = card.task.return_source
    ? RETURN_SOURCE_LABEL[card.task.return_source]
    : null;
  const quantityPillLabel = getQuantityPillLabel(card.primaryItem);

  return (
    <div
      className={cn(
        "mx-4 flex overflow-hidden rounded-xl bg-card shadow-sm ring-1",
        selected ? "ring-primary" : "ring-transparent",
      )}
      data-testid={`upholstery-ordering-item-${card.itemUpholsteryId}`}
    >
      <button
        aria-label="View item image"
        className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted"
        type="button"
        onClick={() => onOpenImage(card)}
      >
        {imageUrl ? (
          <img alt="" className="size-full object-cover" src={imageUrl} />
        ) : (
          <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
        )}
        {quantityPillLabel ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
            {quantityPillLabel}
          </span>
        ) : null}
      </button>
      <button
        className="flex min-w-0 flex-1 flex-col px-3 py-2.5 text-left"
        type="button"
        onClick={() => onOpenTask(card.taskId)}
      >
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {articleLabel}
          </span>
        </div>
        <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {typeLabel}
            {returnSourceLabel ? ` • ${returnSourceLabel}` : ""}
          </span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <span className="text-sm font-semibold text-foreground">
            {card.amountLabel ?? "No amount"}
          </span>
          {card.dueDateLabel ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar aria-hidden="true" className="size-3.5" />
              {card.dueDateLabel}
            </span>
          ) : null}
        </div>
      </button>
      <button
        aria-label={selected ? "Deselect item" : "Select item"}
        aria-pressed={selected}
        className={cn(
          "flex w-14 shrink-0 items-center justify-center border-l border-border",
          selected ? "bg-primary text-card" : "text-muted-foreground",
        )}
        type="button"
        onClick={() => onToggle(card.itemUpholsteryId)}
      >
        <Check aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
