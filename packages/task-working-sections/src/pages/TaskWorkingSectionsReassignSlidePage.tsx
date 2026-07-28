import { useEffect, useMemo } from "react";

import { useStagedForm, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { StagedForm, StagedFormStep, WorkingSectionShortcutBar } from "@beyo/ui";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "@beyo/working-sections";

import { TaskWorkingSectionsNoteStep } from "../components/TaskWorkingSectionsNoteStep";
import { TaskWorkingSectionsStepList } from "../components/TaskWorkingSectionsStepList";
import {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "../providers/TaskWorkingSectionsProvider";
import type { TaskWorkingSectionsReassignSlideSurfaceProps } from "../surface-ids";

function TaskWorkingSectionsReassignStagedFormHeader(): React.JSX.Element {
  return (
    <div className="flex min-h-14 items-center px-4">
      <h1 className="truncate text-base font-semibold">
        Reassign task to fellows
      </h1>
    </div>
  );
}

function TaskWorkingSectionsReassignFooter({
  activeStepId,
  availableSections,
  selectedSectionIds,
  hideShortcuts,
  hasUnsavedChanges,
  isSaving,
  onAdvance,
  onBack,
  onShortcutPress,
  onSaveAndClose,
  onClose,
}: {
  activeStepId: "sections" | "note";
  availableSections: ReturnType<
    typeof useTaskWorkingSectionsContext
  >["sectionEntries"][number]["section"][];
  selectedSectionIds: string[];
  hideShortcuts: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onAdvance: () => void;
  onBack: () => void;
  onShortcutPress: (sectionIds: string[]) => void;
  onSaveAndClose: () => Promise<void>;
  onClose: () => void;
}): React.JSX.Element {
  const isSectionsStep = activeStepId === "sections";
  const canShowShortcuts =
    isSectionsStep && !hideShortcuts && availableSections.length > 0;

  return (
    <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
      {canShowShortcuts ? (
        <div className="px-4 pt-3">
          <WorkingSectionShortcutBar
            shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
            availableSections={availableSections}
            selectedSectionIds={selectedSectionIds}
            onShortcutPress={onShortcutPress}
            animationMode="translate"
            data-testid="task-working-sections-reassign-shortcut-bar"
            className="py-2"
            trackClassName="mt-3"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
        <button
          className="rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
          data-testid="task-working-sections-reassign-close-button"
          type="button"
          onClick={isSectionsStep ? onClose : onBack}
        >
          {isSectionsStep ? "Close & Back" : "Back"}
        </button>

        <button
          className="rounded-2xl bg-(--color-primary) px-5 py-3.5 text-md font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="task-working-sections-reassign-save-button"
          disabled={isSaving || (!isSectionsStep && !hasUnsavedChanges)}
          type="button"
          onClick={() => {
            if (isSectionsStep) {
              onAdvance();
              return;
            }

            void onSaveAndClose();
          }}
        >
          {isSectionsStep ? "Next" : isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
    </div>
  );
}

function TaskWorkingSectionsReassignSlidePageContent({
  hideShortcuts,
}: {
  hideShortcuts: boolean;
}): React.JSX.Element {
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
      { id: "sections", title: "Sections" },
      { id: "note", title: "Note" },
    ],
    mode: "free",
  });

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
      activeStepId={staged.activeStepId as "sections" | "note"}
      data-testid="task-working-sections-reassign-slide-page"
      direction={staged.direction}
      header={<TaskWorkingSectionsReassignStagedFormHeader />}
      isAdvancing={staged.isAdvancing}
      isFirstStep={staged.isFirstStep}
      isLastStep={staged.isLastStep}
      navigationMode={staged.navigationMode}
      onAdvance={staged.advance}
      onBack={staged.back}
      onNavigate={staged.navigateTo}
      footer={({ stepId }) => (
        <TaskWorkingSectionsReassignFooter
          activeStepId={stepId as "sections" | "note"}
          availableSections={availableSections}
          selectedSectionIds={selectedSectionIds}
          hideShortcuts={hideShortcuts}
          hasUnsavedChanges={controller.hasUnsavedChanges}
          isSaving={controller.isSaving}
          onAdvance={staged.advance}
          onBack={staged.back}
          onClose={controller.handleCloseWithGuard}
          onSaveAndClose={controller.handleSaveAndClose}
          onShortcutPress={controller.handleShortcutPress}
        />
      )}
      showNavigation={false}
      stepStatusMap={staged.stepStatusMap}
      steps={staged.steps}
    >
      <StagedFormStep id="sections" className="px-0">
        <div className="flex flex-col gap-4 px-3 pb-6">
          <TaskWorkingSectionsStepList />
        </div>
      </StagedFormStep>

      <StagedFormStep id="note" className="px-0">
        <TaskWorkingSectionsNoteStep
          itemPosition={controller.itemPositionValue}
          noteClientId={controller.noteClientId}
          noteDraft={controller.noteDraft}
          showItemPosition={controller.itemClientId !== null}
          onItemPositionChange={controller.handleItemPositionChange}
          onNoteChange={controller.handleNoteChange}
        />
      </StagedFormStep>
    </StagedForm>
  );
}

export function TaskWorkingSectionsReassignSlidePage(): React.JSX.Element {
  const {
    taskId,
    hideShortcuts = false,
    surfaceOpeners,
    recoveredPendingAdds,
    recoveredPendingRemoveIds,
    recoveredPendingReassignments,
    recoveredNoteClientId,
    recoveredNoteContent,
    recoveredItemPosition,
  } = useSurfaceProps<TaskWorkingSectionsReassignSlideSurfaceProps>();

  if (!taskId) {
    return <div className="p-6 text-sm text-muted-foreground">Task id is missing.</div>;
  }

  return (
    <div className="flex h-full flex-col py-4">
      <TaskWorkingSectionsProvider
        initialPendingAdds={recoveredPendingAdds}
        initialPendingReassignments={recoveredPendingReassignments}
        initialPendingRemoveIds={recoveredPendingRemoveIds}
        initialNoteClientId={recoveredNoteClientId}
        initialNoteContent={recoveredNoteContent}
        initialItemPosition={recoveredItemPosition}
        surfaceOpeners={surfaceOpeners}
        taskId={taskId}
      >
        <TaskWorkingSectionsReassignSlidePageContent
          hideShortcuts={hideShortcuts}
        />
      </TaskWorkingSectionsProvider>
    </div>
  );
}
