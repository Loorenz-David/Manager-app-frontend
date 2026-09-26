import type {
  StockReportLoadStatus,
  StockReportMissingSummary,
  StockReportVersionViewModel,
} from "@beyo/stock-report";
import { ConfirmActionButton } from "@beyo/ui";
import { History, Plus } from "lucide-react";

import { StockMissingRow } from "./StockMissingRow";
import { StockVersionProgressCard } from "./StockVersionProgressCard";

type StockReportHubViewProps = {
  version: StockReportVersionViewModel | null;
  versionStatus: StockReportLoadStatus;
  missingSummary: StockReportMissingSummary | null;
  /** Opening a version is admin and manager only (§5.8). */
  canManageVersions: boolean;
  onOpenBoard: () => void;
  onOpenMissing: () => void;
  onOpenHistory: () => void;
  onCreateVersion: () => void;
};

/**
 * The manager's stock report landing pane (owner layout, 2026-09-26): the
 * version card, the missing row under it, then New version and History.
 * Workers and sellers never see this — their tab is the board itself.
 */
export function StockReportHubView({
  version,
  versionStatus,
  missingSummary,
  canManageVersions,
  onOpenBoard,
  onOpenMissing,
  onOpenHistory,
  onCreateVersion,
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

      <div
        className={`grid gap-3 ${canManageVersions ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {canManageVersions ? (
          // Tap-again, because opening a version closes the current one and
          // resets every priority — a stray tap must not wipe the board.
          <ConfirmActionButton
            align="center"
            backgroundColor="var(--color-primary)"
            className="w-full py-3.5 text-md font-semibold"
            confirmLabel="Confirm Tap"
            confirmTextColor="white"
            data-testid="stock-report-hub-create-version"
            fillColor="var(--color-dark-pearl-green)"
            icon={<Plus aria-hidden="true" className="size-4 shrink-0" />}
            label="New version"
            textColor="var(--color-card)"
            onConfirm={onCreateVersion}
          />
        ) : null}
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3.5 text-md font-semibold text-foreground"
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
    </div>
  );
}
