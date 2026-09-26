import { useEffect } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { StockReportLegendSheetContent } from "../components/sheets/StockReportLegendSheetContent";
import type { StockReportLegendSurfaceProps } from "../surface-ids";

const EMPTY = { requested: 0, fulfilled: 0, inProgress: 0, inQueue: 0, missing: 0 };

/** The bar's legend, opened from the detail summary card; no header, like the ⋮ menu. */
export function StockReportLegendSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<StockReportLegendSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Bar legend");
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header]);

  return <StockReportLegendSheetContent quantities={props.quantities ?? EMPTY} />;
}
