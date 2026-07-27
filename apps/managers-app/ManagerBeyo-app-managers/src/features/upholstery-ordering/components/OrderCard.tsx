import { useState } from "react";
import type { RefObject } from "react";
import { CalendarCheck } from "lucide-react";

import { ImagePlaceholder, StatePill } from "@/components/primitives";
import {
  AmountQuickAction,
  BackendImage,
  KeyboardFloatingCard,
} from "@beyo/ui";

import { useReceiveUpholsteryOrder } from "../actions/use-receive-upholstery-order";
import type { OrderCardViewModel } from "../types";

type Props = {
  card: OrderCardViewModel;
  onOpen: (card: OrderCardViewModel) => void;
};

export function OrderCard({ card, onOpen }: Props): React.JSX.Element {
  const receiveOrder = useReceiveUpholsteryOrder();
  const [receivedMeters, setReceivedMeters] = useState<number | null>(
    card.remainingReceivableMeters,
  );
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [lastRemaining, setLastRemaining] = useState(
    card.remainingReceivableMeters,
  );
  const hasNothingLeft = card.remainingReceivableMeters <= 0;

  // A partial receive lowers what is still outstanding; follow it rather than
  // keeping the stale amount the user last staged.
  if (card.remainingReceivableMeters !== lastRemaining) {
    setLastRemaining(card.remainingReceivableMeters);
    setReceivedMeters(card.remainingReceivableMeters);
  }

  function handleReceive(amount: number | null): void {
    if (amount === null || amount <= 0) return;
    receiveOrder.mutate({
      client_id: card.orderId,
      received_amount_meters: amount,
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
          data-testid={`upholstery-order-card-${card.orderId}`}
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
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
                {card.name}
              </span>
              <StatePill
                label={card.stateLabel}
                variant={
                  card.state === "partially_received" ? "warning" : "active"
                }
              />
            </div>
            <span className="mt-0.5 truncate text-sm text-muted-foreground">
              {card.code ?? "No code"}
            </span>

            {/* Single column: the phone is too narrow to keep the meta beside
             * the figure, so it sits on its own line underneath. */}
            <div className="mt-2.5 flex min-w-0 flex-col gap-1 rounded-xl border border-border/70 bg-soft-container px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 text-[0.6875rem] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
                  Awaiting
                </span>
                <span className="flex shrink-0 items-baseline gap-1 text-foreground">
                  <span className="text-2xl font-bold leading-none">
                    {card.remainingReceivableValueLabel}
                  </span>
                  <span className="text-lg font-semibold leading-none">m</span>
                </span>
              </div>
              <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <span className="truncate">
                  {card.orderAmountLabel} ordered
                </span>
                {card.dateLabel ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <CalendarCheck
                      aria-hidden="true"
                      className="size-3 shrink-0"
                    />
                    <span className="truncate">{card.dateLabel}</span>
                  </>
                ) : null}
              </span>
            </div>
          </button>
        </div>

        <div className="mx-4">
          <AmountQuickAction
            actionLabel="Receive"
            inputRef={inputRef}
            isActionDisabled={hasNothingLeft}
            isEditing={isEditingAmount}
            isPending={receiveOrder.isPending}
            label="Received"
            max={card.remainingReceivableMeters}
            onAction={handleReceive}
            onEditingChange={setIsEditingAmount}
            onValueChange={setReceivedMeters}
            pendingLabel="Saving..."
            testId={`upholstery-order-receive-${card.orderId}`}
            tone="green"
            value={receivedMeters}
          />
        </div>
      </div>
    );
  }

  // Editing the received amount docks the whole card above the keyboard.
  return (
    <KeyboardFloatingCard
      isFloating={isEditingAmount}
      onKeyboardDismissed={() => setIsEditingAmount(false)}
    >
      {(inputRef) => renderCard(inputRef)}
    </KeyboardFloatingCard>
  );
}
