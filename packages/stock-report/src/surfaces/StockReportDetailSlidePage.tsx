import { useEffect, useRef } from "react";

import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import { usePreloadSurface, useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import {
  stockAssignmentMismatchFailures,
  stockAssignmentRefusalReasons,
} from "../api/stock-report-api";
import { useStockReportAssignmentsQuery } from "../api/use-stock-report-queries";
import {
  useCreateStockAssignment,
  useRemoveStockAssignment,
  useSetStockReportMissingQuantity,
} from "../actions/use-stock-report-actions";
import { stockReportKeys } from "../api/stock-report-keys";
import {
  stockReportListItems,
  type StockReportItemListData,
} from "../api/stock-report-list-cache";
import { StockReportDetailView } from "../components/detail/StockReportDetailView";
import { StockReportMenuButton } from "../components/StockReportMenuButton";
import { useStockAssignmentGate } from "../hooks/use-stock-assignment-gate";
import { missingQuantityBounds } from "../lib/missing-quantity";
import { useStockReportPermissions } from "../lib/use-stock-report-permissions";
import { stockAssignmentRefusalMessage } from "../lib/stock-assignment-messages";
import { useStockReportOpeners } from "../openers";
import {
  STOCK_REPORT_ACTIONS_SURFACE_ID,
  STOCK_REPORT_DETAIL_MENU_SURFACE_ID,
  STOCK_REPORT_DETAIL_SURFACE_ID,
  STOCK_REPORT_LEGEND_SURFACE_ID,
  STOCK_REPORT_REQUESTED_SURFACE_ID,
  preloadStockReportLegendSurface,
  type StockReportDetailMenuSurfaceProps,
  type StockReportDetailSurfaceProps,
  type StockReportRequestedSurfaceProps,
} from "../surface-ids";
import {
  STOCK_REPORT_ACTIVE_SCOPE,
  stockReportVersionScope,
  toStockReportAssignmentCardData,
  toStockReportItemViewModel,
  type StockReportItem,
} from "../stock-report.types";

export function StockReportDetailSlidePage(): React.JSX.Element {
  const { stockNeedId = "", versionId } = useSurfaceProps<StockReportDetailSurfaceProps>();
  // The page reads one version's row (plan §3.1): the board's when opened
  // from the board, a draft's when opened from a draft board. Every cache
  // read and every edit below carries this scope.
  const scope = stockReportVersionScope(versionId);
  const isDraft = scope !== STOCK_REPORT_ACTIVE_SCOPE;
  const queryClient = useQueryClient();
  const header = useSurfaceHeader();
  const { close, open } = useSurface();
  const permissions = useStockReportPermissions();
  const openers = useStockReportOpeners();
  const gate = useStockAssignmentGate(stockNeedId, (props) =>
    openers.openMatchWarning?.(props),
  );
  const createAssignment = useCreateStockAssignment();
  const removeAssignment = useRemoveStockAssignment(stockNeedId);
  const setMissing = useSetStockReportMissingQuantity({ versionId });
  usePreloadSurface(preloadStockReportLegendSurface);
  // There is no single-row endpoint, so the page's own entry is seeded from
  // whichever list of its scope opened it and never fetched (`skipToken`);
  // the mutations and socket handlers keep it true. That is what keeps the
  // page reactive after its row leaves every list — marking all of it
  // missing drops it from the board's default read, clearing the count drops
  // it from the missing list. A deleted row still exits through the
  // assignments 404 below. `skipToken` alone disables fetching;
  // `gcTime: Infinity` keeps the entry alive for as long as the page is open,
  // even while the surface is hidden.
  const detail = useQuery<StockReportItem>({
    queryKey: stockReportKeys.item(stockNeedId, scope),
    queryFn: skipToken,
    gcTime: Number.POSITIVE_INFINITY,
  });
  // The scope's lists only: another version's row is not this row.
  const listRow = queryClient
    .getQueriesData<StockReportItemListData>({ queryKey: stockReportKeys.versionLists(scope) })
    .flatMap(([, data]) => stockReportListItems(data))
    .find((item) => item.client_id === stockNeedId);
  const row = detail.data ?? listRow;
  useEffect(() => {
    // Seed once, judged by the cache itself: the observer reports the write a
    // tick later, and writing again in that window would loop.
    const key = stockReportKeys.item(stockNeedId, scope);
    if (listRow && queryClient.getQueryData(key) === undefined) {
      queryClient.setQueryData(key, listRow);
    }
  }, [listRow, queryClient, scope, stockNeedId]);
  const viewModel = row ? toStockReportItemViewModel(row) : null;
  const assignments = useStockReportAssignmentsQuery(stockNeedId);
  const canAddItem = permissions.canAssign && Boolean(openers.openTaskCreation);
  const isMissing =
    assignments.error instanceof Error &&
    "status" in assignments.error &&
    (assignments.error as { status: number }).status === 404;

  useEffect(() => {
    if (viewModel) header?.setTitle(viewModel.card.title);
  }, [header, viewModel]);

  // The ⋮ lives in the slide surface's own header. Its handler reads the row
  // at tap time through a ref, so the button is registered once and never
  // holds a stale ceiling.
  const openMenuRef = useRef<() => void>(() => {});
  openMenuRef.current = () => {
    if (!row?.snapshot) return;
    const snapshot = row.snapshot;
    const bounds = missingQuantityBounds(snapshot);
    const props: StockReportDetailMenuSurfaceProps = {
      markable: bounds.markable,
      missing: bounds.missing,
      canMarkMissing: permissions.canMarkMissing,
      disabled: setMissing.isPending,
      onMarkMissing: () =>
        setMissing.mutate({ stockNeedId, quantityMissing: bounds.ceiling }),
      onUnmarkMissing: () => setMissing.mutate({ stockNeedId, quantityMissing: 0 }),
    };
    if (permissions.canPrioritise) {
      // On the board the request names the active version — the row's own
      // snapshot carries its id (v7 §6.6), so no active-version read is
      // waited on (projection R4).
      const requested: StockReportRequestedSurfaceProps = {
        stockNeedId,
        versionId: versionId ?? snapshot.version_id,
        scope,
        current: snapshot.quantity_requested,
        source: snapshot.quantity_requested_source,
        scanner: snapshot.quantity_requested_scanner,
      };
      props.onSetRequested = () => open(STOCK_REPORT_REQUESTED_SURFACE_ID, requested);
    }
    if (isDraft && snapshot.quantity_missing_source === "own") {
      // OC-14, v9 §5.16: `null` drops the draft's own number.
      props.onFollowLive = () => setMissing.mutate({ stockNeedId, quantityMissing: null });
    }
    open(STOCK_REPORT_DETAIL_MENU_SURFACE_ID, props);
  };
  // Whoever has a row in the sheet (projection R3): the missing switch or the
  // requested quantity — sellers reach it for the latter alone.
  const showMenu = (permissions.canMarkMissing || permissions.canPrioritise) && Boolean(viewModel);
  useEffect(() => {
    if (!header) return;
    if (!showMenu) {
      header.setActions(null);
      return;
    }
    header.setActions(
      <StockReportMenuButton
        data-testid="stock-report-detail-menu-button"
        label="Stock need actions"
        onPress={() => openMenuRef.current()}
      />,
    );
    return () => header.setActions(null);
  }, [header, showMenu]);
  useEffect(() => {
    if (isMissing) close(STOCK_REPORT_DETAIL_SURFACE_ID);
  }, [close, isMissing]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const unavailableReason = !permissions.canAssign
      ? "The resolved role is not allowed to assign items."
      : !openers.openTaskCreation
        ? "This app did not supply a task-creation opener."
        : null;
    console.info("[stock-report] detail capabilities", {
      stockNeedId,
      scope,
      role: permissions.role,
      workspaceSpecialization: permissions.workspaceSpecialization,
      canAssign: permissions.canAssign,
      hasTaskCreationOpener: Boolean(openers.openTaskCreation),
      canAddItem,
      boardItemFound: Boolean(row),
      assignmentQuery: assignments.isPending
        ? "pending"
        : assignments.isError
          ? "error"
          : "ready",
      unavailableReason,
    });
  }, [
    assignments.isError,
    assignments.isPending,
    canAddItem,
    openers.openTaskCreation,
    permissions.canAssign,
    permissions.role,
    permissions.workspaceSpecialization,
    row,
    scope,
    stockNeedId,
  ]);

  if (!viewModel)
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading stock need…
      </div>
    );

  const createCallbacks = {
    candidateGate: {
      check: gate.check,
      preload: gate.preload,
      clear: gate.clear,
      isPending: gate.isPending,
      statusSlot: gate.statusSlot,
    },
    afterCreate: async ({
      result,
    }: {
      result: { client_id: string; item_id?: string };
    }) => {
      if (!result.item_id) {
        notify.error(
          "Task created, but not attached to this stock need",
          "The new task has no item to assign.",
        );
        return "reset-stay" as const;
      }
      const input = {
        stockReportItemId: stockNeedId,
        taskId: result.client_id,
        itemId: result.item_id,
        overridePropertyMismatch: gate.getAcceptedOverride(),
      };
      try {
        await createAssignment.mutateAsync(input);
        return "close" as const;
      } catch (error) {
        const failures = stockAssignmentMismatchFailures(error);
        if (failures && (await gate.requestOverride(failures))) {
          try {
            await createAssignment.mutateAsync({
              ...input,
              overridePropertyMismatch: true,
            });
            return "close" as const;
          } catch {
            // The task is intentionally retained; a retry loop would conceal a real refusal.
          }
        }
        const refusalReasons = stockAssignmentRefusalReasons(error);
        if (refusalReasons) {
          notify.error(
            "Task created, but not attached to this stock need",
            refusalReasons.map(stockAssignmentRefusalMessage).join(" "),
          );
          return "reset-stay" as const;
        }
        notify.error(
          "Task created, but not attached to this stock need",
          "The task was kept. Change the item or add it again after resolving the assignment issue.",
        );
        return "reset-stay" as const;
      }
    },
  };

  return (
    <StockReportDetailView
      activeMissing={viewModel.card.activeMissing}
      assignments={(assignments.data ?? []).map(
        toStockReportAssignmentCardData,
      )}
      canAssign={canAddItem}
      errorMessage={
        assignments.error instanceof Error
          ? assignments.error.message
          : undefined
      }
      imageUrl={viewModel.card.imageUrl}
      isDraft={isDraft}
      isMissing={isMissing}
      missingSource={viewModel.card.missingSource}
      onAddItem={() => openers.openTaskCreation?.(stockNeedId, createCallbacks)}
      onRefresh={() => assignments.refetch().then(() => undefined)}
      onRetry={() => void assignments.refetch()}
      onTapActions={
        permissions.canAssign
          ? (_taskId, assignmentItemId) => {
              const assignment = (assignments.data ?? []).find(
                (entry) => entry.item_id === assignmentItemId,
              );
              if (assignment)
                open(STOCK_REPORT_ACTIONS_SURFACE_ID, {
                  onRemove: () => removeAssignment.mutate(assignment.client_id),
                  disabled: removeAssignment.isPending,
                });
            }
          : undefined
      }
      onOpenLegend={() =>
        open(STOCK_REPORT_LEGEND_SURFACE_ID, { quantities: viewModel.card.quantities })
      }
      onTapCard={openers.openTaskDetail}
      onTapImage={(taskId) => {
        const assignment = (assignments.data ?? []).find(
          (entry) => entry.task_id === taskId,
        );
        if (!assignment) return;
        const images = assignment.item.item_images.flatMap((image) =>
          image.client_id && image.image_url
            ? [{ clientId: image.client_id, imageUrl: image.image_url }]
            : [],
        );
        if (images.length > 0)
          openers.openImageViewer?.(taskId, assignment.item.client_id, images);
      }}
      propertyTags={viewModel.card.propertyTags}
      quantities={viewModel.card.quantities}
      requestedScanner={viewModel.card.requestedScanner}
      requestedSource={viewModel.card.requestedSource}
      status={
        assignments.isPending
          ? "loading"
          : assignments.isError
            ? "error"
            : "ready"
      }
      title={viewModel.card.title}
    />
  );
}
