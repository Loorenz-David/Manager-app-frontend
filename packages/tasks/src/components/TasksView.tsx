import { useMemo, useRef } from "react";

import { PullToRefresh } from "@beyo/ui";
import { UpholsteryGroupHeaderCard } from "@beyo/upholstery";

import { useTasksViewContext } from "../providers/TasksViewProvider";
import { TaskListCard } from "./TaskListCard";
import { TasksHeader } from "./TasksHeader";

export function TasksView(): React.JSX.Element {
  const controller = useTasksViewContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const taskCards = useMemo(
    () =>
      controller.renderRows.map((entry) => {
        if (entry.kind === "header") {
          return (
            <UpholsteryGroupHeaderCard
              key={`header-${entry.header.reactKey}`}
              header={entry.header}
              itemCount={entry.itemCount}
              isFolded={entry.isFolded}
              onToggle={() => controller.toggleFold(entry.header.reactKey)}
            />
          );
        }

        const card = entry.row;
        return (
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
                    itemId: card.item.client_id,
                    article_number: card.item.article_number,
                    sku: card.item.sku,
                    item_major_category_snapshot:
                      card.item.item_major_category_snapshot,
                    quantity: card.item.quantity,
                  }
                : null
            }
            taskId={card.taskId}
            task={{
              task_type: card.task.task_type,
              state: card.task.state,
              return_source: card.task.return_source,
              ready_by_at: card.task.ready_by_at,
              is_overdue: card.task.is_overdue,
            }}
            onTapActions={controller.openTaskActions}
            onTapCard={controller.openTaskDetail}
            onTapImage={controller.openImageViewer}
          />
        );
      }),
    [
      controller.renderRows,
      controller.openImageViewer,
      controller.openTaskActions,
      controller.openTaskDetail,
      controller.toggleFold,
    ],
  );

  return (
    <div className="relative flex-1 min-h-0" data-testid="tasks-view">
      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div data-testid="tasks-list-scroll">
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

          <div
            className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2"
            data-testid="tasks-list"
          >
            {taskCards}

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
