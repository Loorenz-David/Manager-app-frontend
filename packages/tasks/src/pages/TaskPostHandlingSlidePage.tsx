import { useEffect, useRef } from "react";
import { AnimatePresence, m } from "framer-motion";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { transitions } from "@beyo/lib";
import { PullToRefresh, useScrollHide } from "@beyo/ui";

import { usePostHandlingCountsQuery } from "../api/use-post-handling-counts-query";
import { PostHandlingBottomAction } from "../components/PostHandlingBottomAction";
import { TaskListCard } from "../components/TaskListCard";
import { TaskPostHandlingHeader } from "../components/TaskPostHandlingHeader";
import { useTaskPostHandlingController } from "../controllers/use-task-post-handling.controller";
import {
  humanizeSnakeCase,
  POST_HANDLING_STATE_VARIANT,
} from "../lib/task-detail";
import type { TaskPostHandlingSlideSurfaceProps } from "../surface-ids";
import type { TaskListItemRaw } from "../types";

const HEADER_INDICATOR_OFFSET = 144;
const CONTENT_TOP_OFFSET_CLASS = "pt-36";
const FOOTER_STYLE: React.CSSProperties = {
  transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};
const bodyVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: transitions.slide,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: transitions.slide,
  }),
} as const;

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
        ) : tasks.length === 0 ? (
          <div className="mx-4 rounded-xl bg-card px-4 py-6 shadow-sm">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          tasks.map((task) => {
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

            return (
              <TaskListCard
                key={task.task.client_id}
                bottomAction={
                  activeInstance !== null ? (
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
                      onRequestPendingWarning={() =>
                        controller.openPendingWarning(task, activeInstance)
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
            );
          })
        )}
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
  const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();

  useEffect(() => {
    header?.setHeaderHidden(true);

    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  return (
    <div
      ref={hideProgressContainerRef}
      className="relative flex h-full min-h-0 flex-col bg-background"
      data-testid="task-post-handling-slide-page"
    >
      <div
        className="absolute inset-x-0 top-0 z-10"
        style={{ pointerEvents: isHidden ? "none" : undefined }}
      >
        <TaskPostHandlingHeader
          activeTab={controller.activeTab}
          completedFilterCount={controller.completedFilterCount}
          isLoading={controller.isBackgroundLoading}
          isPillsDisabled={controller.isPillsDisabled}
          q={controller.q}
          stateCounts={countsQuery.data}
          onFilterPress={controller.openFilterSheet}
          onQChange={controller.setQ}
          onTabChange={controller.setTab}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={HEADER_INDICATOR_OFFSET}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div
          className={CONTENT_TOP_OFFSET_CLASS}
          data-testid="task-post-handling-scroll"
        >
          {controller.mode === "carousel" ? (
            <div className="relative flex min-h-[calc(100dvh-9rem)]">
              <AnimatePresence
                custom={controller.direction}
                initial={false}
                mode="sync"
              >
                <m.div
                  key={controller.activeTab}
                  animate="center"
                  className="absolute inset-0"
                  custom={controller.direction}
                  data-testid={`task-post-handling-body-${controller.activeTab}`}
                  exit="exit"
                  initial="enter"
                  variants={bodyVariants}
                >
                  {renderTaskPane({
                    tasks:
                      controller.activeTab === "pending"
                        ? controller.pendingPane.tasks
                        : controller.filledPane.tasks,
                    isInitialLoading:
                      controller.activeTab === "pending"
                        ? controller.pendingPane.isInitialLoading
                        : controller.filledPane.isInitialLoading,
                    isError:
                      controller.activeTab === "pending"
                        ? controller.pendingPane.isError
                        : controller.filledPane.isError,
                    hasMore:
                      controller.activeTab === "pending"
                        ? controller.pendingPane.hasMore
                        : controller.filledPane.hasMore,
                    isFetchingMore:
                      controller.activeTab === "pending"
                        ? controller.pendingPane.isFetchingMore
                        : controller.filledPane.isFetchingMore,
                    onLoadMore:
                      controller.activeTab === "pending"
                        ? controller.pendingPane.loadMore
                        : controller.filledPane.loadMore,
                    emptyMessage:
                      controller.activeTab === "pending"
                        ? "No pending post-handling tasks."
                        : "No filled post-handling tasks.",
                    controller,
                  })}
                </m.div>
              </AnimatePresence>
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

      <div
        className="absolute inset-x-0 bottom-0 z-10 will-change-transform"
        style={{ ...FOOTER_STYLE, pointerEvents: isHidden ? "none" : undefined }}
      >
        <div className="border-t border-border bg-background px-4 py-3.5">
          <button
            className="w-full rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
            data-testid="task-post-handling-close-button"
            type="button"
            onClick={() => {
              if (controller.closeSurface) {
                controller.closeSurface();
                return;
              }

              header?.requestClose();
            }}
          >
            Close &amp; Back
          </button>
        </div>
        <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
      </div>
    </div>
  );
}
