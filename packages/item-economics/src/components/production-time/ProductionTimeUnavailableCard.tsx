export type ProductionTimeUnavailableCardProps = {
  reason: "detached" | "mismatched";
};

const REASON_COPY: Record<"detached" | "mismatched", string> = {
  detached: "This task is no longer linked to an item, so its production time cannot be worked out.",
  mismatched: "This task's item was swapped, so its production time cannot be worked out.",
};

/**
 * The task lost or swapped its primary item. An empty state — never the numbers
 * from the item it used to point at.
 */
export function ProductionTimeUnavailableCard({
  reason,
}: ProductionTimeUnavailableCardProps): React.JSX.Element {
  return (
    <p
      className="px-4 py-6 text-sm text-muted-foreground"
      data-testid="production-time-unavailable"
    >
      {REASON_COPY[reason]}
    </p>
  );
}
