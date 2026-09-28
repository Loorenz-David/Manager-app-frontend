import { useEffect, useState } from "react";
import { usePreloadSurface, useSurface, useSurfaceHeader } from "@beyo/hooks";
import { PullToRefresh } from "@beyo/ui";

import { useStockReportVersionsQuery } from "../api/use-stock-report-queries";
import { StockReportSlideHeader } from "../components/StockReportSlideHeader";
import { StockDraftVersionCard } from "../components/versions/StockDraftVersionCard";
import {
  StockVersionListEmptyState,
  StockVersionListErrorState,
  StockVersionListSkeleton,
} from "../components/versions/StockVersionListStates";
import { useStockReportPermissions } from "../lib/use-stock-report-permissions";
import { toStockReportVersionViewModel } from "../stock-report.types";
import {
  preloadStockReportDraftBoardSurface,
  preloadStockReportVersionActionsSurface,
  STOCK_REPORT_DRAFT_BOARD_SURFACE_ID,
  STOCK_REPORT_VERSION_ACTIONS_SURFACE_ID,
} from "../surface-ids";

const TITLE = "Draft versions";
const DRAFT_STATES = ["draft"] as const;

/**
 * Every draft (v7 §5.9, `state=draft`), each opening its own board (plan
 * §G.3). A draft is live, so its numbers move with Scanner and the board.
 * The back row scrolls with the list; the surface header is muted, as on the
 * history page.
 */
export function StockReportDraftsSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { open } = useSurface();
  const permissions = useStockReportPermissions();
  const drafts = useStockReportVersionsQuery({ states: DRAFT_STATES });
  usePreloadSurface(preloadStockReportDraftBoardSurface);
  usePreloadSurface(preloadStockReportVersionActionsSurface);

  useEffect(() => {
    header?.setTitle(TITLE);
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header]);

  // One clock for the whole list: every card agrees on what is overdue.
  const [now] = useState(() => Date.now());
  const rows = (drafts.data?.pages ?? []).flatMap((page) =>
    page.versions.map((version) => toStockReportVersionViewModel(version, now)),
  );

  return (
    <div className="relative h-full min-h-0 flex-1" data-testid="stock-report-drafts">
      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        onRefresh={() => drafts.refetch().then(() => undefined)}
      >
        <StockReportSlideHeader
          data-testid="stock-report-drafts-back"
          title={TITLE}
          onBack={() => header?.requestClose()}
        />
        <div className="px-4 pb-[calc(var(--safe-bottom,0px)+1.5rem)] pt-4">
          {drafts.isPending ? <StockVersionListSkeleton /> : null}

          {drafts.isError ? (
            <StockVersionListErrorState
              fallback="Drafts could not be loaded."
              message={drafts.error instanceof Error ? drafts.error.message : undefined}
              onRetry={() => void drafts.refetch()}
            />
          ) : null}

          {drafts.isSuccess && rows.length === 0 ? (
            <StockVersionListEmptyState message="No drafts yet — create one from the stock page." />
          ) : null}

          {drafts.isSuccess && rows.length > 0 ? (
            <div className="flex flex-col gap-2.5" data-testid="stock-draft-list">
              {rows.map((version) => (
                <StockDraftVersionCard
                  key={version.client_id}
                  canManage={permissions.canManageVersions}
                  version={version}
                  onMenu={() => open(STOCK_REPORT_VERSION_ACTIONS_SURFACE_ID, { versionId: version.client_id })}
                  onPress={() => open(STOCK_REPORT_DRAFT_BOARD_SURFACE_ID, { versionId: version.client_id })}
                />
              ))}
            </div>
          ) : null}

          {drafts.hasNextPage ? (
            <button
              className="mt-4 w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground disabled:opacity-50"
              data-testid="stock-draft-list-load-more"
              disabled={drafts.isFetchingNextPage}
              type="button"
              onClick={() => void drafts.fetchNextPage()}
            >
              {drafts.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </div>
      </PullToRefresh>
    </div>
  );
}
