import { lazy, Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { TaskCreationFab } from '@/features/task-creation';

const TasksRouteEntry = lazy(() =>
  import('@/features/tasks/route-entry').then((module) => ({
    default: module.TasksRouteEntry,
  })),
);

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
