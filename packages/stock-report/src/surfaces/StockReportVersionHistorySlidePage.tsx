import { useEffect, useState } from "react";
import { useSurfaceHeader } from "@beyo/hooks";
import { PullToRefresh } from "@beyo/ui";

import { useStockReportVersionsQuery } from "../api/use-stock-report-queries";
import { StockReportSlideHeader } from "../components/StockReportSlideHeader";
import { StockVersionCard } from "../components/versions/StockVersionCard";
import {
  StockVersionListEmptyState,
  StockVersionListErrorState,
  StockVersionListSkeleton,
} from "../components/versions/StockVersionListStates";
import { toStockReportVersionViewModel } from "../stock-report.types";

/**
 * Every version the workspace has opened, newest first (§5.9), each with the
 * total progress it reached — frozen for closed versions, live for the active
 * one. Read-only this round (owner, 2026-09-26): apply-priorities is later.
 * The back row scrolls with the list; the surface header is muted.
 */
const TITLE = "Version history";

export function StockReportVersionHistorySlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const versions = useStockReportVersionsQuery();

  // The surface's fixed header cannot scroll with the body, so it is muted
  // outright and the page draws its own (owner, 2026-09-26).
  useEffect(() => {
    header?.setTitle(TITLE);
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header]);

  // One clock for the whole list, read once per mount, so two cards cannot
  // disagree on "today" and the render stays pure.
  const [now] = useState(() => Date.now());
  const rows = (versions.data?.pages ?? []).flatMap((page) =>
    page.versions.map((version) => toStockReportVersionViewModel(version, now)),
  );

  return (
    <div className="relative h-full min-h-0 flex-1" data-testid="stock-report-version-history">
      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        onRefresh={() => versions.refetch().then(() => undefined)}
      >
        <StockReportSlideHeader
          data-testid="stock-report-version-history-back"
          title={TITLE}
          onBack={() => header?.requestClose()}
        />
        <div className="px-4 pb-[calc(var(--safe-bottom,0px)+1.5rem)] pt-4">
          {versions.isPending ? <StockVersionListSkeleton /> : null}

          {versions.isError ? (
            <StockVersionListErrorState
              message={versions.error instanceof Error ? versions.error.message : undefined}
              onRetry={() => void versions.refetch()}
            />
          ) : null}

          {versions.isSuccess && rows.length === 0 ? <StockVersionListEmptyState /> : null}

          {versions.isSuccess && rows.length > 0 ? (
            <div className="flex flex-col gap-2.5" data-testid="stock-version-list">
              {rows.map((version) => (
                <StockVersionCard key={version.client_id} version={version} />
              ))}
            </div>
          ) : null}

          {versions.hasNextPage ? (
            <button
              className="mt-4 w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground disabled:opacity-50"
              data-testid="stock-version-list-load-more"
              disabled={versions.isFetchingNextPage}
              type="button"
              onClick={() => void versions.fetchNextPage()}
            >
              {versions.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </div>
      </PullToRefresh>
    </div>
  );
}
