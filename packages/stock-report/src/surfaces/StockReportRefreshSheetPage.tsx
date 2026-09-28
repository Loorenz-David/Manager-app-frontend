import { useEffect } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useRefreshStockReportVersionRequested } from "../actions/use-stock-report-actions";
import { StockReportRefreshSheetContent } from "../components/sheets/StockReportRefreshSheetContent";
import type { StockReportRefreshSurfaceProps } from "../surface-ids";

/** The request is sent only from here (OC-12); the command toasts "N changed, M added". */
export function StockReportRefreshSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { versionId = "" } = useSurfaceProps<StockReportRefreshSurfaceProps>();
  const refresh = useRefreshStockReportVersionRequested(versionId);

  useEffect(() => {
    header?.setTitle("Refresh from Scanner");
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header]);

  function send(keepManualRequested: boolean): void {
    refresh.mutate({ keepManualRequested }, { onSuccess: () => header?.requestClose() });
  }

  return (
    <StockReportRefreshSheetContent
      disabled={refresh.isPending}
      onKeepTyped={() => send(true)}
      onReplaceTyped={() => send(false)}
    />
  );
}
