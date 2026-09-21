import { useSurface, useSurfaceProps } from "@beyo/hooks";
import { StockReportActionsSheetContent } from "../components/sheets/StockReportActionsSheetContent";
import type { StockReportActionsSurfaceProps } from "../surface-ids";
export function StockReportActionsSheetPage(): React.JSX.Element { const { close } = useSurface(); const props = useSurfaceProps<StockReportActionsSurfaceProps>(); return <StockReportActionsSheetContent disabled={props.disabled} onRemove={() => { props.onRemove?.(); close("stock-report-actions-sheet"); }} />; }
