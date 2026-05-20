import { TasksView } from './components/TasksView';
import { TasksViewProvider } from './providers/TasksViewProvider';

export function TasksRouteEntry(): React.JSX.Element {
  return (
    <TasksViewProvider>
      <TasksView />
    </TasksViewProvider>
  );
}
