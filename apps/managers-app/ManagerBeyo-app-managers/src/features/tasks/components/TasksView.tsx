import { cn } from "@beyo/lib";
import { PullToRefresh, useScrollVisibility } from "@beyo/ui";

import { useTasksViewContext } from "../providers/TasksViewProvider";
import { TaskListCard } from "./TaskListCard";
import { TasksHeader } from "./TasksHeader";

const HEADER_TRANSITION = "transition-[top] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]";

// top-[60px]  — compact: only the search bar is visible (~60 px)
// top-40      — expanded: type picker + search bar + pill filters (~160 px)
const COMPACT_TOP = "top-[60px]";
const EXPANDED_TOP = "top-40";

export function TasksView(): React.JSX.Element {
  const controller = useTasksViewContext();
  const { scrollRef, isHidden: isCompact } = useScrollVisibility({ mode: "relative" });

  return (
    <div className="relative flex-1 min-h-0" data-testid="tasks-view">
      <div className="absolute inset-x-0 top-0 z-10">
        <TasksHeader
          activeFilterCount={controller.activeFilterCount}
          isCompact={isCompact}
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
        className={cn(
          "absolute inset-x-0 bottom-0",
          HEADER_TRANSITION,
          isCompact ? COMPACT_TOP : EXPANDED_TOP,
        )}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div data-testid="tasks-list-scroll">
          <div
            className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2"
            data-testid="tasks-list"
          >
            {controller.cards.map((card) => (
              <TaskListCard
                key={card.taskId}
                card={card}
                onTapActions={controller.openTaskActions}
                onTapCard={controller.openTaskDetail}
                onTapImage={controller.openImageViewer}
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
