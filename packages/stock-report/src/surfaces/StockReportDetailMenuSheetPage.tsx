import { useEffect } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { StockReportDetailMenuSheetContent } from "../components/sheets/StockReportDetailMenuSheetContent";
import type { StockReportDetailMenuSurfaceProps } from "../surface-ids";

export function StockReportDetailMenuSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<StockReportDetailMenuSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Stock need actions");
    header?.setActions(null);
  }, [header]);

  return (
    <StockReportDetailMenuSheetContent
      disabled={props.disabled}
      markable={props.markable ?? 0}
      missing={props.missing ?? 0}
      onMarkMissing={() => {
        props.onMarkMissing?.();
        header?.requestClose();
      }}
      onUnmarkMissing={() => {
        props.onUnmarkMissing?.();
        header?.requestClose();
      }}
    />
  );
}
