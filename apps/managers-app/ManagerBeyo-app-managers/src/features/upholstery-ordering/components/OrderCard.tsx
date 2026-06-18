import { CalendarCheck, PackageCheck } from "lucide-react";

import { ImagePlaceholder, StatePill } from "@/components/primitives";

import type { OrderCardViewModel } from "../types";

type Props = {
  card: OrderCardViewModel;
  onOpen: (card: OrderCardViewModel) => void;
  onReceive: (card: OrderCardViewModel) => void;
};

export function OrderCard({
  card,
  onOpen,
  onReceive,
}: Props): React.JSX.Element {
  return (
    <div
      className="mx-4 flex flex-col overflow-hidden rounded-xl bg-card shadow-sm"
      data-testid={`upholstery-order-card-${card.orderId}`}
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
          <div className="mt-2">
            <StatePill
              label={card.stateLabel}
              variant={
                card.state === "partially_received" ? "warning" : "active"
              }
            />
          </div>
          <span className="mt-3 text-sm font-semibold text-foreground">
            {card.orderAmountLabel} ordered
          </span>
          <span className="text-xs text-muted-foreground">
            {card.remainingReceivableLabel} remaining
          </span>
          {card.dateLabel ? (
            <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarCheck aria-hidden="true" className="size-3.5" />
              {card.dateLabel}
            </span>
          ) : null}
        </button>
      </div>
      <div className="border-t border-border">
        <button
          className="flex w-full items-center gap-2 bg-primary px-4 py-4 text-left text-md font-medium text-card disabled:opacity-50"
          disabled={card.remainingReceivableMeters <= 0}
          type="button"
          onClick={() => onReceive(card)}
        >
          <PackageCheck aria-hidden="true" className="size-5 shrink-0" />
          <span>Receive order</span>
        </button>
      </div>
    </div>
  );
}
