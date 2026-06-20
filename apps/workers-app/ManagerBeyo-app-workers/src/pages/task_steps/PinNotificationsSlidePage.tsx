import { useEffect } from "react";
import { Pin } from "lucide-react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { TaskId } from "@beyo/lib";
import { cn } from "@beyo/lib";
import {
  BoxPicker,
  ContentCard,
  HorizontalScrollArea,
  ImagePlaceholder,
  StatePill,
} from "@beyo/ui";
import {
  humanizeStepState,
  STEP_STATE_VARIANT,
  useTaskStepsByTaskQuery,
  type TaskStepForPin,
} from "@beyo/tasks";
import {
  PIN_TASK_STEP_STATES_SHEET_SURFACE_ID,
  type PinNotificationsSlideSurfaceProps,
  type PinTaskStepStatesSheetSurfaceProps,
} from "@/features/task_steps/surface-ids";
import type { StepState } from "@/features/task_steps/types";
import {
  PinNotificationsProvider,
  usePinNotificationsContext,
} from "@/features/task_steps/providers/PinNotificationsProvider";
import {
  WORKER_UPHOLSTERY_PIN_STATES,
} from "@/features/task_steps/controllers/use-pin-notifications.controller";

function TaskStepBox({
  step,
  selectedStates,
  onOpen,
}: {
  step: TaskStepForPin;
  selectedStates: StepState[];
  onOpen: () => void;
}): React.JSX.Element {
  const selected = selectedStates.length > 0;
  const imageUrl = step.working_section_image ?? null;
  const label = step.working_section_name ?? "Working section";

  return (
    <button
      type="button"
      className={cn(
        "flex min-h-44 w-36 shrink-0 flex-col overflow-hidden rounded-2xl border text-left transition",
        selected
          ? "border-primary bg-primary text-card"
          : "border-border bg-card text-foreground",
      )}
      data-testid={`pin-task-step-box-${step.client_id}`}
      onClick={onOpen}
    >
      <div className="aspect-square overflow-hidden ">
        {imageUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            src={imageUrl}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-medium">{label}</p>
        <StatePill
          className="self-start"
          label={humanizeStepState(step.state)}
          variant={STEP_STATE_VARIANT[step.state]}
        />
        {selected ? (
          <p className="text-xs font-medium">
            {selectedStates.length} state
            {selectedStates.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function PinTaskStepPicker(): React.JSX.Element {
  const surface = useSurface();
  const controller = usePinNotificationsContext();
  const stepsQuery = useTaskStepsByTaskQuery(controller.taskId);

  if (stepsQuery.isLoading) {
    return (
      <HorizontalScrollArea className="pb-1">
        <div className="flex gap-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-44 w-36 shrink-0 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      </HorizontalScrollArea>
    );
  }

  if (stepsQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        Task steps could not be loaded.
      </p>
    );
  }

  const steps = stepsQuery.data ?? [];

  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No task steps found.</p>
    );
  }

  return (
    <HorizontalScrollArea className="pb-1" data-testid="pin-task-step-picker">
      <div className="flex gap-3">
        {steps.map((step) => {
          const states = controller.getStates(
            "task_step",
            step.client_id,
          ) as StepState[];
          const label = step.working_section_name ?? "Working section";

          return (
            <TaskStepBox
              key={step.client_id}
              selectedStates={states}
              step={step}
              onOpen={() => {
                surface.open(PIN_TASK_STEP_STATES_SHEET_SURFACE_ID, {
                  stepId: step.client_id,
                  label,
                  imageUrl: step.working_section_image ?? null,
                  currentState: step.state,
                  selectedStates: states,
                  onApply: (nextStates: StepState[]) => {
                    controller.setStates(
                      "task_step",
                      step.client_id,
                      nextStates,
                    );
                  },
                } satisfies PinTaskStepStatesSheetSurfaceProps);
              }}
            />
          );
        })}
      </div>
    </HorizontalScrollArea>
  );
}

function PinNotificationsForm(): React.JSX.Element {
  const controller = usePinNotificationsContext();
  const upholsteryEntry = controller.upholsteryEntry;
  const upholsteryStates = upholsteryEntry
    ? controller.getStates("item_upholstery", upholsteryEntry.client_id)
    : [];

  return (
    <div
      className="flex min-h-full flex-col gap-4 bg-background  pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-4"
      data-testid="pin-notifications-slide"
    >
      <ContentCard gapClassName="gap-3.5" data-testid="pin-notifications-card">
        {controller.isUpholsteryPending ||
        controller.isUpholsteryError ||
        upholsteryEntry ? (
          <div
            className="flex flex-col gap-4"
            data-testid="pin-notifications-upholstery-card"
          >
            <div className="flex items-center gap-2">
              <Pin className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Item upholstery
              </h2>
            </div>
            {controller.isUpholsteryPending ? (
              <div className="h-20 animate-pulse rounded-xl bg-muted" />
            ) : controller.isUpholsteryError ? (
              <p className="text-sm text-destructive">
                Upholstery could not be loaded.
              </p>
            ) : upholsteryEntry ? (
              <BoxPicker
                mode="multiple"
                columns={2}
                options={WORKER_UPHOLSTERY_PIN_STATES.map((option) => ({
                  ...option,
                  testId: `pin-upholstery-state-${option.value}`,
                }))}
                showDescription={false}
                value={upholsteryStates}
                data-testid="pin-upholstery-state-picker"
                onValueChange={(states) => {
                  controller.setStates(
                    "item_upholstery",
                    upholsteryEntry.client_id,
                    states,
                  );
                }}
              />
            ) : null}
          </div>
        ) : null}
        <div
          className="flex flex-col gap-3"
          data-testid="pin-notifications-task-steps-card"
        >
          <div className="flex items-center gap-2">
            <Pin className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Task steps
            </h2>
          </div>
          {/* <p className="text-xs text-muted-foreground">
            {WORKER_TASK_STEP_PIN_STATES.map((state) => state.label).join(", ")}
          </p> */}
          <PinTaskStepPicker />
        </div>
      </ContentCard>

      {controller.saveError ? (
        <p className="text-sm text-destructive">
          {controller.saveError.message}
        </p>
      ) : null}

      <div className="mt-auto px-4">
        <button
          type="button"
          className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="pin-notifications-submit"
          disabled={controller.isSaving || controller.isHydrating}
          onClick={() => void controller.submit()}
        >
          {controller.isSaving ? "Saving..." : "Save pins"}
        </button>
      </div>
    </div>
  );
}

export function PinNotificationsSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<PinNotificationsSlideSurfaceProps>();
  const taskId = (props.taskId ?? "") as TaskId;

  useEffect(() => {
    header?.setTitle("Pin notifications");
    header?.setActions(null);
  }, [header]);

  return (
    <PinNotificationsProvider itemId={props.itemId ?? null} taskId={taskId}>
      <PinNotificationsForm />
    </PinNotificationsProvider>
  );
}
