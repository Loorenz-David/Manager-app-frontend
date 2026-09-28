import { ConfirmActionButton } from "@beyo/ui";

import { StockKeepMissingPicker } from "../versions/StockKeepMissingPicker";

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
 * The activation sheet's body (plan §G.10, OC-15, OC-16): a title line, a
 * note that says in plain words what activating does and what the choice
 * means, the choice, and the button. Activating now closes the live version,
 * so it asks twice; a schedule is reversible, so it asks once.
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
  const when = scheduleLabel ?? "the scheduled time";

  return (
    <div className="flex flex-col gap-3 px-4 pb-4" data-testid="stock-report-activate-sheet">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground" data-testid="stock-report-activate-title">
          {scheduling ? `Schedule ${title}` : `Activate ${title}`}
        </p>
        {scheduling && scheduleLabel ? <p className="text-sm text-muted-foreground">{scheduleLabel}</p> : null}
      </div>

      <div className="flex flex-col gap-1 rounded-lg bg-muted p-3 text-sm text-foreground" data-testid="stock-report-activate-note">
        {scheduling ? (
          <>
            <p>On {when} the live version closes, this draft takes its place and its quantities freeze.</p>
            <p>Rows where you typed a missing count keep it.</p>
            <p>
              For the other rows, choose what happens <strong>when it activates</strong> to the missing counts the
              live version has then: keep them, or start at 0. You can change this until then.
            </p>
          </>
        ) : (
          <>
            <p>The live version closes. This draft takes its place and its quantities freeze.</p>
            <p>Rows where you typed a missing count keep it.</p>
            <p>
              For the other rows, choose what happens to the missing counts the live version has today: keep them,
              or start at 0.
            </p>
          </>
        )}
      </div>

      <StockKeepMissingPicker disabled={disabled} value={keepActiveMissing} onChange={onKeepChange} />

      {scheduling ? (
        <button
          className="min-h-12 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="stock-report-activate-confirm"
          disabled={disabled}
          type="button"
          onClick={onConfirm}
        >
          Schedule activation
        </button>
      ) : (
        <ConfirmActionButton
          align="center"
          backgroundColor="var(--color-primary)"
          className="min-h-12 w-full px-4 text-sm font-semibold"
          confirmLabel="Tap again to activate"
          confirmTextColor="white"
          data-testid="stock-report-activate-confirm"
          disabled={disabled}
          fillColor="var(--color-dark-pearl-green)"
          label="Activate now"
          textColor="var(--color-card)"
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}
