import { Controller, useFormContext } from "react-hook-form";

import { SwitchCheckbox } from "@beyo/ui";

import type { ForceTaskReadyFormValues } from "./force-task-ready-form";

export function ForceTaskReadyMarkInaccurateField(): React.JSX.Element {
  const { control } = useFormContext<ForceTaskReadyFormValues>();

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
      data-testid="force-task-ready-mark-inaccurate-field"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">
          Flag recorded time as inaccurate
        </span>
        <span className="text-xs text-muted-foreground">
          Discounts time accrued on interrupted steps from stats.
        </span>
      </div>
      <Controller
        control={control}
        name="mark_inaccurate"
        render={({ field }) => (
          <SwitchCheckbox
            checked={field.value}
            data-testid="force-task-ready-mark-inaccurate-switch"
            name={field.name}
            onBlur={field.onBlur}
            onChange={(event) => field.onChange(event.target.checked)}
            ref={field.ref}
          />
        )}
      />
    </div>
  );
}
