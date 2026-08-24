import { TasksView, type TasksViewProps } from "../components/TasksView";
import { TasksViewProvider } from "../providers/TasksViewProvider";

export function TasksRouteEntry({
  showBudgetOverrun,
}: TasksViewProps = {}): React.JSX.Element {
  return (
    <TasksViewProvider>
      <TasksView showBudgetOverrun={showBudgetOverrun} />
    </TasksViewProvider>
  );
}
