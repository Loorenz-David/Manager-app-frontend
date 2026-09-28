import { useEffect } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { StockReportDetailMenuSheetContent } from "../components/sheets/StockReportDetailMenuSheetContent";
import type { StockReportDetailMenuSurfaceProps } from "../surface-ids";

export function StockReportDetailMenuSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<StockReportDetailMenuSurfaceProps>();

  // Two self-explanatory rows need no heading (owner, 2026-09-26): the title
  // still names the surface, but the sheet's header is not drawn.
  useEffect(() => {
    header?.setTitle("Stock need actions");
    header?.setActions(null);
    header?.setHeaderHidden(true);
    return () => header?.setHeaderHidden(false);
  }, [header]);

  return (
    <StockReportDetailMenuSheetContent
      canMarkMissing={props.canMarkMissing ?? true}
      disabled={props.disabled}
      markable={props.markable ?? 0}
      missing={props.missing ?? 0}
      onFollowLive={
        props.onFollowLive
          ? () => {
              props.onFollowLive?.();
              header?.requestClose();
            }
          : undefined
      }
      onMarkMissing={() => {
        props.onMarkMissing?.();
        header?.requestClose();
      }}
      // The house order (projection R19): the destination opens first, on
      // top, and this menu dismisses beneath it.
      onSetRequested={
        props.onSetRequested
          ? () => {
              props.onSetRequested?.();
              header?.requestClose();
            }
          : undefined
      }
      onUnmarkMissing={() => {
        props.onUnmarkMissing?.();
        header?.requestClose();
      }}
    />
  );
}
