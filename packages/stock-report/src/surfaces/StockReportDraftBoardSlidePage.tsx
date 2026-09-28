import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { useSurfaceStore } from "@beyo/ui";

import { stockReportMutationKeys } from "../api/stock-report-keys";
import { useStockReportVersionQuery } from "../api/use-stock-report-queries";
import { StockReportBoardView } from "../components/board/StockReportBoardView";
import { StockReportMenuButton } from "../components/StockReportMenuButton";
import { StockReportSlideHeader } from "../components/StockReportSlideHeader";
import { useStockReportBoardController } from "../controllers/use-stock-report-board-controller";
import {
  STOCK_REPORT_DRAFT_BOARD_SURFACE_ID,
  STOCK_REPORT_VERSION_ACTIONS_SURFACE_ID,
  type StockReportDraftBoardSurfaceProps,
} from "../surface-ids";
import { toStockReportVersionViewModel } from "../stock-report.types";

const FALLBACK_TITLE = "Draft version";

function isNotFound(error: unknown): boolean {
  return error instanceof Error && "status" in error && (error as { status: number }).status === 404;
}

/**
 * One draft's board (plan §C.4): the same view and controller as the active
 * board, scoped to the draft's rows — its own keys, its own routes, its own
 * detail pages. The in-scroll header carries the draft's title and, for the
 * roles that manage versions, the ⋮ that opens the version's actions.
 *
 * The page watches its own version query and leaves when the version stops
 * being a draft (plan §3.3): activated — by the user, on schedule, or by
 * someone else — or deleted. It closes itself **and every surface stacked
 * above it** (projection R12): a detail page or sheet left open would be
 * scoped to a version that is gone or live. The toast is for a *remote*
 * change only (R11): the user's own activate or delete already toasted from
 * its command, which the mutation cache still holds under the version's key.
 */
export function StockReportDraftBoardSlidePage(): React.JSX.Element {
  const { versionId = "" } = useSurfaceProps<StockReportDraftBoardSurfaceProps>();
  const header = useSurfaceHeader();
  const { open, closeMany } = useSurface();
  const queryClient = useQueryClient();
  const controller = useStockReportBoardController({ versionId });
  const version = useStockReportVersionQuery(versionId);
  const viewModel = version.data ? toStockReportVersionViewModel(version.data) : null;
  const title = viewModel?.displayTitle ?? FALLBACK_TITLE;

  // The surface's fixed header cannot scroll with the body, so it is muted
  // outright and the page draws its own (owner, 2026-09-26). The title still
  // feeds the surface's accessible name.
  useEffect(() => {
    header?.setTitle(title);
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header, title]);

  const gone = version.isError && isNotFound(version.error);
  const live = version.data !== undefined && version.data.state !== "draft";
  const exited = useRef(false);
  useEffect(() => {
    if ((!gone && !live) || exited.current) return;
    exited.current = true;
    const own = queryClient
      .getMutationCache()
      .findAll({ mutationKey: stockReportMutationKeys.versionCommand(versionId) })
      .some((mutation) => mutation.state.status === "pending" || mutation.state.status === "success");
    if (!own) notify.info(live ? "This draft is now live" : "This draft was deleted");
    const stack = useSurfaceStore.getState().stack;
    const index = stack.findIndex((surface) => surface.id === STOCK_REPORT_DRAFT_BOARD_SURFACE_ID);
    const above = index >= 0 ? stack.slice(index).map((surface) => surface.id) : [];
    closeMany(above.length > 0 ? above : [STOCK_REPORT_DRAFT_BOARD_SURFACE_ID]);
  }, [closeMany, gone, live, queryClient, versionId]);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="stock-report-draft-board-page">
      <StockReportBoardView
        header={
          <StockReportSlideHeader
            actions={
              controller.permissions.canManageVersions ? (
                <StockReportMenuButton
                  data-testid="stock-report-draft-board-menu"
                  label="Version actions"
                  onPress={() => open(STOCK_REPORT_VERSION_ACTIONS_SURFACE_ID, { versionId })}
                />
              ) : null
            }
            data-testid="stock-report-draft-board-back"
            title={title}
            onBack={() => header?.requestClose()}
          />
        }
        activeFilterCount={controller.activeFilterCount}
        bucket={controller.bucket}
        buckets={controller.buckets}
        canReorganise={controller.permissions.canPrioritise}
        cards={controller.cards}
        errorMessage={controller.errorMessage}
        hasMore={controller.hasMore}
        isLoadingMore={controller.isLoadingMore}
        isReorganiseMode={controller.isReorganiseMode}
        reorderDisabled={controller.reorderDisabled}
        searchValue={controller.searchValue}
        status={controller.status}
        onBucketChange={controller.setBucket}
        onCardPress={controller.openDetail}
        onFilterPress={controller.openFilter}
        onRefresh={controller.refetch}
        onReorder={controller.reorder}
        onRetry={() => void controller.refetch()}
        onSearchChange={controller.setSearchValue}
        onSetPriority={controller.openPriority}
        onShowMore={controller.loadMore}
        onToggleReorganise={controller.toggleReorganise}
      />
    </div>
  );
}
