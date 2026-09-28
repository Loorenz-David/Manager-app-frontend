import { StockMatchWarningSheetContent } from "../components/sheets/StockMatchWarningSheetContent";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { StockMatchWarningSurfaceProps } from "../surface-ids";

export function StockMatchWarningSheetPage(): React.JSX.Element {
  const props = useSurfaceProps<StockMatchWarningSurfaceProps>();
  const header = useSurfaceHeader();
  // The sheet is opened with `dismissible: false`: only its button closes it,
  // through the surface's own animated close (never the store's `close`, which
  // unmounts the sheet before Vaul can slide it down).
  const closeAfter = (callback: () => void) => () => {
    callback();
    header?.requestClose();
  };

  if (props.kind === "mismatch" && props.failures && props.onChangeItem) {
    return (
      <StockMatchWarningSheetContent
        kind="mismatch"
        checkedAgainstStoredItem={props.checkedAgainstStoredItem}
        failures={props.failures}
        onChangeItem={closeAfter(props.onChangeItem)}
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
