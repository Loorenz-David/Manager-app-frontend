import { TasksView, type TasksViewProps } from "../components/TasksView";
import type { TasksViewControllerOptions } from "../controllers/use-tasks-view.controller";
import { TasksViewProvider } from "../providers/TasksViewProvider";

export function TasksRouteEntry({
  showBudgetOverrun,
  showDeletedFilter,
}: TasksViewProps & TasksViewControllerOptions = {}): React.JSX.Element {
  return (
    <TasksViewProvider showDeletedFilter={showDeletedFilter}>
      <TasksView showBudgetOverrun={showBudgetOverrun} />
    </TasksViewProvider>
  );
}
