import { useCallback, useEffect } from "react";

import {
  usePreloadSurface,
  useSurfaceHeader,
  useSurfaceProps,
} from "@beyo/hooks";
import { cn, generateClientId } from "@beyo/lib";
import {
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID,
  useTaskNotesUnreadController,
  preloadTaskNoteUnreadViewerSurface,
  preloadTaskNotesSheetSurface,
  type TaskNoteUnreadViewerSurfaceProps,
} from "@beyo/task-notes";
import {
  TaskWorkingSectionsField,
  useTaskWorkingSectionsCountsFlow,
} from "@beyo/task-working-sections";
import {
  ContentCard,
  DashedInfoGroup,
  PullToRefresh,
  useScrollHide,
  useSurfaceStore,
} from "@beyo/ui";
import { useQueryClient } from "@tanstack/react-query";

import {
  ItemUpholsteryField,
  isUpholsteryRequirementState,
} from "@beyo/upholstery";

import { taskKeys } from "../api/task-keys";
import {
  TaskBodyCategoryRow,
  TaskCustomerSection,
  TaskDetailBottomActions,
  TaskDetailHeader,
  TaskImagesSection,
  TaskScheduledDeliverySection,
  TaskUpholsterySection,
} from "../components/detail";
import { TaskFlowTimeline } from "../components/TaskFlowTimeline";
import {
  TaskDetailProvider,
  useTaskDetailContext,
} from "../providers/TaskDetailProvider";
import type { TaskDetailSurfaceProps } from "../surface-ids";

// Only the floating Assign Stages CTA remains at the bottom. Keep this in sync
// with the bottom padding applied to the scroll content below.
const BOTTOM_ACTIONS_EDGE_OFFSET_PX = 72;

function toRequirementState(value: string | null) {
  return value && isUpholsteryRequirementState(value) ? value : null;
}

function TaskDetailSlidePageContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useTaskDetailContext();
  const queryClient = useQueryClient();
  const { scrollRef, isHidden, isAtEdge, hideProgressContainerRef } =
    useScrollHide({
      revealAtEdge: "bottom",
      edgeOffset: BOTTOM_ACTIONS_EDGE_OFFSET_PX,
    });
  const isFooterHidden = isHidden && !isAtEdge;

  // The page renders its own back arrow in the title row, so the surface
  // header stays hidden on every breakpoint.
  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  usePreloadSurface(preloadTaskNotesSheetSurface);
  usePreloadSurface(preloadTaskNoteUnreadViewerSurface);

  const handleOpenUnreadViewer = useCallback(
    (props: TaskNoteUnreadViewerSurfaceProps) => {
      useSurfaceStore
        .getState()
        .open(TASK_NOTE_UNREAD_VIEWER_SURFACE_ID, props);
    },
    [],
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

    console.log("[scroll-debug][task-detail] isFooterHidden", {
      isFooterHidden,
    });
  }, [isFooterHidden]);

  const itemId = controller.taskDetail?.item?.client_id ?? null;
  const workingSectionsCounts = useTaskWorkingSectionsCountsFlow(
    controller.taskId,
  );
  const shouldRenderAssignStages =
    !workingSectionsCounts.isPending &&
    controller.taskDetail?.task.state === "pending" &&
    workingSectionsCounts.assignedCount === 0;

  function handleImagesChanged(): void {
    void queryClient.invalidateQueries({
      queryKey: taskKeys.detail(controller.taskId),
    });
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  }

  let scrollContent: React.ReactNode;

  if (controller.isPending) {
    scrollContent = (
      <div className="p-6 text-sm text-muted-foreground">Loading task...</div>
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
      <div
        className={cn(
          "flex flex-col gap-4 pt-2",
          shouldRenderAssignStages
            ? "pb-[calc(var(--safe-bottom,0px)+5.5rem)]"
            : "pb-[calc(var(--safe-bottom,0px)+1.5rem)]",
        )}
      >
        <TaskDetailHeader
          onBack={() => header?.requestClose()}
          onOpenMenu={controller.openMenu}
          onOpenReadyByAt={controller.openReadyByAtSheet}
          taskDetail={controller.taskDetail}
        />
        <ContentCard>
          <TaskBodyCategoryRow
            onOpenPositionField={controller.openPositionSheet}
            onOpenQuantity={controller.openQuantitySheet}
            taskDetail={controller.taskDetail}
          />
          <DashedInfoGroup>
            <TaskCustomerSection taskDetail={controller.taskDetail} />
            <TaskWorkingSectionsField
              onOpenWorkingSections={controller.openWorkingSectionsSlide}
              taskId={controller.taskId}
            />
            <TaskScheduledDeliverySection
              onOpenDeliveryDate={controller.openDeliveryDateSheet}
              onOpenAssortment={controller.openAssortmentSheet}
              onOpenFulfillmentMethod={controller.openFulfillmentMethodSheet}
              taskDetail={controller.taskDetail}
            />
          </DashedInfoGroup>
          <TaskImagesSection
            itemId={itemId}
            onImagesChanged={handleImagesChanged}
          />
          {controller.taskDetail.item?.item_major_category_snapshot?.toLowerCase() ===
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
                  requirementState={toRequirementState(requirementState)}
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
    <div
      ref={hideProgressContainerRef}
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <PullToRefresh
        className="min-h-0 flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        {scrollContent}
      </PullToRefresh>
      <TaskDetailBottomActions
        isHidden={isFooterHidden}
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
