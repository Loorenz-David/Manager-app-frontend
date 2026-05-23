import { useEffect, useState } from 'react';

import { NumberInput } from '@/components/primitives';
import { useUpdateItem } from '@/features/items/actions/use-update-item';
import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import type { ItemQuantitySurfaceProps } from '@/features/tasks/surfaces';
import { useSurface } from '@/hooks/use-surface';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

export function ItemQuantitySheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { taskId, itemId } = useSurfaceProps<ItemQuantitySurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? '');
  const updateItem = useUpdateItem(taskId ?? '');
  const item = taskQuery.data?.item;
  const [quantity, setQuantity] = useState(item?.quantity ?? 0);

  useEffect(() => {
    header?.setTitle('Edit quantity');
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    setQuantity(item?.quantity ?? 0);
  }, [item?.quantity]);

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
          updateItem.mutate(
            {
              id: itemId as never,
              quantity,
            },
            {
              onSuccess: () => surface.closeTop(),
            },
          );
        }}
      >
        Save quantity
      </button>
    </div>
  );
}
