import { Calendar, PackagePlus } from "lucide-react";

import { ImagePlaceholder } from "@/components/primitives";

import type { ShortageCardViewModel } from "../types";

type Props = {
  card: ShortageCardViewModel;
  onOpen: (card: ShortageCardViewModel) => void;
  onCreate: (card: ShortageCardViewModel) => void;
};

export function ShortageCard({
  card,
  onOpen,
  onCreate,
}: Props): React.JSX.Element {
  return (
    <div
      className="mx-4 flex flex-col overflow-hidden rounded-xl bg-card shadow-sm"
      data-testid={`upholstery-shortage-card-${card.upholsteryId}`}
    >
      <div className="flex">
        <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted">
          {card.imageUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              src={card.imageUrl}
            />
          ) : (
            <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
          )}
        </div>
        <button
          className="flex min-w-0 flex-1 flex-col px-3 py-2.5 text-left"
          type="button"
          onClick={() => onOpen(card)}
        >
          <span className="truncate text-sm font-medium text-foreground">
            {card.name}
          </span>
          <span className="mt-1 truncate text-xs text-muted-foreground">
            {card.code ?? "No code"}
          </span>
          <span className="mt-3 text-sm font-semibold text-foreground">
            {card.totalAmountLabel} needed
          </span>
          <span className="text-xs text-muted-foreground">
            {card.itemCount} contributing item{card.itemCount === 1 ? "" : "s"}
          </span>
          {card.earliestDueDateLabel ? (
            <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar aria-hidden="true" className="size-3.5" />
              {card.earliestDueDateLabel}
            </span>
          ) : null}
        </button>
      </div>
      <div className="border-t border-border">
        <button
          className="flex w-full items-center gap-2 bg-primary px-4 py-4 text-left text-md font-medium text-card"
          type="button"
          onClick={() => onCreate(card)}
        >
          <PackagePlus aria-hidden="true" className="size-5 shrink-0" />
          <span>Order {card.totalAmountLabel}</span>
        </button>
      </div>
    </div>
  );
}
