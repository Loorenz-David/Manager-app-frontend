import { useController, useFormContext } from "react-hook-form";

import {
  DateRangeFieldTrigger,
  FieldErrorPill,
  formatDateDisplay,
} from "@beyo/ui";

type CalendarRangePickerProps = {
  currentFrom: string | null;
  currentTo: string | null;
  initialTarget?: "from" | "to";
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
  fromLabel?: string;
  toLabel?: string;
};

type TaskDeliveryDateFieldProps = {
  onOpenCalendarRangePicker?: (props: CalendarRangePickerProps) => void;
};

export function TaskDeliveryDateField({
  onOpenCalendarRangePicker,
}: TaskDeliveryDateFieldProps = {}): React.JSX.Element {
  const { control } = useFormContext();
  const { field: startField, fieldState: startState } = useController({
    name: "scheduled_start_at",
    control,
  });
  const { field: endField, fieldState: endState } = useController({
    name: "scheduled_end_at",
    control,
  });
  const invalid = Boolean(startState.error) || Boolean(endState.error);

  function handlePress(initialTarget: "from" | "to") {
    onOpenCalendarRangePicker?.({
      currentFrom: startField.value ?? null,
      currentTo: endField.value ?? null,
      initialTarget,
      onFromSelect: (iso: string | null) => startField.onChange(iso),
      onToSelect: (iso: string | null) => endField.onChange(iso),
    });
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="task-delivery-date-field">
      <div className="flex items-center justify-between gap-3">
        <label
          className="text-sm font-medium text-muted-foreground"
          htmlFor="task-delivery-range"
        >
          Delivery window
        </label>
        <FieldErrorPill
          data-testid="task-delivery-date-error"
          message={startState.error?.message ?? endState.error?.message}
        />
      </div>
      <DateRangeFieldTrigger
        data-testid="task-delivery-date-input"
        fromPlaceholder="Start date"
        fromValue={formatDateDisplay(startField.value)}
        id="task-delivery-range"
        invalid={invalid}
        onPress={handlePress}
        toPlaceholder="End date"
        toValue={formatDateDisplay(endField.value)}
      />
    </div>
  );
}
