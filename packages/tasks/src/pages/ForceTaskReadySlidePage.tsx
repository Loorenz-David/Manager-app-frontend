import { useCallback, useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { ContentCard } from "@beyo/ui";

import {
  FORCE_TASK_READY_DEFAULT_VALUES,
  ForceTaskReadyFooter,
  ForceTaskReadyFormSchema,
  ForceTaskReadyMarkInaccurateField,
  ForceTaskReadyReasonField,
  ForceTaskReadyStepList,
  type ForceTaskReadyFormValues,
} from "../components/force-task-ready";
import {
  ForceTaskReadyProvider,
  useForceTaskReadyContext,
} from "../providers/ForceTaskReadyProvider";
import type { ForceTaskReadySlideSurfaceProps } from "../surface-ids";

function ForceTaskReadyWarning(): React.JSX.Element {
  const { stepCount, isLoading } = useForceTaskReadyContext();

  const impact = isLoading
    ? "Checking open steps…"
    : stepCount === 0
      ? "No open steps to skip."
      : stepCount === 1
        ? "1 step will be skipped."
        : `${stepCount} steps will be skipped.`;

  return (
    <div className="flex gap-3" data-testid="force-task-ready-warning">
      <TriangleAlert
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-warning"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{impact}</p>
        <p className="text-xs text-muted-foreground">
          Override — skipped steps don&apos;t count as completed work.
        </p>
      </div>
    </div>
  );
}

function ForceTaskReadyForm(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useForceTaskReadyContext();

  const form = useForm<ForceTaskReadyFormValues>({
    resolver: zodResolver(ForceTaskReadyFormSchema),
    defaultValues: FORCE_TASK_READY_DEFAULT_VALUES,
  });

  const reason = useWatch({ control: form.control, name: "reason" });

  // `ConfirmActionButton` is a plain button, so submission is triggered
  // through handleSubmit rather than a native form submit event.
  const handleConfirm = useCallback(() => {
    void form.handleSubmit((values) => {
      controller.submit({
        reason: values.reason,
        markInaccurate: values.mark_inaccurate,
      });
    })();
  }, [controller, form]);

  const isConfirmDisabled =
    !controller.canForce ||
    controller.isBlocked ||
    controller.isSubmitting ||
    controller.isLoading ||
    (reason ?? "").trim().length === 0;

  return (
    <FormProvider {...form}>
      <div className="flex h-full flex-col bg-background">
        {/* SlidePageSurface hands children a non-scrolling flex-1 box, so the
         * page owns its own scroll container — and therefore its own keyboard
         * inset padding (37_keyboard_aware_inputs, case B). */}
        <div className="flex-1 overflow-y-auto overscroll-y-none">
          <div className="flex min-h-full flex-col gap-4 px-4 pb-[calc(var(--safe-bottom,0px)+var(--keyboard-inset,0px)+1rem)] pt-2">
            <ContentCard
              data-testid="force-task-ready-card"
              gapClassName="gap-4"
            >
              <ForceTaskReadyWarning />

              {controller.isBlocked ? (
                <p
                  className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
                  data-testid="force-task-ready-blocked"
                >
                  {controller.blockedMessage}
                </p>
              ) : !controller.canForce ? (
                <p
                  className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
                  data-testid="force-task-ready-forbidden"
                >
                  Only admins and managers can force a task ready.
                </p>
              ) : (
                <ForceTaskReadyReasonField />
              )}
            </ContentCard>

            {!controller.isBlocked && controller.canForce ? (
              <ForceTaskReadyMarkInaccurateField />
            ) : null}

            <ForceTaskReadyStepList />

            {controller.errorMessage ? (
              <p
                className="text-sm text-destructive"
                data-testid="force-task-ready-error"
                role="alert"
              >
                {controller.errorMessage}
              </p>
            ) : null}

            <ForceTaskReadyFooter
              className="mt-auto"
              isConfirmDisabled={isConfirmDisabled}
              onBack={() => header?.requestClose()}
              onConfirm={handleConfirm}
            />
          </div>
        </div>
      </div>
    </FormProvider>
  );
}

export function ForceTaskReadySlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<ForceTaskReadySlideSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Force ready");
    header?.setActions(null);
  }, [header]);

  const handleCompleted = useCallback(() => {
    header?.requestClose();
  }, [header]);

  if (!taskId) {
    return (
      <div
        className="p-6 text-sm text-muted-foreground"
        data-testid="force-task-ready-slide"
      >
        Task id is missing.
      </div>
    );
  }

  return (
    <div className="h-full bg-background" data-testid="force-task-ready-slide">
      <ForceTaskReadyProvider onCompleted={handleCompleted} taskId={taskId}>
        <ForceTaskReadyForm />
      </ForceTaskReadyProvider>
    </div>
  );
}
