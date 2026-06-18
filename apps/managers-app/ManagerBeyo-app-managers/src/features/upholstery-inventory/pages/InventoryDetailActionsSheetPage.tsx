import { useEffect } from "react";

import { ConfirmActionButton } from "@/components/primitives";
import { useSurface } from "@/hooks/use-surface";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";

import { useDeleteUpholsteryInventory } from "../actions/use-delete-upholstery-inventory";
import {
  INVENTORY_DETAIL_ACTIONS_SHEET_ID,
  INVENTORY_DETAIL_SLIDE_ID,
  type InventoryDetailActionsSurfaceProps,
} from "../surfaces";

export function InventoryDetailActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { inventoryId } =
    useSurfaceProps<InventoryDetailActionsSurfaceProps>();
  const deleteInventory = useDeleteUpholsteryInventory();

  useEffect(() => {
    header?.setTitle("Inventory actions");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col gap-3 p-6">
      <ConfirmActionButton
        className="w-full"
        confirmLabel="Tap again to delete"
        disabled={deleteInventory.isPending}
        fillColor="var(--color-destructive)"
        label="Delete inventory"
        onConfirm={() => {
          if (!inventoryId) return;
          deleteInventory.mutate(inventoryId, {
            onSuccess: () => {
              surface.close(INVENTORY_DETAIL_ACTIONS_SHEET_ID);
              surface.close(INVENTORY_DETAIL_SLIDE_ID);
            },
          });
        }}
      />
    </div>
  );
}
