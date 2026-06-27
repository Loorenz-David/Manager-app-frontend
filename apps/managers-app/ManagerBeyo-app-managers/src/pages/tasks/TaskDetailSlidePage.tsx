import { useCallback, useEffect } from "react";
import { usePreloadSurface } from "@beyo/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { generateClientId } from "@beyo/lib";
import {
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID,
  useTaskNotesUnreadController,
  type TaskNoteUnreadViewerSurfaceProps,
} from "@beyo/task-notes";
import {
  TaskBodyCategoryRow,
  TaskCustomerSection,
  TaskDetailBottomActions,
  TaskDetailHeader,
  TaskFlowTimeline,
  TaskImagesSection,
  TaskScheduledDeliverySection,
  TaskUpholsterySection,
  TaskWorkingSectionsField,
  taskKeys,
} from "@beyo/tasks";
import { PullToRefresh, useScrollVisibility } from "@beyo/ui";

import { ContentCard, DashedInfoGroup } from "@/components/primitives";
import { ItemUpholsteryField } from "@/features/items";
import type { ItemUpholsteryRequirementState } from "@/features/items/types";
import {
  TaskDetailProvider,
  useTaskDetailContext,
} from "@/features/tasks/providers/TaskDetailProvider";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurface } from "@/hooks/use-surface";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import {
  preloadTaskNoteUnreadViewerSurface,
  preloadTaskNotesSheetSurface,
  type TaskDetailSurfaceProps,
} from "@/features/tasks/surfaces";

const ITEM_UPHOLSTERY_REQUIREMENT_STATES = new Set<
  ItemUpholsteryRequirementState
>([
  "missing_quantity",
  "available",
  "needs_ordering",
  "ordered",
  "in_use",
  "completed",
  "failed",
]);

function toItemUpholsteryRequirementState(
  value: string | null,
): ItemUpholsteryRequirementState | null {
  if (!value) {
    return null;
  }

  return ITEM_UPHOLSTERY_REQUIREMENT_STATES.has(
    value as ItemUpholsteryRequirementState,
  )
    ? (value as ItemUpholsteryRequirementState)
    : null;
}

function TaskDetailSlidePageContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useTaskDetailContext();
  const surface = useSurface();
  const queryClient = useQueryClient();
  const { scrollRef, isHidden } = useScrollVisibility({
    mode: "relative",
    hideThreshold: 40,
    showThreshold: 24,
  });

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  usePreloadSurface(preloadTaskNotesSheetSurface);
  usePreloadSurface(preloadTaskNoteUnreadViewerSurface);

  const handleOpenUnreadViewer = useCallback(
    (props: TaskNoteUnreadViewerSurfaceProps) => {
      surface.open(TASK_NOTE_UNREAD_VIEWER_SURFACE_ID, props);
    },
    [surface],
  );

  useTaskNotesUnreadController({
    taskId: controller.taskId,
    onOpen: handleOpenUnreadViewer,
  });

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !(window as Window & { __BEYO_SCROLL_DEBUG__?: boolean })
        .__BEYO_SCROLL_DEBUG__
    ) {
      return;
    }

    console.log("[scroll-debug][task-detail] isHidden", { isHidden });
  }, [isHidden]);

  const itemId = controller.taskDetail?.item?.client_id ?? null;
  const shouldRenderAssignStages =
    controller.taskDetail?.task.state === "pending" &&
    (controller.taskDetail.task_steps.length ?? 0) === 0;

  function handleImagesChanged(): void {
    void queryClient.invalidateQueries({
      queryKey: taskKeys.detail(controller.taskId),
    });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  }

  let scrollContent: React.ReactNode;

  if (controller.isPending) {
    scrollContent = (
      <div className="p-6 text-sm text-muted-foreground">Loading task…</div>
    );
  } else if (controller.isError || !controller.taskDetail) {
    scrollContent = (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Task details could not be loaded.
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
  } else {
    scrollContent = (
      <div className="flex flex-col gap-4 pb-[calc(var(--safe-bottom,0)+9.5rem)] pt-2">
        <TaskDetailHeader
          onOpenMenu={controller.openMenu}
          onOpenReadyByAt={controller.openReadyByAtSheet}
          taskDetail={controller.taskDetail}
        />
        <ContentCard>
          <TaskBodyCategoryRow
            onOpenPosition={controller.openPositionSheet}
            onOpenQuantity={controller.openQuantitySheet}
            taskDetail={controller.taskDetail}
          />
          <DashedInfoGroup>
            <TaskCustomerSection taskDetail={controller.taskDetail} />
            <TaskWorkingSectionsField
              onOpenWorkingSections={controller.openWorkingSectionsSlide}
              taskSteps={controller.taskDetail.task_steps}
            />
            <TaskScheduledDeliverySection
              onOpenDeliveryDate={controller.openDeliveryDateSheet}
              taskDetail={controller.taskDetail}
            />
          </DashedInfoGroup>
          <TaskImagesSection
            itemId={itemId}
            onImagesChanged={handleImagesChanged}
          />
          {controller.taskDetail?.item?.item_major_category_snapshot?.toLowerCase() ===
            "seat" && (
            <TaskUpholsterySection
              createPending={controller.createItemUpholstery.isPending}
              itemId={itemId}
              onCreate={(newUpholsteryId) => {
                if (!itemId) {
                  return;
                }

                controller.createItemUpholstery.mutate({
                  client_id: generateClientId("ItemUpholstery"),
                  item_id: itemId,
                  upholstery_id: newUpholsteryId,
                  source: "internal",
                });
              }}
              onEditAmount={controller.openUpholsteryAmountSheet}
              onUpdate={(itemUpholsteryId, newUpholsteryId) => {
                controller.updateItemUpholstery.mutate({
                  itemUpholsteryId,
                  upholstery_id: newUpholsteryId,
                });
              }}
              renderUpholsteryField={({
                disabled,
                onChange,
                requirementState,
                testId,
                value,
              }) => (
                <ItemUpholsteryField
                  disabled={disabled}
                  onChange={onChange}
                  requirementState={toItemUpholsteryRequirementState(
                    requirementState,
                  )}
                  testId={testId}
                  value={value}
                />
              )}
              updatePending={controller.updateItemUpholstery.isPending}
            />
          )}
          <TaskFlowTimeline
            taskId={controller.taskId}
            onRecordPress={controller.openFlowRecord}
            initialLimit={3}
            loadMoreSize={5}
          />
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <PullToRefresh
        className="min-h-0 flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        {scrollContent}
      </PullToRefresh>
      <TaskDetailBottomActions
        isHidden={isHidden}
        onEdit={controller.openEditTask}
        onOpenWorkingSections={controller.openWorkingSectionsSlide}
        shouldRenderAssignStages={shouldRenderAssignStages}
      />
    </div>
  );
}

export function TaskDetailSlidePage(): React.JSX.Element {
  const { taskId } = useSurfaceProps<TaskDetailSurfaceProps>();

  if (!taskId) {
    return (
      <div
        className="p-6 text-sm text-muted-foreground"
        data-testid="task-detail-slide"
      >
        Task id is missing.
      </div>
    );
  }

  return (
    <div className="h-full bg-background" data-testid="task-detail-slide">
      <TaskDetailProvider taskId={taskId}>
        <TaskDetailSlidePageContent />
      </TaskDetailProvider>
    </div>
  );
}
