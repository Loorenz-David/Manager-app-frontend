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
      className={disabled ? "pointer-events-none opacity-60" : undefined}
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
