import { useState } from "react";

import { FloatingKeyboardBar, preventFocusSteal } from "@beyo/ui";
import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils";

import { useSetStoredAmount } from "../actions/use-set-stored-amount";
import { normalizeNonNegativeDecimalString } from "../lib/decimal";
import { useInventoryDetailContext } from "../providers/InventoryDetailProvider";

function Metric({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: { text: string; positive: boolean };
}): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-lg bg-muted/50 px-3 py-2">
      <dt className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <span className="truncate">{label}</span>
        {badge ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold leading-tight",
              badge.positive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {badge.text}
          </span>
        ) : null}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </dd>
    </div>
  );
}

export function InventoryQuantityOverview(): React.JSX.Element | null {
  const { inventoryId, detail } = useInventoryDetailContext();
  const setStoredAmount = useSetStoredAmount();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!detail) {
    return null;
  }

  const normalized = normalizeNonNegativeDecimalString(draft);

  function startEdit(): void {
    setDraft(detail!.raw?.current_stored_amount_meters ?? "");
    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEdit(): void {
    setIsEditing(false);
    setSaveError(null);
  }

  function handleSave(): void {
    if (normalized === null) {
      setSaveError("Enter a non-negative amount.");
      return;
    }
    setStoredAmount.mutate(
      { inventoryId, current_stored_amount_meters: normalized },
      {
        onSuccess: () => {
          setIsEditing(false);
          setSaveError(null);
        },
        onError: () => {
          setSaveError("Could not save. Try again.");
        },
      },
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      data-testid="upholstery-inventory-quantity-overview"
    >
      {isEditing ? (
        <FloatingKeyboardBar
          renderControls={({ inputRef }) => (
            <div className="flex flex-col gap-3 rounded-xl bg-background px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">
                Stored
              </span>

              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-foreground outline-none"
                  inputMode="decimal"
                  placeholder="0.000"
                  value={draft}
                  onChange={(event) => {
                    setSaveError(null);
                    setDraft(event.target.value);
                  }}
                />
                <span className="shrink-0 text-sm text-muted-foreground">
                  m
                </span>
              </div>

              {saveError ? (
                <p className="text-sm text-destructive">{saveError}</p>
              ) : null}

              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-2xl border border-border bg-card py-3 text-sm font-medium text-primary shadow-sm"
                  type="button"
                  onMouseDown={preventFocusSteal}
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-2xl bg-primary py-3 text-sm font-medium text-card disabled:opacity-40"
                  disabled={setStoredAmount.isPending || normalized === null}
                  type="button"
                  onMouseDown={preventFocusSteal}
                  onClick={handleSave}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        />
      ) : (
        <button
          className="flex items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 text-left"
          type="button"
          onClick={startEdit}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Stored
              </span>
              {detail.availableIsPositive ? (
                <span className="max-w-22 shrink-0 truncate rounded-full bg-emerald-200 px-1.5 py-px text-[10px] font-semibold leading-tight text-emerald-700">
                  +{detail.availableDisplay}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-2xl font-semibold text-foreground">
              {detail.storedDisplay}
            </p>
          </div>
          <Pencil aria-hidden="true" className="size-4 shrink-0 text-primary" />
        </button>
      )}

      <dl className="grid grid-cols-2 gap-2">
        <Metric label="Ordered" value={detail.orderedDisplay} />
        <Metric
          label="In need"
          value={detail.inNeedDisplay}
          badge={
            detail.availableIsNegative
              ? { text: detail.availableDisplay, positive: false }
              : undefined
          }
        />
        <Metric label="In use" value={detail.inUseDisplay} />
        <Metric label="Total used" value={detail.totalUsedDisplay} />
      </dl>
    </div>
  );
}
