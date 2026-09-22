import { useState } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { MajorCategory } from "@beyo/lib";
import { StockReportFilterSheetContent } from "../components/sheets/StockReportFilterSheetContent";
import type { StockReportFilterSurfaceProps } from "../surface-ids";

export function StockReportFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<StockReportFilterSurfaceProps>();
  const [draft, setDraft] = useState<MajorCategory | null>(props.current ?? null);

  return (
    <StockReportFilterSheetContent
      value={draft}
      // The picker cannot deselect on its own; tapping the selected category
      // again means "all".
      onChange={(next) => setDraft((current) => (current === next ? null : next))}
      onClear={() => setDraft(props.initial ?? null)}
      onApply={() => {
        props.onApply?.(draft);
        header?.requestClose();
      }}
    />
  );
}
