import { createContext, useContext } from "react";
import {
  useTaskStepDetailController,
  type TaskStepDetailController,
} from "../controllers/use-task-step-detail.controller";

const TaskStepDetailContext = createContext<TaskStepDetailController | null>(
  null,
);

export function TaskStepDetailProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = useTaskStepDetailController();

  return (
    <TaskStepDetailContext.Provider value={controller}>
      {children}
    </TaskStepDetailContext.Provider>
  );
}

export function useTaskStepDetailContext(): TaskStepDetailController {
  const ctx = useContext(TaskStepDetailContext);

  if (!ctx) {
    throw new Error(
      "useTaskStepDetailContext must be used within <TaskStepDetailProvider>",
    );
  }

  return ctx;
}
