import { useEffect, useState } from "react";
import { FloatingKeyboardBar } from "@beyo/ui";

import { useSetStoredAmount } from "../actions/use-set-stored-amount";
import { normalizeNonNegativeDecimalString } from "../lib/decimal";
import {
  STORED_AMOUNT_SHEET_ID,
  type StoredAmountSurfaceProps,
} from "../surfaces";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

export function StoredAmountSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { inventoryId, prefill } = useSurfaceProps<StoredAmountSurfaceProps>();
  const [draft, setDraft] = useState(prefill?.currentStoredAmountMeters ?? "");
  const [error, setError] = useState<string | null>(null);
  const setStoredAmount = useSetStoredAmount();

  useEffect(() => {
    header?.setTitle("Stored amount");
    header?.setActions(null);
  }, [header]);

  const normalized = normalizeNonNegativeDecimalString(draft);
  const canSave = Boolean(inventoryId) && normalized !== null;

  return (
    <div className="flex flex-col gap-4 p-6">
      <FloatingKeyboardBar
        renderControls={({ inputRef }) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Stored amount
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
          </div>
        )}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button
        className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
        disabled={setStoredAmount.isPending || !canSave}
        type="button"
        onClick={() => {
          if (!inventoryId || normalized === null) {
            setError("Enter a non-negative amount.");
            return;
          }

          setStoredAmount.mutate(
            {
              inventoryId,
              current_stored_amount_meters: normalized,
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
        }}
      >
        Save amount
      </button>
    </div>
  );
}
