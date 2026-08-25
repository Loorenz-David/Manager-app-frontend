import { cn } from "@beyo/lib";
import { BoxPicker } from "@beyo/ui";
import type { PauseReason } from "../types";
import { toPauseReasonPickerOption } from "../lib/pause-reason-view-model";

export type PauseReasonPickerProps = {
  reasons: PauseReason[];
  onSelect: (reason: PauseReason) => void;
  disabled?: boolean;
  "data-testid"?: string;
};

export function PauseReasonPicker({
  reasons,
  onSelect,
  disabled = false,
  "data-testid": testId = "pause-reason-picker",
}: PauseReasonPickerProps): React.JSX.Element {
  const options = reasons.map(toPauseReasonPickerOption);

  return (
    <div
      aria-disabled={disabled}
      className={cn(
        // Bleeds past the parent sheet's `px-4` so the scrollbar sits flush
        // against the device edge, then reapplies the same inset as padding
        // so the picker content still lines up with the rest of the sheet.
        "-mx-4 max-h-[400px] overflow-y-auto overscroll-y-contain px-4",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <BoxPicker
        columns={2}
        data-testid={testId}
        mode="single"
        onValueChange={(value) => {
          const reason = reasons.find((entry) => entry.client_id === value);
          if (reason) {
            onSelect(reason);
          }
        }}
        options={options}
        value={null}
      />
    </div>
  );
}
