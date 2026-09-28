import type {
  StockReportLoadStatus,
  StockReportMissingSummary,
  StockReportVersionViewModel,
} from "@beyo/stock-report";
import { FileClock, History, Loader2, Plus } from "lucide-react";

import { StockMissingRow } from "./StockMissingRow";
import { StockVersionProgressCard } from "./StockVersionProgressCard";

type StockReportHubViewProps = {
  version: StockReportVersionViewModel | null;
  versionStatus: StockReportLoadStatus;
  missingSummary: StockReportMissingSummary | null;
  /** Drafts and new drafts are admin and manager only (§5.8). */
  canManageVersions: boolean;
  /** `undefined` while loading or on error. */
  draftCount: number | undefined;
  onOpenBoard: () => void;
  onOpenMissing: () => void;
  onOpenDrafts: () => void;
  onOpenHistory: () => void;
  onCreateDraft: () => void;
  /** The create request is in flight: the button waits, so a second tap sends nothing. */
  creatingDraft: boolean;
};

const SECONDARY_BUTTON_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3.5 text-md font-semibold text-foreground";

/** "Drafts · n" once loaded; plain "Drafts" while loading, on error and at 0 (OC-8). */
function draftsButtonLabel(count: number | undefined): string {
  return count === undefined || count === 0 ? "Drafts" : `Drafts (${count})`;
}

/**
 * The manager's stock report landing pane (owner layout, 2026-09-26, drafts
 * added 2026-09-28): the version card, the missing row under it, then
 * `[Drafts (n)] [History]` and a full-width + New Draft. Workers and sellers
 * never see this — their tab is the board itself.
 */
export function StockReportHubView({
  version,
  versionStatus,
  missingSummary,
  canManageVersions,
  draftCount,
  onOpenBoard,
  onOpenMissing,
  onOpenDrafts,
  onOpenHistory,
  onCreateDraft,
  creatingDraft,
}: StockReportHubViewProps): React.JSX.Element {
  const showMissing = (missingSummary?.quantity_missing_total ?? 0) > 0;

  return (
    <div
      className="flex flex-col gap-4 px-4 pt-4.5"
      data-testid="stock-report-hub"
    >
      <StockVersionProgressCard
        status={versionStatus}
        version={version}
        onPress={onOpenBoard}
      />

      {showMissing && missingSummary ? (
        <StockMissingRow summary={missingSummary} onPress={onOpenMissing} />
      ) : null}

      <div className="flex flex-col gap-3">
        <div
          className={`grid gap-3 ${canManageVersions ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {canManageVersions ? (
            <button
              className={SECONDARY_BUTTON_CLASS}
              data-testid="stock-report-hub-open-drafts"
              type="button"
              onClick={onOpenDrafts}
            >
              <FileClock
                aria-hidden="true"
                className="size-4 shrink-0 text-primary"
              />
              {draftsButtonLabel(draftCount)}
            </button>
          ) : null}
          <button
            className={SECONDARY_BUTTON_CLASS}
            data-testid="stock-report-hub-open-history"
            type="button"
            onClick={onOpenHistory}
          >
            <History
              aria-hidden="true"
              className="size-4 shrink-0 text-primary"
            />
            History
          </button>
        </div>

        {canManageVersions ? (
          // A plain button: a draft closes nothing, so one tap creates it
          // (owner, 2026-09-28) and its board opens.
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-md font-semibold text-card disabled:opacity-70"
            data-testid="stock-report-hub-create-version"
            disabled={creatingDraft}
            type="button"
            onClick={onCreateDraft}
          >
            {creatingDraft ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
                Creating draft…
              </>
            ) : (
              <>
                <Plus aria-hidden="true" className="size-4 shrink-0" />
                New Draft
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
