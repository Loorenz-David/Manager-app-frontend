import { cn } from "@beyo/lib";
import { StatePill, type StatePillVariant } from "@beyo/ui";

import type {
  HistoryBadge,
  HistoryBadgeKind,
  HistoryDeltaChip,
  HistoryTaskView,
} from "../lib/inventory-history";

/** Small presentational pieces shared by history entries and child rows. */

const BADGE_VARIANT: Record<HistoryBadgeKind, StatePillVariant> = {
  reconstructed: "neutral",
  clamped: "warning",
  chain_break: "danger",
};

export function HistoryDeltaChips({
  chips,
}: {
  chips: HistoryDeltaChip[];
}): React.JSX.Element | null {
  if (chips.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span
          key={chip.bucket}
          className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground"
          data-testid="inventory-history-delta-chip"
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function HistoryBadges({
  badges,
}: {
  badges: HistoryBadge[];
}): React.JSX.Element | null {
  if (badges.length === 0) return null;

  const details = badges.filter((badge) => badge.detail);

  return (
    <>
      <div className="mt-1 flex flex-wrap gap-1">
        {badges.map((badge) => (
          <StatePill
            key={badge.kind}
            label={badge.label}
            variant={BADGE_VARIANT[badge.kind]}
          />
        ))}
      </div>
      {details.map((badge) => (
        <p
          key={`${badge.kind}-detail`}
          className="mt-0.5 text-xs text-[#8a5a00]"
        >
          {badge.detail}
        </p>
      ))}
    </>
  );
}

export function HistoryTaskLabel({
  task,
  className,
}: {
  task: HistoryTaskView;
  className?: string;
}): React.JSX.Element {
  return (
    <span className={cn("min-w-0", className)}>
      {task.label}
      {task.isDeleted ? (
        <span className="ml-1 text-xs font-medium text-[#b9382a]">
          (deleted)
        </span>
      ) : null}
    </span>
  );
}
