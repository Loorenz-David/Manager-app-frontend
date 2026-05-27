import { useController, useFormContext } from 'react-hook-form';

import { FieldErrorPill } from '@/components/primitives';
import {
  DateFieldTrigger,
  formatDateDisplay,
  preloadCalendarSinglePickerSurface,
} from '@/components/primitives/date';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { usePreloadSurface } from '@/hooks/use-preload-surface';

import { TASK_READY_BY_QUICK_SELECT_OPTIONS } from './task-ready-by-quick-select-options';

/**
 * Binds to the flat `ready_by_at` path from `CreateTaskInputSchema`.
 * If a future compound form namespaces task fields, this path must change.
 */
export function TaskReadyByDateField() {
  const { control } = useFormContext();
  const { field, fieldState } = useController({
    name: 'ready_by_at',
    control,
  });
  const invalid = Boolean(fieldState.error);

  usePreloadSurface(preloadCalendarSinglePickerSurface);

  function handlePress() {
    useSurfaceStore.getState().open('calendar-single-picker', {
      currentValue: field.value ?? null,
      onSelect: (iso: string | null) => field.onChange(iso),
      quickSelectOptions: TASK_READY_BY_QUICK_SELECT_OPTIONS,
      title: 'Select due date',
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
