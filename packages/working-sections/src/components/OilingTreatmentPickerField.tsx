import { Droplets } from "lucide-react";
import { useController, useFormContext } from "react-hook-form";

import { cn } from "@beyo/lib";
import { FieldErrorPill } from "@beyo/ui";

import { useOilingTreatmentPickerFlow } from "../flows/use-oiling-treatment-picker.flow";

export function OilingTreatmentPickerField(): React.JSX.Element {
  const { control } = useFormContext();
  const flow = useOilingTreatmentPickerFlow();
  const { field, fieldState } = useController({
    name: "oiling_treatment_assignment",
    control,
    defaultValue: [],
  });

  const selectedAssignments = field.value ?? [];
  const isSelected = selectedAssignments.length > 0;

  function handlePress(): void {
    if (flow.sections.length === 0) {
      return;
    }

    if (isSelected) {
      field.onChange([]);
      return;
    }

    field.onChange(
      flow.sections.map((section) => ({
        working_section_id: section.client_id,
        assigned_worker_id: null,
      })),
    );
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="oiling-treatment-picker-field">
      <div
        aria-disabled={!isSelected && flow.sections.length === 0}
        aria-pressed={isSelected}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          !isSelected && flow.sections.length === 0 && "cursor-not-allowed opacity-50",
          isSelected
            ? "border-primary bg-primary text-card"
            : "border-border bg-card text-foreground",
        )}
        data-testid="oiling-treatment-picker-card"
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
            isSelected ? "bg-white/16 text-card" : "bg-muted text-icon",
          )}
        >
          <Droplets className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium">Oiling treatment</span>
          <span
            className={cn(
              "truncate text-xs transition-colors duration-150",
              isSelected ? "text-card/80" : "text-muted-foreground",
            )}
          >
            {isSelected
              ? `${selectedAssignments.length} selected`
              : flow.isLoading
                ? "Loading working sections..."
                : "Tap to select"}
          </span>
        </span>
      </div>

      <FieldErrorPill
        data-testid="oiling-treatment-picker-error"
        message={fieldState.error?.message}
      />
    </div>
  );
}
