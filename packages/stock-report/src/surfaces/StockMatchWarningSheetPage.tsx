import { StockMatchWarningSheetContent } from "../components/sheets/StockMatchWarningSheetContent";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { StockMatchWarningSurfaceProps } from "../surface-ids";

export function StockMatchWarningSheetPage(): React.JSX.Element {
  const props = useSurfaceProps<StockMatchWarningSurfaceProps>();
  const header = useSurfaceHeader();
  // The sheet is opened with `dismissible: false`: only these two buttons close
  // it, through the surface's own animated close (never the store's `close`,
  // which unmounts the sheet before Vaul can slide it down).
  const closeAfter = (callback: () => void) => () => {
    callback();
    header?.requestClose();
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
