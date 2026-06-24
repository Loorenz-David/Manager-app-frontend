import { Sparkles } from "lucide-react";
import { useController, useFormContext } from "react-hook-form";

import { cn } from "@beyo/lib";
import { FieldErrorPill } from "@beyo/ui";

import { useNeedsCleaningPickerFlow } from "../flows/use-needs-cleaning-picker.flow";

export function NeedsCleaningPickerField(): React.JSX.Element {
  const { control } = useFormContext();
  const flow = useNeedsCleaningPickerFlow();
  const { field, fieldState } = useController({
    name: "needs_cleaning_assignment",
    control,
    defaultValue: null,
  });

  function handlePress(): void {
    if (flow.sections.length === 0) {
      return;
    }

    if (field.value) {
      field.onChange(null);
      return;
    }

    field.onChange({
      working_section_id: flow.sections[0].client_id,
      assigned_worker_id: null,
    });
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="needs-cleaning-picker-field">
      <div
        aria-disabled={!field.value && flow.sections.length === 0}
        aria-pressed={field.value !== null && field.value !== undefined}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          !field.value && flow.sections.length === 0 && "cursor-not-allowed opacity-50",
          field.value
            ? "border-primary bg-primary text-card"
            : "border-border bg-card text-foreground",
        )}
        data-testid="needs-cleaning-picker-card"
        role="button"
        tabIndex={0}
        onClick={handlePress}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handlePress();
          }
        }}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            field.value ? "bg-white/16 text-card" : "bg-muted text-icon",
          )}
        >
          <Sparkles className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium">Needs cleaning</span>
          <span
            className={cn(
              "truncate text-xs transition-colors duration-150",
              field.value ? "text-card/80" : "text-muted-foreground",
            )}
          >
            {field.value
              ? "Selected"
              : flow.isLoading
                ? "Loading working sections..."
                : "Tap to select"}
          </span>
        </span>
      </div>

      <FieldErrorPill
        data-testid="needs-cleaning-picker-error"
        message={fieldState.error?.message}
      />
    </div>
  );
}
