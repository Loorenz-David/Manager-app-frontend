import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormProvider } from "react-hook-form";

import { useStagedForm, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { StepStatus } from "@beyo/lib";
import { TaskListCard } from "@beyo/tasks";
import { ContentCard, StagedForm, StagedFormStep } from "@beyo/ui";

import { QuickPreOrderItemStep } from "../components/QuickPreOrderItemStep";
import { QuickTaskAssignFooter } from "../components/QuickTaskAssignFooter";
import { TaskWorkingSectionsStepList } from "../components/TaskWorkingSectionsStepList";
import {
  useQuickPreOrderItemController,
  type QuickPreOrderItemController,
} from "../controllers/use-quick-pre-order-item.controller";
import {
  useQuickTaskAssignController,
  type QuickTaskAssignController,
} from "../controllers/use-quick-task-assign.controller";
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
  controller: QuickTaskAssignController;
  itemController: QuickPreOrderItemController;
  staged: ReturnType<typeof useStagedForm>;
  isPreOrder: boolean;
  onAssign: () => void;
  onBack: () => void;
  onSaveAndClose?: () => Promise<void>;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  availableSections?: Array<{ client_id: string; name: string }>;
  selectedSectionIds?: string[];
  onShortcutPress?: (matchedIds: string[]) => void;
};

function QuickTaskAssignStagedForm({
  controller,
  itemController,
  staged,
  isPreOrder,
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
      canAdvance={isPreOrder ? staged.validateAdvance : undefined}
      data-testid="quick-task-assign-slide-page"
      direction={staged.direction}
      footer={({ stepId }) => (
        <QuickTaskAssignFooter
          activeStepId={stepId}
          availableSections={availableSections}
          hasItem={itemController.hasItem}
          hasUnsavedChanges={hasUnsavedChanges}
          isAdvancing={staged.isAdvancing}
          isPatching={itemController.isPatching}
          isSaving={isSaving}
          isSelectionValidForSubmit={controller.isSelectionValidForSubmit}
          onAssign={onAssign}
          onBack={onBack}
          onClose={() => controller.closeSurface?.()}
          onItemContinue={isPreOrder ? staged.advance : undefined}
          onSaveAndClose={onSaveAndClose}
          onShortcutPress={onShortcutPress}
          selectedCount={controller.selectedTaskIds.length}
          selectedSectionIds={selectedSectionIds}
          selectionMode={controller.selectionMode}
        />
      )}
      isAdvancing={staged.isAdvancing}
      isFirstStep={staged.isFirstStep}
      isLastStep={staged.isLastStep}
      navigationMode="free"
      onAdvance={isPreOrder ? staged.advance : () => {}}
      onBack={onBack}
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
                    (candidate) =>
                      candidate.task.client_id === tappedTaskId,
                  );
                  const images = (tappedTask?.item_images ?? []).flatMap(
                    (image) => {
                      const clientId =
                        typeof image.client_id === "string"
                          ? image.client_id
                          : null;
                      const imageUrl =
                        typeof image.image_url === "string"
                          ? image.image_url
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

      {isPreOrder ? (
        <StagedFormStep id="item" className="px-0">
          <QuickPreOrderItemStep
            hasItem={itemController.hasItem}
            itemPreview={{
              articleNumber:
                controller.selectedTask?.primary_item?.article_number ?? null,
              imageUrl: resolveImageUrl(
                controller.selectedTask?.item_images ?? [],
              ),
              sku: controller.selectedTask?.primary_item?.sku ?? null,
            }}
            onLookupResult={itemController.handleLookupResult}
          />
        </StagedFormStep>
      ) : null}

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
  itemController,
  staged,
  isPreOrder,
  onAssign,
  onBack,
  onItemOnlySaved,
}: {
  controller: QuickTaskAssignController;
  itemController: QuickPreOrderItemController;
  staged: ReturnType<typeof useStagedForm>;
  isPreOrder: boolean;
  onAssign: () => void;
  onBack: () => void;
  onItemOnlySaved: () => void;
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

  const handlePreOrderSave = useCallback(async (): Promise<void> => {
    if (controller.selectedTaskIds.length !== 1) {
      return;
    }

    if (!(await itemController.validate())) {
      staged.navigateTo("item");
      return;
    }

    if (!(await itemController.submitItemPatch())) {
      staged.setStepStatus("item", "error");
      staged.navigateTo("item");
      return;
    }

    // Item-only save: `handleSaveAndClose` early-returns without unsaved
    // section changes, but still fires closeSlide() — which optimistically
    // drops the task from the list and never completes a save. Finish here.
    if (!workingSectionsController.hasUnsavedChanges) {
      onItemOnlySaved();
      return;
    }

    await workingSectionsController.handleSaveAndClose();
  }, [
    controller.selectedTaskIds.length,
    itemController,
    onItemOnlySaved,
    staged,
    workingSectionsController,
  ]);

  return (
    <QuickTaskAssignStagedForm
      availableSections={availableSections}
      controller={controller}
      hasUnsavedChanges={
        isPreOrder
          ? workingSectionsController.hasUnsavedChanges ||
            itemController.hasItemChanges
          : workingSectionsController.hasUnsavedChanges
      }
      isPreOrder={isPreOrder}
      isSaving={workingSectionsController.isSaving}
      itemController={itemController}
      onAssign={onAssign}
      onBack={onBack}
      onSaveAndClose={
        isPreOrder
          ? handlePreOrderSave
          : workingSectionsController.handleSaveAndClose
      }
      onShortcutPress={workingSectionsController.handleShortcutPress}
      selectedSectionIds={selectedSectionIds}
      staged={staged}
    />
  );
}

export function QuickTaskAssignSlidePage(): React.JSX.Element {
  const props = useSurfaceProps<QuickTaskAssignSurfaceProps>();
  const header = useSurfaceHeader();
  const taskType = props.taskType ?? "return";
  const isPreOrder = taskType === "pre_order";
  const [primaryTaskId, setPrimaryTaskId] = useState<string | null>(null);

  // `staged` needs the controller (its advance guard reads the selection), and
  // the selection callback needs `staged` — the ref breaks that cycle without
  // depending on declaration order.
  const stagedRef = useRef<ReturnType<typeof useStagedForm> | null>(null);

  const handleSelectAndAdvance = useCallback((taskId: string): void => {
    setPrimaryTaskId(taskId);
    stagedRef.current?.setStepStatus("list", "completed");
    stagedRef.current?.navigateTo("item");
  }, []);

  const controller = useQuickTaskAssignController({
    taskType,
    surfaceOpeners: props.surfaceOpeners,
    selectionMode: isPreOrder ? "single" : "multi",
    onSelect: isPreOrder ? handleSelectAndAdvance : undefined,
  });
  const itemController = useQuickPreOrderItemController({
    task: isPreOrder ? controller.selectedTask : null,
  });

  const stagedSteps = useMemo(
    () =>
      isPreOrder
        ? [
            { id: "list", title: "Pre-orders" },
            { id: "item", title: "Item" },
            { id: "assign", title: "Assign" },
          ]
        : [
            { id: "list", title: "Returns" },
            { id: "assign", title: "Assign" },
          ],
    [isPreOrder],
  );

  const handleBeforeAdvance = useCallback(
    async (
      currentStepId: string,
      _nextStepId: string | null,
      setStepStatus: (
        stepId: string,
        status: StepStatus,
      ) => void,
    ): Promise<boolean> => {
      if (currentStepId === "list") {
        return controller.selectedTaskIds.length === 1;
      }

      if (currentStepId === "item") {
        const isValid = await itemController.validate();
        setStepStatus("item", isValid ? "completed" : "error");
        return isValid;
      }

      return true;
    },
    [controller.selectedTaskIds.length, itemController],
  );

  const staged = useStagedForm({
    steps: stagedSteps,
    mode: "free",
    onBeforeAdvance: isPreOrder ? handleBeforeAdvance : undefined,
  });
  stagedRef.current = staged;

  useEffect(() => {
    header?.setHeaderHidden(true);
    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  const handleCloseToList = useCallback(() => {
    setPrimaryTaskId(null);
    if (isPreOrder) {
      itemController.reset();
      controller.clearSelection();
    }
    staged.navigateTo("list");
  }, [controller, isPreOrder, itemController, staged.navigateTo]);

  const handleBack = useCallback(() => {
    if (!isPreOrder) {
      handleCloseToList();
      return;
    }

    // Pre-order back — including the swipe-back gesture — only moves the pane.
    // Clearing primaryTaskId here would unmount TaskWorkingSectionsProvider,
    // swapping the rendered tree and remounting SlideStack; the fresh stack
    // replays its enter animation (StagedForm always passes animateInitial)
    // right after the gesture settled, and the selection would be lost too.
    staged.back();
  }, [handleCloseToList, isPreOrder, staged]);

  const handleAssign = useCallback(() => {
    const selectedTaskId = controller.selectedTaskIds[0] ?? null;
    setPrimaryTaskId(selectedTaskId);

    if (isPreOrder) {
      staged.advance();
      return;
    }

    staged.navigateTo("assign");
  }, [
    controller.selectedTaskIds,
    isPreOrder,
    staged.advance,
    staged.navigateTo,
  ]);

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

          if (isPreOrder) {
            itemController.reset();
          }
          setPrimaryTaskId(null);
          staged.navigateTo("list");
          return remainingTaskCount;
        },
      }),
      [
        controller,
        isPreOrder,
        itemController,
        primaryTaskId,
        staged.navigateTo,
      ],
    );

  const handleItemOnlySaved = useCallback(() => {
    handleCloseToList();
    void controller.refetch();
  }, [controller, handleCloseToList]);

  if (!props.taskType) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Task type is missing.
      </div>
    );
  }

  const form = (
    <QuickTaskAssignStagedForm
      controller={controller}
      isPreOrder={isPreOrder}
      itemController={itemController}
      onAssign={handleAssign}
      onBack={handleBack}
      staged={staged}
    />
  );

  // Mount on the id alone: deriving this from the selected task as well made
  // the tree flip (and SlideStack remount) whenever the selection momentarily
  // cleared — on deselect, and mid-save once the task was optimistically
  // removed. The provider resolves the task from the id by itself.
  const formWithProvider = primaryTaskId ? (
    <TaskWorkingSectionsProvider
      key={primaryTaskId}
      surfaceOpeners={workingSectionSurfaceOpeners}
      taskId={primaryTaskId}
    >
      <QuickTaskAssignStagedFormWithProvider
        controller={controller}
        isPreOrder={isPreOrder}
        itemController={itemController}
        onAssign={handleAssign}
        onBack={handleBack}
        onItemOnlySaved={handleItemOnlySaved}
        staged={staged}
      />
    </TaskWorkingSectionsProvider>
  ) : (
    form
  );

  return (
    <div className="flex h-full flex-col py-4">
      {isPreOrder ? (
        <FormProvider {...itemController.form}>
          {formWithProvider}
        </FormProvider>
      ) : (
        formWithProvider
      )}
    </div>
  );
}
