import { cn } from "@beyo/lib";

export type ItemValuationFooterProps = {
  /** "Save 2 225 SEK / pc" — the amount is authored upstream. */
  saveLabel: string;
  isSaveDisabled: boolean;
  /** In-flight commit: keeps the button disabled and marks it busy. */
  isSavePending?: boolean;
  /** Why Save is disabled — rendered under the button (intention §1.4). */
  saveReason?: string | null;
  onSavePress: () => void;
  /** "Use suggested 2 025 SEK / pc" — null hides the row (no anchor). */
  suggestedLabel: string | null;
  onSuggestedPress?: () => void;
};

/** Save button + the tertiary use-suggested row. */
export function ItemValuationFooter({
  saveLabel,
  isSaveDisabled,
  isSavePending = false,
  saveReason = null,
  onSavePress,
  suggestedLabel,
  onSuggestedPress,
}: ItemValuationFooterProps): React.JSX.Element {
  const disabled = isSaveDisabled || isSavePending;

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        aria-busy={isSavePending}
        className={cn(
          "w-full rounded-2xl py-4 text-base font-semibold transition-colors",
          disabled
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-card",
        )}
        data-testid="item-valuation-save-button"
        disabled={disabled}
        onClick={onSavePress}
      >
        {saveLabel}
      </button>

      {saveReason ? (
        <p
          className="text-center text-sm text-muted-foreground"
          data-testid="item-valuation-save-reason"
        >
          {saveReason}
        </p>
      ) : null}

      {suggestedLabel ? (
        <button
          type="button"
          className="text-base font-medium text-foreground"
          data-testid="item-valuation-use-suggested"
          onClick={onSuggestedPress}
        >
          {suggestedLabel}
        </button>
      ) : null}
    </div>
  );
}
