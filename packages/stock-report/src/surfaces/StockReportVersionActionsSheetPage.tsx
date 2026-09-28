import { useEffect } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { useSurfaceStore } from "@beyo/ui";

import { useDeleteStockReportVersion } from "../actions/use-stock-report-actions";
import { useStockReportVersionQuery } from "../api/use-stock-report-queries";
import { ROW_CLASS } from "../components/sheets/StockReportDetailMenuSheetContent";
import { StockReportVersionActionsSheetContent } from "../components/sheets/StockReportVersionActionsSheetContent";
import { stockReportRequestFailureMessage } from "../lib/stock-report-request-failure";
import {
  STOCK_REPORT_ACTIVATE_SURFACE_ID,
  STOCK_REPORT_REFRESH_SURFACE_ID,
  STOCK_REPORT_VERSION_FORM_SURFACE_ID,
  type StockReportActivateSurfaceProps,
  type StockReportVersionActionsSurfaceProps,
} from "../surface-ids";

export function StockReportVersionActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { versionId = "" } = useSurfaceProps<StockReportVersionActionsSurfaceProps>();
  const version = useStockReportVersionQuery(versionId);
  const remove = useDeleteStockReportVersion(versionId);

  // Self-explanatory rows need no heading, as on the stock need's menu.
  useEffect(() => {
    header?.setTitle("Version actions");
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header]);

  // This menu is a launcher (projection R19, the house order): the destination
  // opens on top at once while the menu animates away beneath it, so closing
  // the destination returns to the page under the menu.
  function openAndDismiss(surfaceId: string, props: Record<string, unknown>): void {
    useSurfaceStore.getState().open(surfaceId, props);
    header?.requestClose();
  }

  if (version.isPending) {
    return (
      <div className="flex flex-col gap-2 px-4 pb-4" data-testid="stock-report-version-actions-skeleton">
        {[0, 1, 2].map((index) => (
          <div key={index} className={`${ROW_CLASS} animate-pulse`} />
        ))}
      </div>
    );
  }

  if (!version.data) {
    return (
      <p className="px-5 pb-6 pt-2 text-sm text-muted-foreground" data-testid="stock-report-version-actions-error">
        {stockReportRequestFailureMessage(version.error)}
      </p>
    );
  }

  const activateProps: StockReportActivateSurfaceProps = { mode: "activate", versionId };
  return (
    <StockReportVersionActionsSheetContent
      disabled={remove.isPending}
      state={version.data.state}
      onActivate={() => openAndDismiss(STOCK_REPORT_ACTIVATE_SURFACE_ID, activateProps)}
      onDelete={() => remove.mutate(undefined, { onSuccess: () => header?.requestClose() })}
      onEdit={() => openAndDismiss(STOCK_REPORT_VERSION_FORM_SURFACE_ID, { versionId })}
      onRefresh={() => openAndDismiss(STOCK_REPORT_REFRESH_SURFACE_ID, { versionId })}
    />
  );
}
