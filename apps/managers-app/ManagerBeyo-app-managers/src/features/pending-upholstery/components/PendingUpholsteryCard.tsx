import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { ChevronRight } from "lucide-react";
import { generateClientId } from "@beyo/lib";
import { TaskListCard } from "@beyo/tasks";
import {
  AmountQuickAction,
  BackendImage,
  ImagePlaceholder,
  KeyboardFloatingCard,
} from "@beyo/ui";
import { getUpholsteryImageUrl } from "@beyo/upholstery";

import { usePendingUpholsteryCreate } from "../actions/use-pending-upholstery-create";
import { usePendingUpholsterySetAmount } from "../actions/use-pending-upholstery-set-amount";
import { usePendingUpholsteryUpdate } from "../actions/use-pending-upholstery-update";
import type { PendingSeatCardViewModel } from "../types";

const AMOUNT_STEP = 0.25;

// Decorative fabric-tone swatches for the "Select upholstery" action.
const SELECT_SWATCH_COLORS = ["#b7c3a8", "#c79a62", "#68778c"] as const;

type PendingUpholsteryCardProps = {
  card: PendingSeatCardViewModel;
  onTapImage: (card: PendingSeatCardViewModel) => void;
  onTapActions: (taskId: string) => void;
  onTapCard: (taskId: string) => void;
  onOpenUpholsteryPicker: (
    onSelect: (upholsteryClientId: string) => void,
  ) => void;
};

export function PendingUpholsteryCard({
  card,
  onTapImage,
  onTapActions,
  onTapCard,
  onOpenUpholsteryPicker,
}: PendingUpholsteryCardProps): React.JSX.Element {
  const createUpholstery = usePendingUpholsteryCreate(
    card.primaryItem?.id ?? null,
  );
  const updateUpholstery = usePendingUpholsteryUpdate(
    card.primaryItem?.id ?? null,
  );
  const setAmount = usePendingUpholsterySetAmount(card.primaryItem?.id ?? null);
  const serverAmountMeters = card.upholstery?.amountMeters ?? null;
  const [amountMeters, setAmountMeters] = useState<number | null>(
    serverAmountMeters,
  );
  const [lastServerAmountMeters, setLastServerAmountMeters] = useState<
    number | null
  >(serverAmountMeters);

  // Refetches can land a new server amount (e.g. edited from the sheet);
  // adopt it over any stale local stepper value.
  if (serverAmountMeters !== lastServerAmountMeters) {
    setLastServerAmountMeters(serverAmountMeters);
    setAmountMeters(serverAmountMeters);
  }
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const isMissingQuantityContractViolation =
    card.pendingReason === "missing_quantity" && !card.itemUpholsteryId;
  const isSelectionPending =
    createUpholstery.isPending || updateUpholstery.isPending;

  useEffect(() => {
    if (import.meta.env.DEV && isMissingQuantityContractViolation) {
      console.error(
        "[PendingUpholsteryCard] missing_quantity row has no itemUpholsteryId - backend contract violation",
        card.taskId,
      );
    }
  }, [card.taskId, isMissingQuantityContractViolation]);

  function handleSelectUpholstery(): void {
    const primaryItem = card.primaryItem;
    if (!primaryItem) return;

    if (card.itemUpholsteryId) {
      const existingId = card.itemUpholsteryId;
      onOpenUpholsteryPicker((upholsteryClientId) => {
        updateUpholstery.mutate({
          taskId: card.taskId,
          itemUpholsteryId: existingId,
          upholstery_id: upholsteryClientId,
        });
      });
      return;
    }

    onOpenUpholsteryPicker((upholsteryClientId) => {
      createUpholstery.mutate({
        taskId: card.taskId,
        client_id: generateClientId("ItemUpholstery"),
        item_id: primaryItem.id,
        upholstery_id: upholsteryClientId,
        source: "internal",
      });
    });
  }

  function handleSaveAmount(amount: number | null): void {
    if (!card.itemUpholsteryId || amount === null) return;
    setAmount.mutate({
      taskId: card.taskId,
      itemUpholsteryId: card.itemUpholsteryId,
      amount_meters: amount,
    });
  }

  const upholsteryThumbnailUrl = card.upholstery
    ? getUpholsteryImageUrl(card.upholstery.imageUrl, {
        width: 40,
        height: 40,
        fillCanvas: true,
      })
    : null;

  function renderDetachedAction(
    inputRef?: RefObject<HTMLInputElement | null>,
  ): React.JSX.Element {
    return card.pendingReason === "missing_selection" ? (
      <button
        aria-label="Select upholstery"
        className="flex w-full items-center gap-3 rounded-2xl border border-[#b8d9ff] bg-[#eaf4ff] px-3 py-3 text-left shadow-sm transition active:bg-[#ddeeff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        data-testid={`pending-upholstery-select-${card.taskId}`}
        disabled={isSelectionPending || !card.primaryItem}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          handleSelectUpholstery();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.stopPropagation();
          }
        }}
      >
        <span aria-hidden="true" className="flex shrink-0">
          {SELECT_SWATCH_COLORS.map((color, index) => (
            <span
              key={color}
              className={`h-9 w-8 rounded-md ${index > 0 ? "-ml-1" : ""}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
        <span className="flex-1 text-base font-bold text-[#1e3a5f]">
          {isSelectionPending ? "Saving..." : "Select upholstery"}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-[#1f5ea8]"
        />
      </button>
    ) : (
      <AmountQuickAction
        actionLabel="Save"
        inputRef={inputRef}
        isActionDisabled={isMissingQuantityContractViolation}
        isEditing={isEditingAmount}
        isPending={setAmount.isPending}
        label="Amount"
        onAction={handleSaveAmount}
        onEditingChange={setIsEditingAmount}
        onValueChange={setAmountMeters}
        step={AMOUNT_STEP}
        testId={`pending-upholstery-amount-${card.taskId}`}
        value={amountMeters}
      />
    );
  }

  function renderCard(
    inputRef?: RefObject<HTMLInputElement | null>,
  ): React.JSX.Element {
    return (
      <TaskListCard
        bodyExtra={
          card.upholstery ? (
            <div
              className="mt-2.5 flex min-w-0 items-center gap-2.5"
              data-testid={`pending-upholstery-fabric-${card.taskId}`}
            >
              <BackendImage
                alt={card.upholstery.name ?? "Upholstery"}
                className="size-9 shrink-0 rounded-lg bg-muted object-cover"
                fallback={
                  <div className="size-9 shrink-0 overflow-hidden rounded-lg">
                    <ImagePlaceholder />
                  </div>
                }
                src={upholsteryThumbnailUrl}
              />
              <span className="min-w-0 truncate text-xs font-semibold text-foreground">
                {card.upholstery.name ?? "Upholstery selected"}
              </span>
            </div>
          ) : undefined
        }
        detachedAction={renderDetachedAction(inputRef)}
        imageUrl={
          card.firstImage
            ? (card.firstImage.localObjectUrl ?? card.firstImage.imageUrl)
            : null
        }
        item={
          card.primaryItem
            ? {
                itemId: card.primaryItem.id,
                article_number: card.primaryItem.article_number,
                sku: card.primaryItem.sku,
                item_major_category_snapshot:
                  card.primaryItem.item_major_category_snapshot,
                quantity: card.primaryItem.quantity,
              }
            : null
        }
        onTapActions={onTapActions}
        onTapCard={onTapCard}
        onTapImage={() => onTapImage(card)}
        task={{
          task_type: card.task.task_type,
          state: card.task.state,
          return_source: card.task.return_source,
          ready_by_at: card.task.ready_by_at,
          is_overdue: card.task.is_overdue,
        }}
        taskId={card.taskId}
      />
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
