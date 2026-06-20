import { useEffect, useState } from "react";
import { BoxPicker, ImagePlaceholder } from "@beyo/ui";
import { humanizeStepState } from "@beyo/tasks";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { PinTaskStepStatesSheetSurfaceProps } from "@/features/task_steps/surface-ids";
import type { StepState } from "@/features/task_steps/types";

export function PinTaskStepStatesSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { closeTop } = useSurface();
  const props = useSurfaceProps<PinTaskStepStatesSheetSurfaceProps>();
  const [selectedStates, setSelectedStates] = useState<StepState[]>(
    props.selectedStates ?? [],
  );

  useEffect(() => {
    header?.setTitle("Step states");
    header?.setActions(null);
  }, [header]);

  const currentState = props.currentState ?? "pending";

  function apply() {
    props.onApply?.(selectedStates);
    closeTop();
  }

  return (
    <div
      className="flex flex-col gap-5 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="pin-task-step-states-sheet"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        <div className="size-14 shrink-0 overflow-hidden rounded-lg ">
          {props.imageUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              src={props.imageUrl}
            />
          ) : (
            <ImagePlaceholder iconClassName="size-5 text-muted-foreground/60" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {props.label ?? "Task step"}
          </p>
          <p className="text-xs text-muted-foreground">
            Current: {humanizeStepState(currentState)}
          </p>
        </div>
      </div>

      <BoxPicker<StepState>
        mode="multiple"
        columns={2}
        options={[
          { value: "pending", label: "Pending" },
          { value: "working", label: "Working" },
          { value: "paused", label: "Paused" },
          { value: "completed", label: "Completed" },
        ]}
        showDescription={false}
        value={selectedStates}
        data-testid="pin-task-step-state-picker"
        onValueChange={setSelectedStates}
      />

      <button
        type="button"
        className="min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card disabled:opacity-50"
        data-testid="pin-task-step-states-apply"
        onClick={apply}
      >
        Apply
      </button>
    </div>
  );
}
