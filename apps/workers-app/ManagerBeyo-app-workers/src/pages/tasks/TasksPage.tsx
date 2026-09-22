import { lazy, Suspense } from "react";

import { loadTasksRouteEntryPage } from "@beyo/tasks";

import { PageSkeleton } from "@/components/ui/PageSkeleton";

const TasksRouteEntry = lazy(loadTasksRouteEntryPage);

/**
 * The shared tasks listing with manager defaults. Budget signals stay off
 * (`showBudgetOverrun` is not passed) — a worker never sees money — and the
 * cards carry no ⋮ because `@beyo/tasks` hides it for this role.
 */
export function TasksPage(): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="tasks-page">
      <Suspense fallback={<PageSkeleton />}>
        <TasksRouteEntry />
      </Suspense>
    </div>
  );
}
