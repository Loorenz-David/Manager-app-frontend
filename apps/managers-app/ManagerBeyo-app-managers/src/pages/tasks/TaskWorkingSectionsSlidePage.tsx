import { useEffect, useMemo } from "react";

import {
  ContentCard,
  StagedForm,
  StagedFormStep,
  WorkingSectionShortcutBar,
} from "@/components/primitives";
import { useScrollVisibilityContext } from "@/components/primitives/scroll-visibility";
import { TaskWorkingSectionsStepList } from "@/features/tasks/components/TaskWorkingSectionsStepList";
import {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "@/features/tasks/providers/TaskWorkingSectionsProvider";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "@/features/working-sections";
import { preloadWorkingSectionWorkerPickerSurface } from "@/features/working-sections/surfaces";
import { usePreloadSurface } from "@/hooks/use-preload-surface";
import type { TaskWorkingSectionsSurfaceProps } from "@/features/tasks/surfaces";
import { useStagedForm } from "@/hooks/use-staged-form";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { cn } from "@/lib/utils";

function TaskWorkingSectionsFooter({
  availableSections,
  selectedSectionIds,
  canShowShortcuts,
  hasUnsavedChanges,
  isSaving,
  onShortcutPress,
  onSaveAndClose,
}: {
  availableSections: ReturnType<
    typeof useTaskWorkingSectionsContext
  >["sectionEntries"][number]["section"][];
  selectedSectionIds: string[];
  canShowShortcuts: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onShortcutPress: (sectionIds: string[]) => void;
  onSaveAndClose: () => Promise<void>;
}): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();

  return (
    <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
      <div className="px-4 pb-4 pt-3">
      {canShowShortcuts ? (
        <div
          className={cn(
            "overflow-hidden transition-[max-height,margin,opacity] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isHidden ? "mb-0 max-h-0 opacity-0" : "mb-3 max-h-28 opacity-100",
          )}
        >
          <div
            className={cn(
              "transition-transform duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
              isHidden ? "translate-y-full" : "translate-y-0",
            )}
          >
            <WorkingSectionShortcutBar
              shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
              availableSections={availableSections}
              selectedSectionIds={selectedSectionIds}
              onShortcutPress={onShortcutPress}
              animationMode="translate"
              data-testid="task-working-sections-shortcut-bar"
              className="py-2"
              trackClassName="mt-3"
            />
          </div>
        </div>
      ) : null}

      <button
        className="w-full rounded-2xl bg-(--color-primary) px-5 py-3.5 text-md font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="task-working-sections-save-button"
        disabled={isSaving || !hasUnsavedChanges}
        type="button"
        onClick={() => {
          void onSaveAndClose();
        }}
      >
        {isSaving ? "Saving..." : "Save & Close"}
      </button>
      </div>
      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
    </div>
  );
}

function TaskWorkingSectionsSlidePageContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useTaskWorkingSectionsContext();
  const availableSections = useMemo(
    () => controller.sectionEntries.map((entry) => entry.section),
    [controller.sectionEntries],
  );
  const selectedSectionIds = useMemo(
    () =>
      controller.sectionEntries
        .filter((entry) => entry.isActive)
        .map((entry) => entry.section.client_id),
    [controller.sectionEntries],
  );
  const staged = useStagedForm({
    steps: [
      { id: "selected", title: "Selected" },
      { id: "live-flow", title: "Live Flow" },
      { id: "stats", title: "Stats" },
    ],
    mode: "free",
  });
  const showShortcutBar =
    staged.activeStepId === "selected" && controller.sectionEntries.length > 0;

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
  }, [controller.handleCloseWithGuard, controller.hasUnsavedChanges, header]);

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
        <TaskWorkingSectionsFooter
          availableSections={availableSections}
          selectedSectionIds={selectedSectionIds}
          canShowShortcuts={showShortcutBar}
          hasUnsavedChanges={controller.hasUnsavedChanges}
          isSaving={controller.isSaving}
          onShortcutPress={controller.handleShortcutPress}
          onSaveAndClose={controller.handleSaveAndClose}
        />
      }
      showNavigation={false}
      stepStatusMap={staged.stepStatusMap}
      steps={staged.steps}
    >
      <StagedFormStep id="selected" className="px-0">
        <div className="flex flex-col gap-4 px-3 pb-20">
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
