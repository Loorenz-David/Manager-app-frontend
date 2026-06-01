import { useEffect, useState } from "react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker, type BoxPickerOptionType } from "@beyo/ui";
import { DEFAULT_STATE_FILTERS } from "@/features/task_steps/controllers/use-working-section-steps.controller";
import type { StepStateFilterSheetSurfaceProps } from "@/features/task_steps/surface-ids";
import type { StepState } from "@/features/task_steps/types";

const FILTER_OPTIONS: BoxPickerOptionType<StepState>[] = [
  {
    value: "pending",
    label: "Pending",
    testId: "filter-option-pending",
  },
  {
    value: "working",
    label: "Working",
    testId: "filter-option-working",
  },
  {
    value: "paused",
    label: "Paused",
    testId: "filter-option-paused",
  },
  {
    value: "ended_shift",
    label: "Ended shift",
    testId: "filter-option-ended-shift",
  },
  {
    value: "completed",
    label: "Completed",
    testId: "filter-option-completed",
  },
];

export function StepStateFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { closeTop } = useSurface();
  const { selectedStates, onApply } =
    useSurfaceProps<StepStateFilterSheetSurfaceProps>();
  const [localFilters, setLocalFilters] = useState<StepState[]>(
    selectedStates?.length ? selectedStates : DEFAULT_STATE_FILTERS,
  );

  useEffect(() => {
    header?.setTitle("Filter by state");
    header?.setActions(null);
  }, [header]);

  function closeSheet() {
    if (header) {
      header.requestClose();
      return;
    }

    closeTop();
  }

  function handleValueChange(newValues: StepState[]) {
    const justAdded = newValues.find((value) => !localFilters.includes(value));

    if (justAdded === "completed") {
      setLocalFilters(["completed"]);
      return;
    }

    if (justAdded !== undefined) {
      setLocalFilters(newValues.filter((value) => value !== "completed"));
      return;
    }

    if (newValues.length === 0) {
      return;
    }

    setLocalFilters(newValues);
  }

  function handleApply() {
    onApply?.(localFilters);
    closeSheet();
  }

  return (
    <div
      className="flex flex-col gap-6 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="step-state-filter-sheet"
    >
      <BoxPicker
        columns={2}
        data-testid="step-state-filter-picker"
        mode="multiple"
        onValueChange={handleValueChange}
        options={FILTER_OPTIONS}
        value={localFilters}
      />

      <button
        type="button"
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-card disabled:opacity-50"
        data-testid="step-state-filter-apply"
        disabled={localFilters.length === 0}
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  );
}
