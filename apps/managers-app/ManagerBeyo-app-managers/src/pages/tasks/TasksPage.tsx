import { lazy, Suspense } from 'react';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

const TasksRouteEntry = lazy(() =>
  import('@/features/tasks/route-entry').then((module) => ({
    default: module.TasksRouteEntry,
  })),
);

export function TasksPage(): React.JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TasksRouteEntry />
    </Suspense>
  );
}
