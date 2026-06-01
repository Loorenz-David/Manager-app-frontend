import { useEffect, useState } from "react";
import { useItemUpholsteryQuery } from "@beyo/tasks";

import { NumberInput } from "@/components/primitives";
import { useUpdateItem } from "@/features/items/actions/use-update-item";
import { useGetTaskQuery } from "@/features/tasks/api/use-get-task-query";
import {
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
} from "@/features/tasks/surfaces";
import type { ItemQuantitySurfaceProps } from "@/features/tasks/surfaces";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

export function ItemQuantitySheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, itemId, prefill } =
    useSurfaceProps<ItemQuantitySurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateItem = useUpdateItem(taskId ?? "");
  const item = taskQuery.data?.item;
  const upholsteryQuery = useItemUpholsteryQuery(itemId);
  const firstUpholstery = upholsteryQuery.data?.upholstery?.[0] ?? null;
  const [quantity, setQuantity] = useState(
    prefill?.quantity ?? item?.quantity ?? 0,
  );

  useEffect(() => {
    header?.setTitle("Edit quantity");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (prefill) return;
    setQuantity(item?.quantity ?? 0);
  }, [item?.quantity, prefill]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">Quantity</span>
        <NumberInput
          min={0}
          step={1}
          value={quantity}
          onValueChange={(value) => setQuantity(value ?? 0)}
        />
      </div>
      <button
        type="button"
        className="rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
        disabled={updateItem.isPending || !item || !itemId}
        onClick={() => {
          if (!item || !itemId) return;
          const quantityHasChanged = (item.quantity ?? 0) !== quantity;
          header?.requestClose();
          updateItem.mutate(
            {
              id: itemId as never,
              quantity,
            },
            {
              onSuccess: () => {
                if (!quantityHasChanged || !firstUpholstery) {
                  return;
                }

                window.setTimeout(() => {
                  useSurfaceStore
                    .getState()
                    .open(ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID, {
                      taskId: taskId ?? "",
                      itemUpholsteryId: firstUpholstery.client_id,
                      showQuantityChangedWarning: true,
                    });
                }, 380);
              },
              onError: () => {
                useSurfaceStore
                  .getState()
                  .open(ITEM_QUANTITY_SHEET_SURFACE_ID, {
                    taskId: taskId ?? "",
                    itemId,
                    prefill: { quantity },
                  });
              },
            },
          );
        }}
      >
        Save quantity
      </button>
    </div>
  );
}
