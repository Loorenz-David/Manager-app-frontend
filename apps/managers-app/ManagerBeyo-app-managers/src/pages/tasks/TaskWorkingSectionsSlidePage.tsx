import { useEffect } from "react";

import {
  ContentCard,
  StagedForm,
  StagedFormStep,
} from "@/components/primitives";
import { TaskWorkingSectionsStepList } from "@/features/tasks/components/TaskWorkingSectionsStepList";
import {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "@/features/tasks/providers/TaskWorkingSectionsProvider";
import { preloadWorkingSectionWorkerPickerSurface } from "@/features/working-sections/surfaces";
import { usePreloadSurface } from "@/hooks/use-preload-surface";
import type { TaskWorkingSectionsSurfaceProps } from "@/features/tasks/surfaces";
import { useStagedForm } from "@/hooks/use-staged-form";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";

function TaskWorkingSectionsSlidePageContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useTaskWorkingSectionsContext();
  const staged = useStagedForm({
    steps: [
      { id: "selected", title: "Selected" },
      { id: "live-flow", title: "Live Flow" },
      { id: "stats", title: "Stats" },
    ],
    mode: "free",
  });

  usePreloadSurface(preloadWorkingSectionWorkerPickerSurface);

  useEffect(() => {
    header?.setTitle("Working Sections");
    header?.setActions(null);
    header?.setCloseInterceptor(
      controller.hasUnsavedChanges ? controller.handleCloseWithGuard : null,
    );

    return () => {
      header?.setCloseInterceptor(null);
    };
  }, [
    controller.handleCloseWithGuard,
    controller.hasUnsavedChanges,
    header,
  ]);

  if (controller.isPending) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading working sections…
      </div>
    );
  }

  if (controller.isError || !controller.taskDetail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Working sections could not be loaded.
        </p>
        <button
          type="button"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          onClick={() => {
            void controller.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <StagedForm
      activeStepId={staged.activeStepId}
      data-testid="task-working-sections-slide-page"
      direction={staged.direction}
      isAdvancing={staged.isAdvancing}
      isFirstStep={staged.isFirstStep}
      isLastStep={staged.isLastStep}
      navigationMode={staged.navigationMode}
      onAdvance={staged.advance}
      onBack={staged.back}
      onNavigate={staged.navigateTo}
      footer={
        controller.hasUnsavedChanges ? (
          <div className="bg-background px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]">
            <button
              className="w-full rounded-2xl bg-(--color-primary) px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="task-working-sections-save-button"
              disabled={controller.isSaving}
              type="button"
              onClick={() => {
                void controller.handleSaveAndClose();
              }}
            >
              {controller.isSaving ? "Saving..." : "Save & Close"}
            </button>
          </div>
        ) : undefined
      }
      showNavigation={false}
      stepStatusMap={staged.stepStatusMap}
      steps={staged.steps}
    >
      <StagedFormStep id="selected" className="px-0">
        <div className="flex flex-col gap-4 px-3">
          <TaskWorkingSectionsStepList />
        </div>
      </StagedFormStep>

      <StagedFormStep id="live-flow" className="px-0">
        <div className="px-6">
          <ContentCard>
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </ContentCard>
        </div>
      </StagedFormStep>

      <StagedFormStep id="stats" className="px-0">
        <div className="px-6">
          <ContentCard>
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          </ContentCard>
        </div>
      </StagedFormStep>
    </StagedForm>
  );
}

export function TaskWorkingSectionsSlidePage(): React.JSX.Element {
  const {
    taskId,
    recoveredPendingAdds,
    recoveredPendingRemoveIds,
    recoveredPendingReassignments,
  } = useSurfaceProps<TaskWorkingSectionsSurfaceProps>();

  if (!taskId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Task id is missing.
      </div>
    );
  }

  return (
    <TaskWorkingSectionsProvider
      initialPendingAdds={recoveredPendingAdds}
      initialPendingReassignments={recoveredPendingReassignments}
      initialPendingRemoveIds={recoveredPendingRemoveIds}
      taskId={taskId}
    >
      <TaskWorkingSectionsSlidePageContent />
    </TaskWorkingSectionsProvider>
  );
}
