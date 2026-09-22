import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import {
  stockAssignmentMismatchFailures,
  stockAssignmentRefusalReasons,
} from "../api/stock-report-api";
import { useStockReportAssignmentsQuery } from "../api/use-stock-report-queries";
import {
  useCreateStockAssignment,
  useRemoveStockAssignment,
} from "../actions/use-stock-report-actions";
import { stockReportKeys } from "../api/stock-report-keys";
import { StockReportDetailView } from "../components/detail/StockReportDetailView";
import { useStockAssignmentGate } from "../hooks/use-stock-assignment-gate";
import { useStockReportPermissions } from "../lib/use-stock-report-permissions";
import { stockAssignmentRefusalMessage } from "../lib/stock-assignment-messages";
import { useStockReportOpeners } from "../openers";
import {
  STOCK_REPORT_ACTIONS_SURFACE_ID,
  STOCK_REPORT_DETAIL_SURFACE_ID,
  type StockReportDetailSurfaceProps,
} from "../surface-ids";
import {
  toStockReportAssignmentCardData,
  toStockReportItemViewModel,
  type StockReportItem,
} from "../stock-report.types";

export function StockReportDetailSlidePage(): React.JSX.Element {
  const { stockNeedId = "" } = useSurfaceProps<StockReportDetailSurfaceProps>();
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
  const row = queryClient
    .getQueriesData<StockReportItem[]>({ queryKey: stockReportKeys.lists() })
    .flatMap(([, rows]) => rows ?? [])
    .find((item) => item.client_id === stockNeedId);
  const viewModel = row ? toStockReportItemViewModel(row) : null;
  const assignments = useStockReportAssignmentsQuery(stockNeedId);
  const isMissing =
    assignments.error instanceof Error &&
    "status" in assignments.error &&
    (assignments.error as { status: number }).status === 404;

  useEffect(() => {
    if (viewModel) header?.setTitle(viewModel.card.title);
  }, [header, viewModel]);
  useEffect(() => {
    if (isMissing) close(STOCK_REPORT_DETAIL_SURFACE_ID);
  }, [close, isMissing]);

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
      assignments={(assignments.data ?? []).map(
        toStockReportAssignmentCardData,
      )}
      canAssign={permissions.canAssign && Boolean(openers.openTaskCreation)}
      errorMessage={
        assignments.error instanceof Error
          ? assignments.error.message
          : undefined
      }
      imageUrl={viewModel.card.imageUrl}
      isMissing={isMissing}
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
      onTapCard={permissions.isWorker ? undefined : openers.openTaskDetail}
      onTapImage={(taskId) => {
        const assignment = (assignments.data ?? []).find(
          (entry) => entry.task_id === taskId,
        );
        const images = (assignment?.item?.item_images ?? []).flatMap((image) =>
          image.client_id && image.image_url
            ? [{ clientId: image.client_id, imageUrl: image.image_url }]
            : [],
        );
        if (images.length > 0)
          openers.openImageViewer?.(
            taskId,
            assignment?.item?.client_id ?? assignment?.item_id ?? null,
            images,
          );
      }}
      propertyTags={viewModel.card.propertyTags}
      quantities={viewModel.card.quantities}
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
