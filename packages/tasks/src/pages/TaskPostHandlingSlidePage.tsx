import { useEffect, useRef } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  AnimatedRemovalGroup,
  AnimatedRemovalItem,
  PullToRefresh,
  SlideStack,
  SlideStackPane,
} from "@beyo/ui";

import { usePostHandlingCountsQuery } from "../api/use-post-handling-counts-query";
import { PostHandlingBottomAction } from "../components/PostHandlingBottomAction";
import { TaskListCard } from "../components/TaskListCard";
import { TaskPostHandlingHeader } from "../components/TaskPostHandlingHeader";
import { useTaskPostHandlingController } from "../controllers/use-task-post-handling.controller";
import { getPostHandlingMissingRequirements } from "../lib/post-handling-requirements";
import {
  humanizeSnakeCase,
  POST_HANDLING_STATE_VARIANT,
} from "../lib/task-detail";
import type { TaskPostHandlingSlideSurfaceProps } from "../surface-ids";
import type { TaskListItemRaw } from "../types";

const BODY_MIN_HEIGHT_CLASS = "min-h-[calc(100dvh-9rem)]";

function resolveImageUrl(
  images: TaskListItemRaw["item_images"],
): string | null {
  const first = images[0];

  if (!first || typeof first.image_url !== "string") {
    return null;
  }

  return first.image_url;
}

type RenderTaskPaneInput = {
  tasks: TaskListItemRaw[];
  isInitialLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  emptyMessage: string;
  controller: ReturnType<typeof useTaskPostHandlingController>;
};

function renderTaskPane({
  tasks,
  isInitialLoading,
  isError,
  hasMore,
  isFetchingMore,
  onLoadMore,
  emptyMessage,
  controller,
}: RenderTaskPaneInput): React.JSX.Element {
  return (
    <>
      <div className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+6.5rem)] pt-2">
        {isInitialLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="mx-4 h-30 animate-pulse rounded-xl bg-muted"
            />
          ))
        ) : isError ? (
          <div className="mx-4 rounded-xl bg-card px-4 py-6 shadow-sm">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Post-handling tasks could not be loaded.
              </p>
              <button
                className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
                type="button"
                onClick={() => {
                  void controller.refetch();
                }}
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          // The group stays mounted when the last row leaves so its exit can
          // finish before the empty message takes over.
          <AnimatedRemovalGroup>
            {tasks.map((task) => {
              const activeInstance = controller.resolveActiveInstance(
                task.task.post_handling,
              );
              const completedInstance =
                activeInstance === null
                  ? (task.task.post_handling?.find(
                      (instance) => instance.state === "completed",
                    ) ?? null)
                  : null;
              const displayInstance = activeInstance ?? completedInstance;
              const statePill = displayInstance
                ? {
                    label:
                      humanizeSnakeCase(displayInstance.state) ??
                      displayInstance.state,
                    variant: POST_HANDLING_STATE_VARIANT[displayInstance.state],
                  }
                : undefined;

              const missingValues =
                activeInstance?.state === "pending"
                  ? getPostHandlingMissingRequirements(task.task).map(
                      (requirement) => requirement.label,
                    )
                  : [];

              return (
                <AnimatedRemovalItem key={task.task.client_id} gapPx={12}>
                  <TaskListCard
                    detachedAction={
                      activeInstance !== null &&
                      activeInstance.state !== "pending" ? (
                        <PostHandlingBottomAction
                          instance={activeInstance}
                          isCompleting={
                            controller.completingTaskId === task.task.client_id
                          }
                          taskId={task.task.client_id}
                          onComplete={() =>
                            void controller.handleComplete(
                              task.task.client_id,
                              activeInstance,
                              false,
                            )
                          }
                        />
                      ) : undefined
                    }
                    imageUrl={resolveImageUrl(task.item_images)}
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
                    missingValues={missingValues}
                    onMissingValuesPress={() =>
                      controller.openPendingWarning(task)
                    }
                    onTapActions={controller.openTaskActions}
                    onTapCard={controller.openTaskDetail}
                    onTapImage={() => controller.openImageViewer(task)}
                    showAssortment
                    statePill={statePill}
                    task={{
                      task_type: task.task.task_type,
                      state: task.task.state,
                      return_source: task.task.return_source,
                      ready_by_at: task.task.ready_by_at,
                      assortment: task.task.assortment,
                    }}
                    taskId={task.task.client_id}
                  />
                </AnimatedRemovalItem>
              );
            })}
          </AnimatedRemovalGroup>
        )}

        {!isInitialLoading && !isError && tasks.length === 0 ? (
          <div className="mx-4 rounded-xl bg-card px-4 py-6 shadow-sm">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : null}
      </div>

      {hasMore || isFetchingMore ? (
        <div className="flex justify-center pb-6">
          <button
            className="rounded-full bg-card px-6 py-2 text-sm font-medium text-foreground shadow-sm disabled:opacity-50"
            data-testid="task-post-handling-load-more-button"
            disabled={isFetchingMore}
            type="button"
            onClick={onLoadMore}
          >
            {isFetchingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : tasks.length > 0 ? (
        <div className="flex justify-center pb-6">
          <span
            className="text-xs text-muted-foreground"
            data-testid="task-post-handling-end-of-list"
          >
            End of list
          </span>
        </div>
      ) : null}
    </>
  );
}

export function TaskPostHandlingSlidePage(): React.JSX.Element {
  const props = useSurfaceProps<TaskPostHandlingSlideSurfaceProps>();
  const header = useSurfaceHeader();
  const preloadRef = useRef(props.surfaceOpeners?.preloadPendingWarningSheet);

  useEffect(() => {
    void preloadRef.current?.();
  }, []);

  const controller = useTaskPostHandlingController({
    surfaceOpeners: props.surfaceOpeners,
    initialTab: props.defaultTab,
  });
  const countsQuery = usePostHandlingCountsQuery("pending,filled");
  const scrollRef = useRef<HTMLDivElement>(null);

  // The page renders its own back arrow in the search row, so the surface
  // header stays hidden on every breakpoint.
  useEffect(() => {
    header?.setHeaderHidden(true);

    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="task-post-handling-slide-page"
    >
      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        {/* Header scrolls with the body — no scroll-visibility on this page. */}
        <TaskPostHandlingHeader
          activeTab={controller.activeTab}
          completedFilterCount={controller.completedFilterCount}
          isLoading={controller.isBackgroundLoading}
          isPillsDisabled={controller.isPillsDisabled}
          q={controller.q}
          stateCounts={countsQuery.data}
          onBack={header?.requestClose ?? controller.closeSurface ?? (() => {})}
          onFilterPress={controller.openFilterSheet}
          onQChange={controller.setQ}
          onTabChange={controller.setTab}
        />

        <div data-testid="task-post-handling-scroll">
          {controller.mode === "carousel" ? (
            // The positioned wrapper anchors overlapping panes and drag
            // ghosts; PullToRefresh clips their horizontal overflow.
            <div className="relative">
              <SlideStack
                activeId={controller.activeTab}
                onBack={controller.goToPreviousTab}
                onForward={controller.goToNextTab}
              >
                {controller.tabs.map((tab) => {
                  const pane =
                    tab === "pending"
                      ? controller.pendingPane
                      : controller.filledPane;

                  return (
                    <SlideStackPane
                      key={tab}
                      className={BODY_MIN_HEIGHT_CLASS}
                      data-testid={`task-post-handling-body-${tab}`}
                      id={tab}
                    >
                      {renderTaskPane({
                        tasks: pane.tasks,
                        isInitialLoading: pane.isInitialLoading,
                        isError: pane.isError,
                        hasMore: pane.hasMore,
                        isFetchingMore: pane.isFetchingMore,
                        onLoadMore: pane.loadMore,
                        emptyMessage:
                          tab === "pending"
                            ? "No pending post-handling tasks."
                            : "No filled post-handling tasks.",
                        controller,
                      })}
                    </SlideStackPane>
                  );
                })}
              </SlideStack>
            </div>
          ) : (
            renderTaskPane({
              tasks: controller.singlePane.tasks,
              isInitialLoading: controller.singlePane.isInitialLoading,
              isError: controller.singlePane.isError,
              hasMore: controller.singlePane.hasMore,
              isFetchingMore: controller.singlePane.isFetchingMore,
              onLoadMore: controller.singlePane.loadMore,
              emptyMessage:
                controller.mode === "completed"
                  ? "No completed post-handling tasks match the current filters."
                  : "No tasks match the current search.",
              controller,
            })
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
