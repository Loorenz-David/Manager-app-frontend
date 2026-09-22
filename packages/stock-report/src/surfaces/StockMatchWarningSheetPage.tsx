import { StockMatchWarningSheetContent } from "../components/sheets/StockMatchWarningSheetContent";
import { useSurface, useSurfaceProps } from "@beyo/hooks";
import {
  STOCK_MATCH_WARNING_SURFACE_ID,
  type StockMatchWarningSurfaceProps,
} from "../surface-ids";

export function StockMatchWarningSheetPage(): React.JSX.Element {
  const props = useSurfaceProps<StockMatchWarningSurfaceProps>();
  const { close } = useSurface();
  const closeAfter = (callback: () => void) => () => {
    callback();
    close(STOCK_MATCH_WARNING_SURFACE_ID);
  };

  if (
    props.kind === "warning" &&
    props.failures &&
    props.onChangeItem &&
    props.onContinue
  ) {
    return (
      <StockMatchWarningSheetContent
        kind="warning"
        checkedAgainstStoredItem={props.checkedAgainstStoredItem}
        failures={props.failures}
        onChangeItem={closeAfter(props.onChangeItem)}
        onContinue={closeAfter(props.onContinue)}
      />
    );
  }

  const blocked = props as Partial<Extract<StockMatchWarningSurfaceProps, { kind: "blocked" }>>;
  return (
    <StockMatchWarningSheetContent
      kind="blocked"
      checkedAgainstStoredItem={blocked.checkedAgainstStoredItem}
      reasonText={blocked.reasonText ?? "This item cannot be added to this stock need."}
      onChangeItem={closeAfter(blocked.onChangeItem ?? (() => {}))}
    />
  );
}
