import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  useItemUpholsteryQuery,
  type UpholsteryRequirementEntry,
} from "@beyo/tasks";

import { NumberInput } from "@/components/primitives";
import { useSetUpholsteryQuantity } from "@/features/items/actions/use-set-upholstery-quantity";
import { useGetTaskQuery } from "@/features/tasks/api/use-get-task-query";
import { ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID } from "@/features/tasks/surfaces";
import type { ItemUpholsteryAmountSurfaceProps } from "@/features/tasks/surfaces";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

function roundToFourDecimals(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

type MultiplierFactor = 0.25 | 0.5;

function getComputedAmount(
  quantity: number | null | undefined,
  factor: MultiplierFactor,
): number {
  return roundToFourDecimals((quantity ?? 0) * factor);
}

export function ItemUpholsteryAmountSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, itemUpholsteryId, prefill, showQuantityChangedWarning } =
    useSurfaceProps<ItemUpholsteryAmountSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const itemId = taskQuery.data?.item?.client_id ?? null;
  const upholsteryQuery = useItemUpholsteryQuery(itemId);
  const setUpholsteryQuantity = useSetUpholsteryQuantity(taskId ?? "", itemId);

  const requirementsById = useMemo(() => {
    const entries = upholsteryQuery.data?.requirements ?? [];
    return new Map<string, UpholsteryRequirementEntry>(
      entries.map((entry) => [entry.client_id, entry]),
    );
  }, [upholsteryQuery.data?.requirements]);

  const upholstery = useMemo(() => {
    const entry =
      (upholsteryQuery.data?.upholstery ?? []).find(
        (candidate) => candidate.client_id === itemUpholsteryId,
      ) ?? null;

    if (!entry) {
      return null;
    }

    return {
      ...entry,
      activeRequirement: entry.active_requirement_id
        ? (requirementsById.get(entry.active_requirement_id) ?? null)
        : null,
    };
  }, [requirementsById, upholsteryQuery.data?.upholstery, itemUpholsteryId]);

  const resolvedAmount =
    upholstery?.activeRequirement?.amount_meters ??
    upholstery?.amount_meters ??
    null;
  const [amountMeters, setAmountMeters] = useState<number | null>(
    prefill?.amountMeters ?? resolvedAmount,
  );
  const [selectedFactor, setSelectedFactor] = useState<MultiplierFactor | null>(
    null,
  );
  const quantity = taskQuery.data?.item?.quantity ?? 0;

  useEffect(() => {
    header?.setTitle("Edit upholstery amount");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (prefill) return;
    setAmountMeters(
      upholstery?.activeRequirement?.amount_meters ??
        upholstery?.amount_meters ??
        null,
    );
  }, [
    prefill,
    upholstery?.activeRequirement?.amount_meters,
    upholstery?.amount_meters,
  ]);

  useEffect(() => {
    if (selectedFactor === null) {
      return;
    }

    setAmountMeters(getComputedAmount(quantity, selectedFactor));
  }, [quantity, selectedFactor]);

  function applyMultiplier(factor: MultiplierFactor): void {
    setSelectedFactor(factor);
    setAmountMeters(getComputedAmount(quantity, factor));
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {showQuantityChangedWarning ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-amber-900">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <p
            className="text-sm leading-snug"
            data-testid="item-upholstery-amount-quantity-warning"
          >
            Quantity changed. Review the upholstery amount so it stays coherent
            with the new quantity.
          </p>
        </div>
      ) : null}
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
          onValueChange={(next) => {
            setSelectedFactor(null);
            setAmountMeters(next ?? null);
          }}
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
                useSurfaceStore
                  .getState()
                  .open(ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID, {
                    taskId: taskId ?? "",
                    itemUpholsteryId: upholstery.client_id,
                    prefill: { amountMeters },
                  });
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
