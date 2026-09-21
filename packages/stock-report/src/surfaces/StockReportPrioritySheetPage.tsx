import { useSurface, useSurfaceProps } from "@beyo/hooks";
import { StockReportPrioritySheetContent } from "../components/sheets/StockReportPrioritySheetContent";
import type { StockReportPrioritySurfaceProps } from "../surface-ids";

export function StockReportPrioritySheetPage(): React.JSX.Element {
  const { close } = useSurface();
  const props = useSurfaceProps<StockReportPrioritySurfaceProps>();
  return <StockReportPrioritySheetContent current={props.current ?? "unset"} onSelect={(value) => { props.onSelect?.(value === "unset" ? null : value); close("stock-report-priority-sheet"); }} />;
}
