import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils";

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
  const { detail, openStoredAmountEditor } = useInventoryDetailContext();

  if (!detail) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-3"
      data-testid="upholstery-inventory-quantity-overview"
    >
      <button
        className="flex items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 text-left"
        type="button"
        onClick={openStoredAmountEditor}
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
