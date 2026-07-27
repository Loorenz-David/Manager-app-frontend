import { useState } from "react";
import type { RefObject } from "react";
import { generateClientId } from "@beyo/lib";

import { ImagePlaceholder } from "@/components/primitives";
import {
  AmountQuickAction,
  BackendImage,
  KeyboardFloatingCard,
} from "@beyo/ui";

import { useCreateUpholsteryOrder } from "../actions/use-create-upholstery-order";
import type { ShortageCardViewModel } from "../types";

type Props = {
  card: ShortageCardViewModel;
  onOpen: (card: ShortageCardViewModel) => void;
};

export function ShortageCard({ card, onOpen }: Props): React.JSX.Element {
  const createOrder = useCreateUpholsteryOrder();
  const [orderMeters, setOrderMeters] = useState<number | null>(
    card.totalAmountMeters,
  );
  const [isEditingAmount, setIsEditingAmount] = useState(false);

  function handleOrder(amount: number | null): void {
    if (amount === null || amount <= 0) return;
    createOrder.mutate({
      client_id: generateClientId("UpholsteryOrder"),
      upholstery_id: card.upholsteryId,
      order_amount_meters: amount,
      priority_item_upholstery_ids: [],
    });
  }

  function renderCard(
    inputRef?: RefObject<HTMLInputElement | null>,
  ): React.JSX.Element {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="mx-4 flex overflow-hidden rounded-xl bg-card shadow-sm"
          data-testid={`upholstery-shortage-card-${card.upholsteryId}`}
        >
          <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted">
            <BackendImage
              className="size-full object-cover"
              fallback={
                <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
              }
              src={card.imageUrl}
            />
          </div>
          <button
            className="flex min-w-0 flex-1 flex-col px-3 py-2.5 text-left"
            type="button"
            onClick={() => onOpen(card)}
          >
            <span className="truncate text-base font-semibold text-foreground">
              {card.name}
            </span>
            <span className="mt-0.5 truncate text-sm text-muted-foreground">
              {card.code ?? "No code"}
            </span>

            {/* Single column: the phone is too narrow to keep the meta beside
             * the figure, so it sits on its own line underneath. */}
            <div className="mt-2.5 flex min-w-0 flex-col gap-1 rounded-xl border border-border/70 bg-soft-container px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Needed
                </span>
                <span className="flex shrink-0 items-baseline gap-1 text-foreground">
                  <span className="text-2xl font-bold leading-none">
                    {card.totalAmountValueLabel}
                  </span>
                  <span className="text-lg font-semibold leading-none">m</span>
                </span>
              </div>
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                {card.itemCount} item{card.itemCount === 1 ? "" : "s"}
                {card.earliestDueDateLabel
                  ? ` · by ${card.earliestDueDateLabel}`
                  : ""}
              </span>
            </div>
          </button>
        </div>

        <div className="mx-4">
          <AmountQuickAction
            actionLabel="Order"
            inputRef={inputRef}
            isActionDisabled={orderMeters !== null && orderMeters <= 0}
            isEditing={isEditingAmount}
            isPending={createOrder.isPending}
            label="Order"
            onAction={handleOrder}
            onEditingChange={setIsEditingAmount}
            onValueChange={setOrderMeters}
            pendingLabel="Ordering..."
            testId={`upholstery-shortage-order-${card.upholsteryId}`}
            value={orderMeters}
          />
        </div>
      </div>
    );
  }

  // Editing the amount docks the whole card above the keyboard.
  return (
    <KeyboardFloatingCard
      isFloating={isEditingAmount}
      onKeyboardDismissed={() => setIsEditingAmount(false)}
    >
      {(inputRef) => renderCard(inputRef)}
    </KeyboardFloatingCard>
  );
}
