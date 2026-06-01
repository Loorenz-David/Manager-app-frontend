import { useEffect, useMemo, useState } from "react";

import { TextInput } from "@/components/primitives";
import { useUpdateItem } from "@/features/items/actions/use-update-item";
import { useGetTaskQuery } from "@/features/tasks/api/use-get-task-query";
import {
  ITEM_POSITION_SHEET_SURFACE_ID,
  type ItemPositionSurfaceProps,
} from "@/features/tasks/surfaces";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

function parseStoredPosition(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function ItemPositionSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, itemId, prefill } =
    useSurfaceProps<ItemPositionSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateItem = useUpdateItem(taskId ?? "");
  const item = taskQuery.data?.item;

  const parsedItemPosition = useMemo(
    () => parseStoredPosition(item?.item_position),
    [item?.item_position],
  );

  const [position, setPosition] = useState<number | null>(
    prefill?.position ?? parsedItemPosition,
  );

  useEffect(() => {
    header?.setTitle("Edit position");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (prefill) {
      return;
    }

    setPosition(parsedItemPosition);
  }, [parsedItemPosition, prefill]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">Position</span>
        <TextInput
          data-testid="item-position-input"
          inputMode="numeric"
          pattern="[0-9]*"
          value={position ?? ""}
          onChange={(event) => {
            const next = event.target.value;

            if (next === "") {
              setPosition(null);
              return;
            }

            if (!/^\d+$/.test(next)) {
              return;
            }

            const parsed = Number.parseInt(next, 10);
            if (!Number.isNaN(parsed)) {
              setPosition(parsed);
            }
          }}
        />
      </div>
      <button
        data-testid="item-position-save-button"
        type="button"
        className="rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
        disabled={updateItem.isPending || !item || !itemId}
        onClick={() => {
          if (!item || !itemId) {
            return;
          }

          header?.requestClose();
          updateItem.mutate(
            {
              id: itemId as never,
              item_position: position != null ? String(position) : null,
            },
            {
              onError: () => {
                useSurfaceStore
                  .getState()
                  .open(ITEM_POSITION_SHEET_SURFACE_ID, {
                    taskId: taskId ?? "",
                    itemId,
                    prefill: { position },
                  });
              },
            },
          );
        }}
      >
        Save position
      </button>
    </div>
  );
}
