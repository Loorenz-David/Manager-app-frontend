import { useEffect, useMemo } from "react";

import { cn } from "@beyo/lib";
import {
  usePreloadSurface,
  useStagedForm,
  useSurfaceHeader,
  useSurfaceProps,
} from "@beyo/hooks";
import {
  ContentCard,
  StagedForm,
  StagedFormStep,
  WorkingSectionShortcutBar,
  useScrollVisibilityContext,
} from "@beyo/ui";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "@beyo/working-sections";

import { TaskWorkingSectionsStepList } from "../components/TaskWorkingSectionsStepList";
import {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "../providers/TaskWorkingSectionsProvider";
import type { TaskWorkingSectionsSurfaceProps } from "../surface-ids";

function TaskWorkingSectionsFooter({
  availableSections,
  selectedSectionIds,
  canShowShortcuts,
  hasUnsavedChanges,
  isSaving,
  onShortcutPress,
  onSaveAndClose,
  onClose,
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
  onClose: () => void;
}): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isHidden ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
      )}
    >
      <div className="overflow-hidden">
        <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
          {canShowShortcuts ? (
            <div className="px-4 pt-3">
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
          ) : null}

          <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
            <button
              className="rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-primary shadow-sm transition"
              data-testid="task-working-sections-close-button"
              type="button"
              onClick={onClose}
            >
              Close & Back
            </button>

            <button
              className="rounded-2xl bg-(--color-primary) px-5 py-3.5 text-md font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="task-working-sections-save-button"
              disabled={isSaving || !hasUnsavedChanges}
              type="button"
              onClick={() => {
                void onSaveAndClose();
              }}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>

          <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
        </div>
      </div>
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

  usePreloadSurface(
    controller.surfaceOpeners?.preloadWorkerPickerSurface ?? (async () => {}),
  );

  useEffect(() => {
    header?.setHeaderHidden(true);
    header?.setCloseInterceptor(
      controller.hasUnsavedChanges ? controller.handleCloseWithGuard : null,
    );

    return () => {
      header?.setHeaderHidden(false);
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
          onClose={controller.handleCloseWithGuard}
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
    surfaceOpeners,
  } = useSurfaceProps<TaskWorkingSectionsSurfaceProps>();

  if (!taskId) {
    return <div className="p-6 text-sm text-muted-foreground">Task id is missing.</div>;
  }

  return (
    <div className="flex h-full flex-col py-4">
      <TaskWorkingSectionsProvider
        initialPendingAdds={recoveredPendingAdds}
        initialPendingReassignments={recoveredPendingReassignments}
        initialPendingRemoveIds={recoveredPendingRemoveIds}
        surfaceOpeners={surfaceOpeners}
        taskId={taskId}
      >
        <TaskWorkingSectionsSlidePageContent />
      </TaskWorkingSectionsProvider>
    </div>
  );
}
