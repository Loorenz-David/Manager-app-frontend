import { TaskListCard } from "@beyo/tasks";
import { PullToRefresh, useScrollHide } from "@beyo/ui";

import { useTasksViewContext } from "../providers/TasksViewProvider";
import { TasksHeader } from "./TasksHeader";

export function TasksView(): React.JSX.Element {
  const controller = useTasksViewContext();
  const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();

  return (
    <div
      ref={hideProgressContainerRef}
      className="relative flex-1 min-h-0"
      data-testid="tasks-view"
    >
      <div
        className="absolute inset-x-0 top-0 z-10"
        style={{
          transform:
            "translateY(calc(-1 * var(--type-picker-height, 56px) * var(--scroll-hide-progress, 0)))",
          transition: "transform var(--scroll-snap-duration, 0ms) ease-out",
          pointerEvents: isHidden ? "none" : undefined,
        }}
      >
        <TasksHeader
          activeFilterCount={controller.activeFilterCount}
          isLoading={controller.isLoading}
          q={controller.q}
          taskStates={controller.taskStates}
          taskType={controller.taskType}
          onFilterPress={controller.openFilterSheet}
          onQChange={controller.setQ}
          onSortPress={controller.openSortSheet}
          onTaskStatesChange={controller.setTaskStates}
          onTaskTypeChange={controller.setTaskType}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
        indicatorOffset={176}
      >
        <div className="pt-44" data-testid="tasks-list-scroll">
          <div
            className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2"
            data-testid="tasks-list"
          >
            {controller.cards.map((card) => (
              <TaskListCard
                key={card.taskId}
                imageUrl={
                  card.firstImage
                    ? (card.firstImage.localObjectUrl ?? card.firstImage.imageUrl)
                    : null
                }
                item={
                  card.item
                    ? {
                        itemId: card.item.id,
                        article_number: card.item.article_number,
                        sku: card.item.sku,
                        item_major_category_snapshot:
                          card.item.item_major_category_snapshot,
                        quantity: card.item.quantity,
                      }
                    : null
                }
                onTapActions={controller.openTaskActions}
                onTapCard={controller.openTaskDetail}
                onTapImage={controller.openImageViewer}
                task={{
                  task_type: card.task.task_type,
                  state: card.task.state,
                  return_source: card.task.return_source,
                  ready_by_at: card.task.ready_by_at,
                  is_overdue: card.task.is_overdue,
                }}
                taskId={card.taskId}
              />
            ))}

            {controller.isLoading && controller.cards.length === 0 ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="mx-4 h-30 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : null}
          </div>

          {controller.hasMore || controller.isFetchingMore ? (
            <div className="flex justify-center pb-6">
              <button
                className="rounded-full bg-card px-6 py-2 text-sm font-medium text-foreground shadow-sm disabled:opacity-50"
                data-testid="tasks-load-more-button"
                disabled={controller.isFetchingMore}
                type="button"
                onClick={controller.loadMore}
              >
                {controller.isFetchingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : controller.cards.length > 0 ? (
            <div className="flex justify-center pb-6">
              <span
                className="text-xs text-muted-foreground"
                data-testid="tasks-end-of-list"
              >
                End of list
              </span>
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </div>
  );
}
