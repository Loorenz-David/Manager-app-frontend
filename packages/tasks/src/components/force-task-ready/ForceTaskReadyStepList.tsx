import { cn } from "@beyo/lib";
import { BackendImage, ImagePlaceholder, StatePill } from "@beyo/ui";

import { useForceTaskReadyContext } from "../../providers/ForceTaskReadyProvider";
import type { ForceTaskReadyStepViewModel } from "../../types";

/**
 * Read-only twin of the working-section picker box: same image column, border
 * and height, with the step's current state pinned on the right. It is not
 * pressable — the list is an impact preview, not a selection.
 */
function ForceTaskReadyStepBox({
  step,
}: {
  step: ForceTaskReadyStepViewModel;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex min-h-14 w-full items-stretch overflow-hidden rounded-xl border border-border bg-card pl-2 text-foreground",
      )}
      data-testid={`force-task-ready-step-box-${step.stepId}`}
    >
      <div
        aria-hidden="true"
        className="w-16 shrink-0 self-stretch overflow-hidden"
      >
        <BackendImage
          aria-hidden="true"
          className="size-full object-cover"
          fallback={
            <ImagePlaceholder
              className="bg-transparent"
              iconClassName="size-5 opacity-50"
            />
          }
          src={step.imageUrl}
        />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {step.sectionName}
        </span>
        <StatePill
          className="shrink-0"
          label={step.stateLabel}
          variant={step.stateVariant}
        />
      </div>
    </div>
  );
}

function ForceTaskReadyStepListSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-14 w-full animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export function ForceTaskReadyStepList(): React.JSX.Element {
  const { steps, isLoading, isError } = useForceTaskReadyContext();

  return (
    <div
      className="flex flex-col gap-1.5"
      data-testid="force-task-ready-step-list"
    >
      <span className="text-sm font-medium text-muted-foreground">
        Steps that will be skipped
      </span>

      {isLoading ? (
        <ForceTaskReadyStepListSkeleton />
      ) : isError ? (
        <p
          className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-destructive"
          data-testid="force-task-ready-step-list-error"
        >
          Task steps could not be loaded.
        </p>
      ) : steps.length === 0 ? (
        <p
          className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
          data-testid="force-task-ready-step-list-empty"
        >
          No open steps. The task will move straight to ready.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {steps.map((step) => (
            <ForceTaskReadyStepBox key={step.stepId} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}
