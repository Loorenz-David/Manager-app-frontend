import { createContext, useContext, type ReactNode } from "react";

import {
  useTasksViewController,
  type TasksViewController,
  type TasksViewControllerOptions,
} from "../controllers/use-tasks-view.controller";

const TasksViewContext = createContext<TasksViewController | null>(null);

type Props = TasksViewControllerOptions & { children: ReactNode };

export function useTasksViewContext(): TasksViewController {
  const context = useContext(TasksViewContext);
  if (context === null) {
    throw new Error("useTasksViewContext must be used inside TasksViewProvider");
  }
  return context;
}

export function TasksViewProvider({
  children,
  showDeletedFilter,
}: Props): React.JSX.Element {
  const controller = useTasksViewController({ showDeletedFilter });
  return (
    <TasksViewContext.Provider value={controller}>
      {children}
    </TasksViewContext.Provider>
  );
}
