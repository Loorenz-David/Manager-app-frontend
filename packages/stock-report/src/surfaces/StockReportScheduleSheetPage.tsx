import { useEffect, useState } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { StockReportScheduleSheetContent } from "../components/sheets/StockReportScheduleSheetContent";
import type { StockReportScheduleSurfaceProps } from "../surface-ids";

export function StockReportScheduleSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<StockReportScheduleSurfaceProps>();
  // One clock per opening, so "today" and "the past" cannot drift apart.
  const [now] = useState(() => Date.now());

  // Headerless like the other stock-report sheets; the title names the surface.
  useEffect(() => {
    header?.setTitle("Scheduled activation");
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header]);

  return (
    <StockReportScheduleSheetContent
      current={props.current ?? null}
      now={now}
      onDone={() => header?.requestClose()}
      onSelect={(iso) => props.onSelect?.(iso)}
    />
  );
}
