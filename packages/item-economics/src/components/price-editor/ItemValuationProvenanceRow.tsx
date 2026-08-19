import { Avatar } from "@beyo/ui";

export type ItemValuationProvenanceRowProps = {
  /**
   * "dash" renders the grey no-author circle of the unpriced states;
   * "user" renders an Avatar from `avatarName` / `avatarImageSrc`.
   */
  avatarKind: "dash" | "user";
  /**
   * Pre-resolved upstream (projection L20/L23): the controller substitutes
   * "You" for the signed-in user and passes "" for an unloadable author —
   * this component never compares ids.
   */
  avatarName?: string;
  avatarImageSrc?: string | null;
  /** Bold lead: "You", "Marta Lind", "No price set". */
  label: string;
  /** Muted tail: "unsaved change · just now", "purchase price needed first"… */
  detail: string | null;
  /** "Back to 1 625" — null hides the toggle (M4: shown iff a target exists). */
  backLabel: string | null;
  onBackPress?: () => void;
};

export function ItemValuationProvenanceRow({
  avatarKind,
  avatarName = "",
  avatarImageSrc = null,
  label,
  detail,
  backLabel,
  onBackPress,
}: ItemValuationProvenanceRowProps): React.JSX.Element {
  return (
    <div
      className="flex items-center gap-3"
      data-testid="item-valuation-provenance"
    >
      <span data-testid="item-valuation-provenance-avatar" className="shrink-0">
        {avatarKind === "dash" ? (
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-muted text-lg text-muted-foreground"
          >
            –
          </span>
        ) : (
          <Avatar
            className="size-10 bg-[#dce6f7] text-sm"
            imageSrc={avatarImageSrc}
            name={avatarName}
          />
        )}
      </span>

      <p className="min-w-0 flex-1 truncate text-base">
        <span className="font-bold text-foreground">{label}</span>
        {detail ? (
          <span className="ml-2 text-muted-foreground">{detail}</span>
        ) : null}
      </p>

      {backLabel ? (
        <button
          type="button"
          className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
          data-testid="item-valuation-back-to-saved"
          onClick={onBackPress}
        >
          {backLabel}
        </button>
      ) : null}
    </div>
  );
}
