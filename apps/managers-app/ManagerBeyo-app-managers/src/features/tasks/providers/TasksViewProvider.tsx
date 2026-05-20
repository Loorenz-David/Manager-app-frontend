import { createContext, useContext, type ReactNode } from 'react';
import {
  useTasksViewController,
  type TasksViewController,
} from '../controllers/use-tasks-view.controller';

const TasksViewContext = createContext<TasksViewController | null>(null);

type Props = { children: ReactNode };

export function useTasksViewContext(): TasksViewController {
  const context = useContext(TasksViewContext);
  if (context === null) {
    throw new Error('useTasksViewContext must be used inside TasksViewProvider');
  }
  return context;
}

export function TasksViewProvider({ children }: Props): React.JSX.Element {
  const controller = useTasksViewController();
  return <TasksViewContext.Provider value={controller}>{children}</TasksViewContext.Provider>;
}
