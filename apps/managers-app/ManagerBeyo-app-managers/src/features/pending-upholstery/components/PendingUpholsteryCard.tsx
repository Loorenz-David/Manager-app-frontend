import { useEffect } from "react";
import { generateClientId } from "@beyo/lib";

import ThreadIcon from "@/assets/icons/thread-svgrepo-com.svg?react";
import { TaskListCard } from "@/features/tasks/components/TaskListCard";

import { usePendingUpholsteryCreate } from "../actions/use-pending-upholstery-create";
import { usePendingUpholsteryUpdate } from "../actions/use-pending-upholstery-update";
import type { PendingSeatCardViewModel } from "../types";

type PendingUpholsteryCardProps = {
  card: PendingSeatCardViewModel;
  onTapImage: (card: PendingSeatCardViewModel) => void;
  onTapActions: (taskId: string) => void;
  onTapCard: (taskId: string) => void;
  onOpenUpholsteryPicker: (
    onSelect: (upholsteryClientId: string) => void,
  ) => void;
  onOpenAmountSheet: (taskId: string, itemUpholsteryId: string) => void;
};

export function PendingUpholsteryCard({
  card,
  onTapImage,
  onTapActions,
  onTapCard,
  onOpenUpholsteryPicker,
  onOpenAmountSheet,
}: PendingUpholsteryCardProps): React.JSX.Element {
  const createUpholstery = usePendingUpholsteryCreate(
    card.primaryItem?.id ?? null,
  );
  const updateUpholstery = usePendingUpholsteryUpdate(
    card.primaryItem?.id ?? null,
  );
  const isMissingQuantityContractViolation =
    card.pendingReason === "missing_quantity" && !card.itemUpholsteryId;
  const isPending = createUpholstery.isPending || updateUpholstery.isPending;
  const actionLabel =
    card.pendingReason === "missing_selection"
      ? "Select upholstery"
      : "Set upholstery amount";

  useEffect(() => {
    if (import.meta.env.DEV && isMissingQuantityContractViolation) {
      console.error(
        "[PendingUpholsteryCard] missing_quantity row has no itemUpholsteryId - backend contract violation",
        card.taskId,
      );
    }
  }, [card.taskId, isMissingQuantityContractViolation]);

  function handleDirectAction(): void {
    if (card.pendingReason === "missing_quantity") {
      if (!card.itemUpholsteryId) return;
      onOpenAmountSheet(card.taskId, card.itemUpholsteryId);
      return;
    }

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

  return (
    <TaskListCard
      bottomAction={
        <button
          aria-label={actionLabel}
          className="flex w-full bg-primary items-center gap-2 px-4 py-4 text-left text-md font-medium text-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          disabled={
            isPending || !card.primaryItem || isMissingQuantityContractViolation
          }
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleDirectAction();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.stopPropagation();
            }
          }}
        >
          <ThreadIcon aria-hidden="true" className="size-6 shrink-0" />
          <span>{isPending ? "Saving..." : actionLabel}</span>
        </button>
      }
      card={{
        taskId: card.taskId,
        task: card.task,
        item: card.primaryItem,
        firstImage: card.firstImage,
        imageCount: card.images.length,
      }}
      onTapActions={onTapActions}
      onTapCard={onTapCard}
      onTapImage={() => onTapImage(card)}
    />
  );
}
