import { PackageCheck, PackageX } from "lucide-react";

import { BoxPicker, type BoxPickerOptionType } from "@beyo/ui";

type KeepChoice = "keep" | "reset";

const OPTIONS: BoxPickerOptionType<KeepChoice>[] = [
  { value: "keep", label: "Keep the board's counts", icon: PackageCheck, testId: "stock-keep-missing-keep" },
  { value: "reset", label: "Start at 0", icon: PackageX, testId: "stock-keep-missing-reset" },
];

export type StockKeepMissingPickerProps = {
  /** `true` = the rows this draft typed no missing for keep the live version's counts (v9 §5.17). */
  value: boolean;
  onChange: (keepActiveMissing: boolean) => void;
  disabled?: boolean;
};

/**
 * The one choice an activation asks (OC-15, v9 §5.17): what happens to the
 * missing counts of the rows this draft never typed one for. Shared by the
 * activate and the schedule wordings of the activation sheet.
 */
export function StockKeepMissingPicker({ value, onChange, disabled = false }: StockKeepMissingPickerProps): React.JSX.Element {
  return (
    <BoxPicker
      columns={2}
      data-testid="stock-keep-missing-picker"
      mode="single"
      options={OPTIONS.map((option) => ({ ...option, disabled }))}
      value={value ? "keep" : "reset"}
      onValueChange={(choice) => onChange(choice === "keep")}
    />
  );
}
