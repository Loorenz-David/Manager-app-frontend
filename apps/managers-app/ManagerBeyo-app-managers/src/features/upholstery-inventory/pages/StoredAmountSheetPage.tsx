import { useEffect, useState } from "react";

import { FloatingKeyboardBar } from "@beyo/ui";
import Decimal from "decimal.js";

import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

import { useSetStoredAmount } from "../actions/use-set-stored-amount";
import { normalizeNonNegativeDecimalString, toDecimal } from "../lib/decimal";
import {
  STORED_AMOUNT_SHEET_ID,
  type StoredAmountSurfaceProps,
} from "../surfaces";

export function StoredAmountSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { inventoryId, prefill } = useSurfaceProps<StoredAmountSurfaceProps>();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const setStoredAmount = useSetStoredAmount();

  useEffect(() => {
    header?.setTitle("Add amount");
    header?.setActions(null);
  }, [header]);

  const normalized = normalizeNonNegativeDecimalString(draft);
  const canSave = Boolean(inventoryId) && normalized !== null;

  function handleSave(): void {
    if (!inventoryId || normalized === null) {
      setError("Enter a positive amount to add.");
      return;
    }

    const currentDecimal =
      toDecimal(prefill?.currentStoredAmountMeters ?? null) ?? new Decimal(0);
    const total = currentDecimal
      .plus(new Decimal(normalized))
      .toDecimalPlaces(3)
      .toFixed(3);

    setStoredAmount.mutate(
      {
        inventoryId,
        current_stored_amount_meters: total,
      },
      {
        onSuccess: () => {
          useSurfaceStore.getState().close(STORED_AMOUNT_SHEET_ID);
        },
        onError: () => {
          setError("Could not save. Please try again.");
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        {prefill?.imageUrl ? (
          <img
            alt=""
            className="size-10 shrink-0 rounded-full object-cover"
            src={prefill.imageUrl}
          />
        ) : (
          <div className="size-10 shrink-0 rounded-full bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          {prefill?.upholsteryName ? (
            <p className="truncate text-sm font-medium text-foreground">
              {prefill.upholsteryName}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {prefill?.storedDisplay ?? "—"}
          </p>
        </div>
      </div>

      <FloatingKeyboardBar
        renderControls={({ inputRef, preventFocusSteal }) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Amount to add
            </label>
            <div className="flex items-center rounded-2xl border border-border bg-card px-4 py-3">
              <input
                ref={inputRef}
                className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-foreground outline-none"
                inputMode="decimal"
                placeholder="0.000"
                value={draft}
                onChange={(event) => {
                  setError(null);
                  setDraft(event.target.value);
                }}
              />
              <span className="ml-3 shrink-0 text-sm text-muted-foreground">
                m
              </span>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <button
              className="mt-1 rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
              disabled={setStoredAmount.isPending || !canSave}
              type="button"
              onMouseDown={preventFocusSteal}
              onClick={handleSave}
            >
              Add amount
            </button>
          </div>
        )}
      />
    </div>
  );
}
