import { lazy, Suspense } from 'react';

import { OpenTestingFormsButton } from '@/features/testing_forms';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

const TasksRouteEntry = lazy(() =>
  import('@/features/tasks/route-entry').then((module) => ({
    default: module.TasksRouteEntry,
  })),
);

export function TasksPage(): React.JSX.Element {
  return (
    <div className="flex flex-col">
      <div className="border-b px-6 py-4">
        <OpenTestingFormsButton />
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <TasksRouteEntry />
      </Suspense>
    </div>
  );
}
