import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { humanizeStepState, STEP_STATE_VARIANT } from "@beyo/tasks";
import { ImagePlaceholder, StatePill } from "@beyo/ui";
import { useTransitionStepState } from "@/features/task_steps/actions/use-transition-step-state";
import type { StepDependencyWarningSheetSurfaceProps } from "@/features/task_steps/surface-ids";

export function StepDependencyWarningSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { closeTop } = useSurface();
  const {
    stepId,
    taskId,
    workingSectionId,
    incompleteDependencies,
    onConfirm,
  } =
    useSurfaceProps<StepDependencyWarningSheetSurfaceProps>();
  const { transitionStepState, isPending } = useTransitionStepState();

  const resolvedStepId =
    stepId ?? ("" as StepDependencyWarningSheetSurfaceProps["stepId"]);
  const resolvedTaskId =
    taskId ?? ("" as StepDependencyWarningSheetSurfaceProps["taskId"]);
  const resolvedWorkingSectionId =
    workingSectionId ??
    ("" as StepDependencyWarningSheetSurfaceProps["workingSectionId"]);
  const dependencies = incompleteDependencies ?? [];

  useEffect(() => {
    header?.setTitle("Dependencies incomplete");
    header?.setActions(null);
  }, [header]);

  function closeSheet() {
    if (header) {
      header.requestClose();
      return;
    }

    closeTop();
  }

  function handleStartAnyway() {
    if (isPending) {
      return;
    }

    if (onConfirm) {
      onConfirm();
      closeSheet();
      return;
    }

    transitionStepState({
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      new_state: "working",
      working_section_id: resolvedWorkingSectionId,
    });
    closeSheet();
  }

  return (
    <div
      className="flex flex-col gap-5 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="step-dependency-warning-sheet"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-[#f0c36a] bg-[#fff8e8] p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffe9b3] text-[#8a5a00]">
          <AlertTriangle className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Some prerequisite steps are still unfinished.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the working sections below or start this step anyway.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Incomplete dependencies
        </p>
        <div
          className="flex gap-3 overflow-x-auto pb-1"
          data-testid="step-dependency-warning-list"
        >
          {dependencies.map((dependency, index) => (
            <div
              key={`${dependency.workingSectionClientId}-${index}-${dependency.prerequisiteStepState}`}
              className="flex min-h-44 w-36 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="aspect-square overflow-hidden ">
                {dependency.imageUrl ? (
                  <img
                    alt=""
                    className="size-full object-cover"
                    decoding="async"
                    draggable={false}
                    src={dependency.imageUrl}
                  />
                ) : (
                  <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {dependency.name}
                </p>
                <StatePill
                  className="self-start"
                  label={humanizeStepState(dependency.prerequisiteStepState)}
                  variant={STEP_STATE_VARIANT[dependency.prerequisiteStepState]}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="step-dependency-warning-start-anyway"
          disabled={isPending}
          onClick={handleStartAnyway}
        >
          Start anyway
        </button>
        <button
          type="button"
          className="w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground disabled:opacity-50"
          data-testid="step-dependency-warning-close"
          disabled={isPending}
          onClick={closeSheet}
        >
          Close
        </button>
      </div>
    </div>
  );
}
