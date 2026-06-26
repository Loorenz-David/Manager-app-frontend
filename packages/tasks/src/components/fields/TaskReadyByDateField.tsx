import { useController, useFormContext } from "react-hook-form";

import {
  DateFieldTrigger,
  FieldErrorPill,
  formatDateDisplay,
} from "@beyo/ui";

import { TASK_READY_BY_QUICK_SELECT_OPTIONS } from "./task-ready-by-quick-select-options";

type CalendarQuickSelectOption = {
  id: string;
  label: string;
  amount: number;
  unit: "day" | "week" | "month";
};

type CalendarSinglePickerProps = {
  currentValue: string | null;
  onSelect: (isoString: string | null) => void;
  title?: string;
  minDate?: Date;
  maxDate?: Date;
  quickSelectOptions?: CalendarQuickSelectOption[];
};

type TaskReadyByDateFieldProps = {
  onOpenCalendarSinglePicker?: (props: CalendarSinglePickerProps) => void;
};

export function TaskReadyByDateField({
  onOpenCalendarSinglePicker,
}: TaskReadyByDateFieldProps = {}): React.JSX.Element {
  const { control } = useFormContext();
  const { field, fieldState } = useController({
    name: "ready_by_at",
    control,
  });
  const invalid = Boolean(fieldState.error);

  function handlePress() {
    onOpenCalendarSinglePicker?.({
      currentValue: field.value ?? null,
      onSelect: (iso: string | null) => field.onChange(iso),
      quickSelectOptions: TASK_READY_BY_QUICK_SELECT_OPTIONS,
      title: "Select due date",
    });
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="task-ready-by-date-field">
      <div className="flex items-center justify-between gap-3">
        <label
          className="text-sm font-medium text-muted-foreground"
          htmlFor="task-ready-by-date"
        >
          Due date
        </label>
        <FieldErrorPill
          data-testid="task-ready-by-date-error"
          message={fieldState.error?.message}
        />
      </div>
      <DateFieldTrigger
        data-testid="task-ready-by-date-input"
        id="task-ready-by-date"
        invalid={invalid}
        onPress={handlePress}
        placeholder="Select due date"
        value={formatDateDisplay(field.value)}
      />
    </div>
  );
}
