import { useEffect, useMemo, useState } from 'react';

import { NumberInput } from '@/components/primitives';
import { useSetUpholsteryQuantity } from '@/features/items/actions/use-set-upholstery-quantity';
import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import { ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID } from '@/features/tasks/surfaces';
import type { ItemUpholsteryAmountSurfaceProps } from '@/features/tasks/surfaces';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

function roundToFourDecimals(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function ItemUpholsteryAmountSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, itemUpholsteryId, prefill } = useSurfaceProps<ItemUpholsteryAmountSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? '');
  const setUpholsteryQuantity = useSetUpholsteryQuantity(taskId ?? '');

  const requirementsById = useMemo(() => {
    const entries = taskQuery.data?.requirements ?? [];
    return new Map<string, (typeof entries)[number]>(entries.map((entry) => [entry.client_id, entry]));
  }, [taskQuery.data?.requirements]);

  const activeUpholstery = useMemo(
    () =>
      (taskQuery.data?.item_upholstery ?? []).map((entry) => ({
        ...entry,
        activeRequirement: entry.active_requirement_id
          ? (requirementsById.get(entry.active_requirement_id) ?? null)
          : null,
      })),
    [requirementsById, taskQuery.data?.item_upholstery],
  );

  const upholstery = useMemo(
    () => activeUpholstery.find((entry) => entry.client_id === itemUpholsteryId) ?? null,
    [activeUpholstery, itemUpholsteryId],
  );

  const resolvedAmount = upholstery?.activeRequirement?.amount_meters ?? upholstery?.amount_meters ?? null;
  const [amountMeters, setAmountMeters] = useState<number | null>(
    prefill?.amountMeters ?? resolvedAmount,
  );

  useEffect(() => {
    header?.setTitle('Edit upholstery amount');
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (prefill) return;
    setAmountMeters(upholstery?.activeRequirement?.amount_meters ?? upholstery?.amount_meters ?? null);
  }, [prefill, upholstery?.activeRequirement?.amount_meters, upholstery?.amount_meters]);

  function applyMultiplier(factor: number): void {
    setAmountMeters((current) =>
      current === null ? factor : roundToFourDecimals(current * factor),
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">
          Amount <span className="font-normal">(optional)</span>
        </label>
        <NumberInput
          allowDecimal
          min={0}
          placeholder="e.g. 2.5"
          step={0.25}
          unitLabel="m"
          value={amountMeters}
          onValueChange={(next) => setAmountMeters(next ?? null)}
        />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
            onClick={() => applyMultiplier(0.25)}
          >
            × 0.25
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
            onClick={() => applyMultiplier(0.5)}
          >
            × 0.5
          </button>
        </div>
      </div>
      <button
        type="button"
        className="rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
        disabled={setUpholsteryQuantity.isPending || !upholstery}
        onClick={() => {
          if (!upholstery) return;
          header?.requestClose();
          setUpholsteryQuantity.mutate(
            {
              itemUpholsteryId: upholstery.client_id,
              amount_meters: amountMeters ?? 0,
            },
            {
              onError: () => {
                useSurfaceStore.getState().open(
                  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
                  {
                    taskId: taskId ?? '',
                    itemUpholsteryId: upholstery.client_id,
                    prefill: { amountMeters },
                  },
                );
              },
            },
          );
        }}
      >
        Save amount
      </button>
    </div>
  );
}
