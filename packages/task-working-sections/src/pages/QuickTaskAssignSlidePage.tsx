import { useCallback, useEffect, useMemo, useState } from "react";

import { useStagedForm, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { TaskListCard } from "@beyo/tasks";
import { ArrowLeft } from "lucide-react";
import {
  ContentCard,
  StagedForm,
  StagedFormStep,
  WorkingSectionShortcutBar,
} from "@beyo/ui";
import { cn } from "@beyo/lib";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "@beyo/working-sections";

import { TaskWorkingSectionsStepList } from "../components/TaskWorkingSectionsStepList";
import { useQuickTaskAssignController } from "../controllers/use-quick-task-assign.controller";
import {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "../providers/TaskWorkingSectionsProvider";
import type {
  QuickTaskAssignSurfaceProps,
  TaskWorkingSectionsSurfaceOpeners,
} from "../surface-ids";

function resolveImageUrl(
  images: Array<Record<string, unknown>>,
): string | null {
  const first = images[0];

  if (!first) {
    return null;
  }

  return typeof first.image_url === "string" ? first.image_url : null;
}

function QuickTaskUnifiedFooter({
  activeStepId,
  selectedCount,
  onClose,
  onAssign,
  onBack,
  onSaveAndClose,
  isSaving = false,
  hasUnsavedChanges = false,
  availableSections = [],
  selectedSectionIds = [],
  onShortcutPress,
}: {
  activeStepId: string;
  selectedCount: number;
  onClose: () => void;
  onAssign: () => void;
  onBack: () => void;
  onSaveAndClose?: () => Promise<void>;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  availableSections?: Array<{ client_id: string; name: string }>;
  selectedSectionIds?: string[];
  onShortcutPress?: (matchedIds: string[]) => void;
}): React.JSX.Element {
  return (
    <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
      {activeStepId === "assign" &&
      availableSections.length > 0 &&
      onShortcutPress ? (
        <div className="px-4 pt-3">
          <WorkingSectionShortcutBar
            shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
            availableSections={availableSections}
            selectedSectionIds={selectedSectionIds}
            onShortcutPress={onShortcutPress}
            animationMode="translate"
            data-testid="quick-task-assign-shortcut-bar"
            className="py-2"
            trackClassName="mt-3"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
        {activeStepId === "list" ? (
          <button
            className="rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
            data-testid="quick-task-list-back-button"
            type="button"
            onClick={onClose}
          >
            Close & Back
          </button>
        ) : (
          <button
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
            data-testid="quick-task-assign-back-button"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
            Back
          </button>
        )}

        {activeStepId === "list" ? (
          <button
            className={cn(
              "rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed",
              selectedCount > 0
                ? "bg-(--color-primary) text-card"
                : "bg-muted text-muted-foreground opacity-50",
            )}
            data-testid="quick-task-list-assign-button"
            disabled={selectedCount === 0}
            type="button"
            onClick={onAssign}
          >
            {selectedCount > 0 ? `Assign (${selectedCount})` : "Assign"}
          </button>
        ) : activeStepId === "assign" && onSaveAndClose ? (
          <button
            className="rounded-2xl bg-(--color-primary) px-5 py-3.5 text-md font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="quick-task-assign-save-button"
            disabled={isSaving || !hasUnsavedChanges}
            type="button"
            onClick={() => {
              void onSaveAndClose();
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="h-(--safe-bottom,0px) bg-background"
      />
    </div>
  );
}

function QuickTaskAssignWorkingSectionsPanel(): React.JSX.Element {
  const controller = useTaskWorkingSectionsContext();

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
    <div className="flex flex-col gap-4 px-3 pb-20 pt-3">
      <TaskWorkingSectionsStepList />
    </div>
  );
}

type QuickTaskAssignStagedFormProps = {
  controller: ReturnType<typeof useQuickTaskAssignController>;
  staged: ReturnType<typeof useStagedForm>;
  onAssign: () => void;
  onBack: () => void;
  // assign-step footer data (only available in Provider path)
  onSaveAndClose?: () => Promise<void>;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  availableSections?: Array<{ client_id: string; name: string }>;
  selectedSectionIds?: string[];
  onShortcutPress?: (matchedIds: string[]) => void;
};

function QuickTaskAssignStagedForm({
  controller,
  staged,
  onAssign,
  onBack,
  onSaveAndClose,
  isSaving,
  hasUnsavedChanges,
  availableSections,
  selectedSectionIds,
  onShortcutPress,
}: QuickTaskAssignStagedFormProps): React.JSX.Element {
  return (
    <StagedForm
      activeStepId={staged.activeStepId}
      data-testid="quick-task-assign-slide-page"
      direction={staged.direction}
      footer={
        <QuickTaskUnifiedFooter
          activeStepId={staged.activeStepId}
          selectedCount={controller.selectedTaskIds.length}
          onClose={() => controller.closeSurface?.()}
          onAssign={onAssign}
          onBack={onBack}
          onSaveAndClose={onSaveAndClose}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          availableSections={availableSections}
          selectedSectionIds={selectedSectionIds}
          onShortcutPress={onShortcutPress}
        />
      }
      isAdvancing={staged.isAdvancing}
      isFirstStep={staged.isFirstStep}
      isLastStep={staged.isLastStep}
      navigationMode="free"
      onAdvance={() => {}}
      onBack={() => {
        staged.navigateTo("list");
      }}
      onNavigate={staged.navigateTo}
      showNavigation={false}
      stepStatusMap={staged.stepStatusMap}
      steps={staged.steps}
    >
      <StagedFormStep id="list" className="px-0">
        <div className="flex flex-col gap-3 pb-10 pt-3">
          {controller.isInitialLoading ? (
            <ContentCard>
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Loading tasks…
              </p>
            </ContentCard>
          ) : controller.isError ? (
            <ContentCard>
              <div className="flex flex-col gap-3 px-4 py-6">
                <p className="text-sm text-muted-foreground">
                  Pending tasks could not be loaded.
                </p>
                <button
                  type="button"
                  className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
                  onClick={() => {
                    void controller.refetch();
                  }}
                >
                  Try again
                </button>
              </div>
            </ContentCard>
          ) : controller.tasks.length === 0 ? (
            <ContentCard>
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No pending tasks are ready for quick assignment.
              </p>
            </ContentCard>
          ) : (
            controller.tasks.map((task) => (
              <TaskListCard
                key={task.task.client_id}
                batchMode
                imageUrl={resolveImageUrl(task.item_images)}
                isSelected={controller.selectedTaskIds.includes(
                  task.task.client_id,
                )}
                item={
                  task.primary_item
                    ? {
                        itemId: task.primary_item.client_id,
                        article_number: task.primary_item.article_number,
                        sku: task.primary_item.sku,
                        item_major_category_snapshot:
                          task.primary_item.item_major_category_snapshot,
                        quantity: task.primary_item.quantity,
                      }
                    : null
                }
                onTapActions={controller.openTaskActions}
                onTapCard={controller.openTaskDetail}
                onTapImage={(tappedTaskId) => {
                  const tappedTask = controller.tasks.find(
                    (t) => t.task.client_id === tappedTaskId,
                  );
                  const images = (tappedTask?.item_images ?? []).flatMap(
                    (img) => {
                      const clientId =
                        typeof img.client_id === "string"
                          ? img.client_id
                          : null;
                      const imageUrl =
                        typeof img.image_url === "string"
                          ? img.image_url
                          : null;
                      return clientId && imageUrl
                        ? [{ client_id: clientId, image_url: imageUrl }]
                        : [];
                    },
                  );
                  if (images.length > 0) {
                    controller.openImageViewer?.(
                      tappedTaskId,
                      tappedTask?.primary_item?.client_id ?? null,
                      images,
                    );
                  }
                }}
                onToggleSelect={controller.handleToggleTask}
                task={{
                  task_type: task.task.task_type,
                  state: task.task.state,
                  return_source: task.task.return_source,
                  ready_by_at: task.task.ready_by_at,
                }}
                taskId={task.task.client_id}
              />
            ))
          )}
        </div>
      </StagedFormStep>

      <StagedFormStep id="assign" className="px-0">
        {controller.selectedTaskIds[0] && controller.selectedTask ? (
          <QuickTaskAssignWorkingSectionsPanel />
        ) : (
          <div className="mx-4 mt-3">
            <ContentCard>
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Select a task to continue.
              </p>
            </ContentCard>
          </div>
        )}
      </StagedFormStep>
    </StagedForm>
  );
}

function QuickTaskAssignStagedFormWithProvider({
  controller,
  staged,
  onAssign,
  onBack,
}: {
  controller: ReturnType<typeof useQuickTaskAssignController>;
  staged: ReturnType<typeof useStagedForm>;
  onAssign: () => void;
  onBack: () => void;
}): React.JSX.Element {
  const workingSectionsController = useTaskWorkingSectionsContext();

  const availableSections = useMemo(
    () =>
      workingSectionsController.sectionEntries.map((entry) => entry.section),
    [workingSectionsController.sectionEntries],
  );
  const selectedSectionIds = useMemo(
    () =>
      workingSectionsController.sectionEntries
        .filter((entry) => entry.isActive)
        .map((entry) => entry.section.client_id),
    [workingSectionsController.sectionEntries],
  );

  return (
    <QuickTaskAssignStagedForm
      controller={controller}
      onAssign={onAssign}
      onBack={onBack}
      onSaveAndClose={workingSectionsController.handleSaveAndClose}
      isSaving={workingSectionsController.isSaving}
      hasUnsavedChanges={workingSectionsController.hasUnsavedChanges}
      availableSections={availableSections}
      selectedSectionIds={selectedSectionIds}
      onShortcutPress={workingSectionsController.handleShortcutPress}
      staged={staged}
    />
  );
}

export function QuickTaskAssignSlidePage(): React.JSX.Element {
  const props = useSurfaceProps<QuickTaskAssignSurfaceProps>();
  const header = useSurfaceHeader();
  const taskType = props.taskType ?? "return";
  const controller = useQuickTaskAssignController({
    taskType,
    surfaceOpeners: props.surfaceOpeners,
  });
  const stagedSteps = useMemo(
    () => [
      { id: "list", title: controller.taskTypeLabel },
      { id: "assign", title: "Assign" },
    ],
    [controller.taskTypeLabel],
  );
  const staged = useStagedForm({
    steps: stagedSteps,
    mode: "free",
  });

  useEffect(() => {
    header?.setHeaderHidden(true);
    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  const [primaryTaskId, setPrimaryTaskId] = useState<string | null>(null);
  const primaryTask =
    controller.tasks.find((t) => t.task.client_id === primaryTaskId) ?? null;

  const handleCloseToList = useCallback(() => {
    setPrimaryTaskId(null);
    staged.navigateTo("list");
  }, [staged.navigateTo]);

  const handleAssign = useCallback(() => {
    setPrimaryTaskId(controller.selectedTaskIds[0] ?? null);
    staged.navigateTo("assign");
  }, [controller.selectedTaskIds, staged.navigateTo]);

  const workingSectionSurfaceOpeners =
    useMemo<TaskWorkingSectionsSurfaceOpeners>(
      () => ({
        closeSlide: () => {
          if (!primaryTaskId) {
            return;
          }

          controller.handleSaveStarted(primaryTaskId);
          staged.navigateTo("list");
        },
        reopenSlideAfterError: (recoveryProps) => {
          controller.handleSaveFailed(recoveryProps.taskId);
          staged.navigateTo("assign");
        },
        onSaveComplete: (taskId, appliedAdds) => {
          const remainingTaskCount = controller.handleSaveCompleted(
            taskId,
            appliedAdds,
          );

          if (remainingTaskCount === 0) {
            controller.closeSurface?.();
            return 0;
          }

          setPrimaryTaskId(null);
          staged.navigateTo("list");
          return remainingTaskCount;
        },
      }),
      [controller, primaryTaskId, staged.navigateTo],
    );

  if (!props.taskType) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Task type is missing.
      </div>
    );
  }

  if (primaryTaskId && primaryTask) {
    return (
      <div className="flex h-full flex-col py-4">
        <TaskWorkingSectionsProvider
          key={primaryTaskId}
          surfaceOpeners={workingSectionSurfaceOpeners}
          taskId={primaryTaskId}
        >
          <QuickTaskAssignStagedFormWithProvider
            controller={controller}
            onAssign={handleAssign}
            onBack={handleCloseToList}
            staged={staged}
          />
        </TaskWorkingSectionsProvider>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col py-4">
      <QuickTaskAssignStagedForm
        controller={controller}
        onAssign={handleAssign}
        onBack={handleCloseToList}
        staged={staged}
      />
    </div>
  );
}
