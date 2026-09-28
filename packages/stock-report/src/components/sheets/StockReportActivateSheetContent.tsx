import { StockKeepMissingPicker } from "../versions/StockKeepMissingPicker";
import { StockInfoNote } from "./StockInfoNote";

export type StockReportActivateSheetContentProps = {
  /** `activate` = now; `schedule` = when the stored schedule fires. */
  mode: "activate" | "schedule";
  title: string;
  /** "Thu, 7th Oct · 06:00" — the schedule wording's date; unused when activating now. */
  scheduleLabel?: string | null;
  keepActiveMissing: boolean;
  onKeepChange: (keepActiveMissing: boolean) => void;
  onConfirm: () => void;
  disabled?: boolean;
};

/**
 * The activation sheet's body (plan §G.10, OC-15, OC-16): a title line (with
 * the date when scheduling), an info note about the one choice, the choice,
 * and the button. The note leaves out that the live version closes, and the
 * sheet itself is the confirmation, so the button acts on one tap in both
 * modes (owner, 2026-09-28).
 */
export function StockReportActivateSheetContent({
  mode,
  title,
  scheduleLabel,
  keepActiveMissing,
  onKeepChange,
  onConfirm,
  disabled = false,
}: StockReportActivateSheetContentProps): React.JSX.Element {
  const scheduling = mode === "schedule";

  return (
    <div className="flex flex-col gap-3 px-4 pb-4" data-testid="stock-report-activate-sheet">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground" data-testid="stock-report-activate-title">
          {scheduling ? `Schedule ${title}` : `Activate ${title}`}
        </p>
        {scheduling && scheduleLabel ? <p className="text-sm text-muted-foreground">{scheduleLabel}</p> : null}
      </div>

      <StockInfoNote data-testid="stock-report-activate-note">
        <p>
          {scheduling
            ? "Missing counts you typed stay. For the rest, choose what happens when it activates. You can change this until then."
            : "Missing counts you typed stay. For the rest, choose:"}
        </p>
      </StockInfoNote>

      <StockKeepMissingPicker disabled={disabled} value={keepActiveMissing} onChange={onKeepChange} />

      <button
        className="mt-4 min-h-12 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-card disabled:opacity-50"
        data-testid="stock-report-activate-confirm"
        disabled={disabled}
        type="button"
        onClick={onConfirm}
      >
        {scheduling ? "Schedule activation" : "Activate now"}
      </button>
    </div>
  );
}
