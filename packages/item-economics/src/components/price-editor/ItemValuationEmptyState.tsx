export type ItemValuationEmptyStateProps = {
  /** What is missing and where to fix it — authored upstream per screen state. */
  message: string;
};

/**
 * The kept frame for S3 (unbound) and S5 (blocked): name the missing thing,
 * render no numbers, never collapse the card (intention §1.3).
 */
export function ItemValuationEmptyState({
  message,
}: ItemValuationEmptyStateProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center gap-3 px-6 py-12 text-center"
      data-testid="item-valuation-empty-state"
    >
      <p className="max-w-md text-lg text-muted-foreground">{message}</p>
    </div>
  );
}
