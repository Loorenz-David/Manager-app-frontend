import { Lock } from "lucide-react";

type EditorReadOnlyBannerProps = {
  /** e.g. "Published — read-only · v2" or "Archived — read-only · v1". */
  label: string;
  /** Renders the "Edit as new version" affordance when provided (Phase 6 wires it). */
  onEditAsNewVersion?: () => void;
  editAsNewVersionDisabled?: boolean;
};

export function EditorReadOnlyBanner({
  label,
  onEditAsNewVersion,
  editAsNewVersionDisabled,
}: EditorReadOnlyBannerProps): React.JSX.Element {
  return (
    <div
      data-testid="presentation-editor-read-only-banner"
      className="flex shrink-0 items-center justify-between gap-4 border-b border-[#f0e2c0] bg-[#f6ecd6] px-4 py-2"
    >
      <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[#a9791b]">
        <Lock aria-hidden className="size-3.5" strokeWidth={2} />
        {label}
      </span>
      {onEditAsNewVersion && (
        <button
          type="button"
          onClick={onEditAsNewVersion}
          disabled={editAsNewVersionDisabled}
          data-testid="presentation-editor-edit-as-new-version-button"
          className="rounded-lg bg-[#303030] px-3.5 py-[6px] text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#1c1c1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Edit as new version
        </button>
      )}
    </div>
  );
}
