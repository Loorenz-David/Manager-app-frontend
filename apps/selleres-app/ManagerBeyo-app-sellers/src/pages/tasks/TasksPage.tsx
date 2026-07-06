import { lazy, Suspense } from 'react';

import { loadTasksRouteEntryPage } from "@beyo/tasks";

import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { TaskCreationFab } from '@/features/tasks/components/TaskCreationFab';

const TasksRouteEntry = lazy(loadTasksRouteEntryPage);

export function TasksPage(): React.JSX.Element {
  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <Suspense fallback={<PageSkeleton />}>
          <TasksRouteEntry />
        </Suspense>
      </div>
      <TaskCreationFab />
    </>
  );
}
