import { createContext, useContext, type ReactNode } from 'react';

import {
  useTaskDetailController,
  type TaskDetailController,
} from '../controllers/use-task-detail.controller';

const TaskDetailContext = createContext<TaskDetailController | null>(null);

type TaskDetailProviderProps = {
  taskId: string;
  children: ReactNode;
};

export function TaskDetailProvider({
  taskId,
  children,
}: TaskDetailProviderProps): React.JSX.Element {
  const controller = useTaskDetailController(taskId);

  return <TaskDetailContext.Provider value={controller}>{children}</TaskDetailContext.Provider>;
}

export function useTaskDetailContext(): TaskDetailController {
  const context = useContext(TaskDetailContext);

  if (context === null) {
    throw new Error('useTaskDetailContext must be used inside TaskDetailProvider');
  }

  return context;
}
