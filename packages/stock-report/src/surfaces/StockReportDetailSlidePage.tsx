import { useSurfaceHeader, useSurfaceProps, useSurface } from "@beyo/hooks";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StockReportDetailView } from "../components/detail/StockReportDetailView";
import { useStockReportAssignmentsQuery } from "../api/use-stock-report-queries";
import { stockReportKeys } from "../api/stock-report-keys";
import { toStockReportItemViewModel, type StockReportAssignmentCardData, type StockReportItem } from "../stock-report.types";
import { useStockReportPermissions } from "../lib/use-stock-report-permissions";
import { useStockReportOpeners } from "../openers";
import { useCreateStockAssignment, useRemoveStockAssignment } from "../actions/use-stock-report-actions";
import { STOCK_REPORT_ACTIONS_SURFACE_ID, type StockReportDetailSurfaceProps } from "../surface-ids";

export function StockReportDetailSlidePage(): React.JSX.Element {
  const { stockNeedId = "" } = useSurfaceProps<StockReportDetailSurfaceProps>();
  const queryClient = useQueryClient();
  const header = useSurfaceHeader();
  const { close, open } = useSurface();
  const permissions = useStockReportPermissions();
  const openers = useStockReportOpeners();
  const createAssignment = useCreateStockAssignment();
  const removeAssignment = useRemoveStockAssignment(stockNeedId);
  const row = queryClient.getQueriesData<StockReportItem[]>({ queryKey: stockReportKeys.lists() }).flatMap(([, rows]) => rows ?? []).find((item) => item.client_id === stockNeedId);
  const viewModel = row ? toStockReportItemViewModel(row) : null;
  const assignments = useStockReportAssignmentsQuery(stockNeedId);
  const isMissing = assignments.error instanceof Error && "status" in assignments.error && (assignments.error as { status: number }).status === 404;
  useEffect(() => { if (viewModel) header?.setTitle(viewModel.card.title); }, [header, viewModel]);
  useEffect(() => { if (isMissing) close("stock-report-detail-slide"); }, [close, isMissing]);
  if (!viewModel) return <div className="p-4 text-sm text-muted-foreground">Loading stock need…</div>;
  const cards = (assignments.data ?? []).map((assignment) => ({ taskId: assignment.task_id, task: assignment.task ?? {}, item: assignment.item ?? {}, imageUrl: null, statePill: assignment.state ? { label: assignment.state.replaceAll("_", " "), variant: "neutral" } : undefined }) as unknown as StockReportAssignmentCardData);
  return <StockReportDetailView assignments={cards} canAssign={permissions.canAssign} errorMessage={assignments.error instanceof Error ? assignments.error.message : undefined} imageUrl={viewModel.card.imageUrl} isMissing={isMissing} onAddItem={() => openers.openTaskCreation?.(stockNeedId, { afterCreate: async ({ result }) => {
    const taskId = (result as { client_id?: string }).client_id;
    const itemId = (result as { item_id?: string }).item_id;
    if (!taskId || !itemId) return "reset-stay";
    try { await createAssignment.mutateAsync({ stockReportItemId: stockNeedId, taskId, itemId, overridePropertyMismatch: false }); return "close"; } catch { return "reset-stay"; }
  } })} onRefresh={() => assignments.refetch().then(() => undefined)} onRetry={() => void assignments.refetch()} onTapActions={permissions.canAssign ? (_taskId, itemId) => { if (itemId) open(STOCK_REPORT_ACTIONS_SURFACE_ID, { onRemove: () => removeAssignment.mutate(itemId) }); } : undefined} onTapCard={permissions.isWorker ? undefined : openers.openTaskDetail} onTapImage={openers.openImageViewer} propertyTags={viewModel.card.propertyTags} quantities={viewModel.card.quantities} status={assignments.isPending ? "loading" : assignments.isError ? "error" : "ready"} title={viewModel.card.title} />;
}
