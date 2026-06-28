import { useEffect, useMemo, useState } from "react";

import { cn } from "@beyo/lib";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  ScrollVisibilityProvider,
  WorkingSectionShortcutBar,
  useScrollVisibilityContext,
} from "@beyo/ui";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "@beyo/working-sections";

import { TaskWorkingSectionsStepList } from "../components/TaskWorkingSectionsStepList";
import {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "../providers/TaskWorkingSectionsProvider";
import type { TaskWorkingSectionsReassignSlideSurfaceProps } from "../surface-ids";

function TaskWorkingSectionsReassignFooter({
  availableSections,
  selectedSectionIds,
  hideShortcuts,
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
  hideShortcuts: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onShortcutPress: (sectionIds: string[]) => void;
  onSaveAndClose: () => Promise<void>;
  onClose: () => void;
}): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();
  const canShowShortcuts = !hideShortcuts && availableSections.length > 0;

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
              onClick={onClose}
            >
              Close & Back
            </button>

            <button
              className="rounded-2xl bg-(--color-primary) px-5 py-3.5 text-md font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="task-working-sections-reassign-save-button"
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

function TaskWorkingSectionsReassignSlidePageContent({
  hideShortcuts,
}: {
  hideShortcuts: boolean;
}): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useTaskWorkingSectionsContext();
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

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
    <ScrollVisibilityProvider
      scrollElement={scrollElement}
      mode="relative"
      threshold={40}
    >
      <div
        className="flex h-full min-h-0 flex-col"
        data-testid="task-working-sections-reassign-slide-page"
      >
        <div
          ref={setScrollElement}
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-6"
        >
          <div className="flex flex-col gap-4 pb-4">
            <TaskWorkingSectionsStepList />
          </div>
        </div>

        <TaskWorkingSectionsReassignFooter
          availableSections={availableSections}
          selectedSectionIds={selectedSectionIds}
          hasUnsavedChanges={controller.hasUnsavedChanges}
          hideShortcuts={hideShortcuts}
          isSaving={controller.isSaving}
          onClose={controller.handleCloseWithGuard}
          onSaveAndClose={controller.handleSaveAndClose}
          onShortcutPress={controller.handleShortcutPress}
        />
      </div>
    </ScrollVisibilityProvider>
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
