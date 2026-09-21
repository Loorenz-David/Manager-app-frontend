/**
 * ============================================================================
 * TEMPORARY — DELETE WHEN THE LOGIC PHASE LANDS
 * ============================================================================
 *
 * A fixture-driven harness so the owner can judge the stock-report interface on
 * a real phone before any endpoint, surface or controller exists. It fetches
 * nothing, reads no role and opens no surface: every screen below is the real
 * component fed from `fixtures/stock-report-fixtures.ts`.
 *
 * Two things here are deliberately *not* the real thing, because their real
 * versions belong to the logic session:
 *
 *  - the detail is shown as a plain in-page panel with a temporary back
 *    control. In the product it is a slide surface whose own header carries the
 *    title and the way back (intention §6.2) — this page must never grow a
 *    back-arrow bar of its own.
 *  - the sheets are shown in a plain bottom panel rather than a registered
 *    `sheet` surface, and the match sheet is therefore dismissible here. In the
 *    product it is opened locked (§12A A6, §12B B7).
 *
 * The logic session replaces this file with the real route entry. See
 * `handoffs/UI_PHASE_HANDOFF.md` for the exact list of files to remove.
 */

import { useState } from "react";
import { ChevronLeft } from "lucide-react";

import { StockReportBoardView } from "../board/StockReportBoardView";
import { StockReportDetailView } from "../detail/StockReportDetailView";
import { StockMatchStatusRow } from "../sheets/StockMatchStatusRow";
import { StockMatchWarningSheetContent } from "../sheets/StockMatchWarningSheetContent";
import { StockReportActionsSheetContent } from "../sheets/StockReportActionsSheetContent";
import { StockReportPrioritySheetContent } from "../sheets/StockReportPrioritySheetContent";
import {
  TRIAGE_BUCKETS,
  stockMatchBlockedReasonFixture,
  stockMatchFailuresFixture,
  stockReportAssignmentsFixture,
  stockReportBoardAllBarStatesFixture,
  stockReportBoardCardsFixture,
  stockReportBoardEmptyFixture,
  stockReportNoAssignmentsFixture,
  stockReportSingleAssignmentFixture,
} from "../../fixtures/stock-report-fixtures";
import type {
  StockNeedBucket,
  StockNeedCardData,
} from "../../stock-report.types";

type PreviewSheet =
  | { kind: "none" }
  | { kind: "priority"; stockNeedId: string }
  | { kind: "actions" }
  | { kind: "match-blocked" }
  | { kind: "match-warning" };

const BUCKET_CARDS: Record<StockNeedBucket, readonly StockNeedCardData[]> = {
  unset: stockReportBoardAllBarStatesFixture,
  high: stockReportBoardCardsFixture,
  medium: stockReportBoardCardsFixture.slice(0, 2),
  low: stockReportBoardEmptyFixture,
};

export function StockReportFixturePreview(): React.JSX.Element {
  const [bucket, setBucket] = useState<StockNeedBucket>("unset");
  const [search, setSearch] = useState("");
  const [isReorganiseMode, setIsReorganiseMode] = useState(false);
  const [order, setOrder] = useState<Record<string, readonly StockNeedCardData[]>>(
    () => ({ ...BUCKET_CARDS }),
  );
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<PreviewSheet>({ kind: "none" });
  const [detailVariant, setDetailVariant] = useState<
    "items" | "one-item" | "empty" | "loading" | "error" | "missing"
  >("items");
  const [matchStatus, setMatchStatus] = useState<
    "idle" | "checking" | "mismatch-accepted"
  >("idle");

  const cards = order[bucket] ?? [];
  const openCard =
    openDetailId === null
      ? null
      : (Object.values(order)
          .flat()
          .find((card) => card.stockNeedId === openDetailId) ?? null);

  function handleReorder(stockNeedId: string, toIndex: number): void {
    setOrder((current) => {
      const list = [...(current[bucket] ?? [])];
      const fromIndex = list.findIndex(
        (card) => card.stockNeedId === stockNeedId,
      );

      if (fromIndex === -1) {
        return current;
      }

      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);

      return { ...current, [bucket]: list };
    });
  }

  if (openCard) {
    return (
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <PreviewToolbar>
          <button
            className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-sm"
            type="button"
            onClick={() => setOpenDetailId(null)}
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
            Board
          </button>
          <span className="text-xs font-semibold text-foreground">
            {openCard.title}
          </span>
          <PreviewSelect
            onChange={(value) =>
              setDetailVariant(value as typeof detailVariant)
            }
            options={[
              "items",
              "one-item",
              "empty",
              "loading",
              "error",
              "missing",
            ]}
            value={detailVariant}
          />
        </PreviewToolbar>

        <StockReportDetailView
          assignments={
            detailVariant === "one-item"
              ? stockReportSingleAssignmentFixture
              : detailVariant === "empty"
                ? stockReportNoAssignmentsFixture
                : stockReportAssignmentsFixture
          }
          canAssign
          imageUrl={openCard.imageUrl}
          isMissing={detailVariant === "missing"}
          onAddItem={() => setSheet({ kind: "match-warning" })}
          onRefresh={() => undefined}
          onRetry={() => setDetailVariant("items")}
          onTapActions={() => setSheet({ kind: "actions" })}
          onTapCard={() => undefined}
          onTapImage={() => undefined}
          propertyTags={openCard.propertyTags}
          quantities={openCard.quantities}
          status={
            detailVariant === "loading"
              ? "loading"
              : detailVariant === "error"
                ? "error"
                : "ready"
          }
          title={openCard.title}
        />

        <PreviewSheetPanel
          sheet={sheet}
          onChangeItem={() => {
            setSheet({ kind: "none" });
            setMatchStatus("idle");
          }}
          onClose={() => setSheet({ kind: "none" })}
          onContinue={() => {
            setSheet({ kind: "none" });
            setMatchStatus("mismatch-accepted");
          }}
          onSelectPriority={() => setSheet({ kind: "none" })}
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <PreviewToolbar>
        <span className="text-xs font-semibold text-foreground">
          Fixture preview
        </span>
        <button
          className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-sm"
          type="button"
          onClick={() =>
            setMatchStatus((current) =>
              current === "idle"
                ? "checking"
                : current === "checking"
                  ? "mismatch-accepted"
                  : "idle",
            )
          }
        >
          Match row: {matchStatus}
        </button>
        <button
          className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-sm"
          type="button"
          onClick={() => setSheet({ kind: "match-blocked" })}
        >
          Blocked sheet
        </button>
      </PreviewToolbar>

      <div className="px-4 pb-2">
        <StockMatchStatusRow
          state={matchStatus}
          onPress={() => setSheet({ kind: "match-warning" })}
        />
      </div>

      <StockReportBoardView
        bucket={bucket}
        buckets={TRIAGE_BUCKETS}
        canReorganise
        cards={cards}
        isReorganiseMode={isReorganiseMode}
        onBucketChange={setBucket}
        onCardPress={setOpenDetailId}
        onRefresh={() => undefined}
        onReorder={handleReorder}
        onSearchChange={setSearch}
        onSetPriority={(stockNeedId) =>
          setSheet({ kind: "priority", stockNeedId })
        }
        onToggleReorganise={() => setIsReorganiseMode((current) => !current)}
        searchValue={search}
        status="ready"
      />

      <PreviewSheetPanel
        sheet={sheet}
        onChangeItem={() => {
          setSheet({ kind: "none" });
          setMatchStatus("idle");
        }}
        onClose={() => setSheet({ kind: "none" })}
        onContinue={() => {
          setSheet({ kind: "none" });
          setMatchStatus("mismatch-accepted");
        }}
        onSelectPriority={() => setSheet({ kind: "none" })}
      />
    </div>
  );
}

function PreviewToolbar({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-dashed border-border px-4 py-2">
      {children}
    </div>
  );
}

function PreviewSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <select
      className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function PreviewSheetPanel({
  sheet,
  onClose,
  onSelectPriority,
  onChangeItem,
  onContinue,
}: {
  sheet: PreviewSheet;
  onClose: () => void;
  onSelectPriority: () => void;
  onChangeItem: () => void;
  onContinue: () => void;
}): React.JSX.Element | null {
  if (sheet.kind === "none") {
    return null;
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-card pb-6 pt-4 shadow-2xl">
      <div className="flex items-center justify-between px-4 pb-3">
        <span className="text-sm font-semibold text-foreground">
          {sheet.kind === "priority"
            ? "Set priority"
            : sheet.kind === "actions"
              ? "Item actions"
              : "Stock need match"}
        </span>
        <button
          className="text-xs font-semibold text-muted-foreground"
          type="button"
          onClick={onClose}
        >
          Close (preview only)
        </button>
      </div>

      {sheet.kind === "priority" ? (
        <StockReportPrioritySheetContent
          current="unset"
          onSelect={onSelectPriority}
        />
      ) : null}

      {sheet.kind === "actions" ? (
        <StockReportActionsSheetContent onRemove={onClose} />
      ) : null}

      {sheet.kind === "match-blocked" ? (
        <StockMatchWarningSheetContent
          checkedAgainstStoredItem
          kind="blocked"
          onChangeItem={onChangeItem}
          reasonText={stockMatchBlockedReasonFixture}
        />
      ) : null}

      {sheet.kind === "match-warning" ? (
        <StockMatchWarningSheetContent
          failures={stockMatchFailuresFixture}
          kind="warning"
          onChangeItem={onChangeItem}
          onContinue={onContinue}
        />
      ) : null}
    </div>
  );
}
