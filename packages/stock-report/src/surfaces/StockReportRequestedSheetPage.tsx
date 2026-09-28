import { useEffect } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useSetStockReportRequestedQuantity } from "../actions/use-stock-report-actions";
import { StockReportRequestedSheetContent } from "../components/sheets/StockReportRequestedSheetContent";
import { STOCK_REPORT_ACTIVE_SCOPE } from "../stock-report.types";
import type { StockReportRequestedSurfaceProps } from "../surface-ids";

/**
 * The mutation is optimistic (plan §E.2): the row changes at once, so the
 * sheet closes on the tap and a failure rolls back and toasts.
 */
export function StockReportRequestedSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<StockReportRequestedSurfaceProps>();
  const setRequested = useSetStockReportRequestedQuantity({
    versionId: props.versionId ?? "",
    scope: props.scope ?? STOCK_REPORT_ACTIVE_SCOPE,
  });

  useEffect(() => {
    header?.setTitle("Requested quantity");
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header]);

  function send(value: number | null): void {
    setRequested.mutate({ stockNeedId: props.stockNeedId ?? "", value });
    header?.requestClose();
  }

  return (
    <StockReportRequestedSheetContent
      current={props.current ?? 0}
      disabled={setRequested.isPending}
      scanner={props.scanner ?? 0}
      source={props.source ?? "scanner"}
      onBackToLive={() => send(null)}
      onSave={(value) => send(value)}
    />
  );
}
