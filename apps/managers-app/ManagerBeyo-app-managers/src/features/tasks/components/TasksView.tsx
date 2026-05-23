import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';

import { useTasksViewContext } from '../providers/TasksViewProvider';
import { TaskListCard } from './TaskListCard';
import { TasksHeader } from './TasksHeader';

export function TasksView(): React.JSX.Element {
  const controller = useTasksViewContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const onScroll = () => {
      const scrollTop = element.scrollTop;
      setIsScrolled(scrollTop > 0);
      setIsCompact((previous) => {
        if (!previous && scrollTop > 56) {
          return true;
        }
        if (previous && scrollTop < 8) {
          return false;
        }
        return previous;
      });
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex h-full flex-col" data-testid="tasks-view">
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

      <div
        ref={scrollRef}
        className="relative flex-1 overflow-x-hidden overflow-y-auto"
        data-testid="tasks-list-scroll"
      >
        <m.div
          animate={{ opacity: isScrolled ? 1 : 0 }}
          className="pointer-events-none sticky top-0 z-20 -mb-10 h-10 bg-linear-to-b from-background to-transparent mask-[linear-gradient(to_bottom,black,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]"
          initial={false}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />

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
                <div key={index} className="mx-4 h-64 animate-pulse rounded-xl bg-muted" />
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
              {controller.isFetchingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        ) : controller.cards.length > 0 ? (
          <div className="flex justify-center pb-6">
            <span className="text-xs text-muted-foreground" data-testid="tasks-end-of-list">
              End of list
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
