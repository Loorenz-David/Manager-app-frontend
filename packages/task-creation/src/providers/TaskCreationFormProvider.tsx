import { createContext, useContext, type ReactNode } from "react";

import {
  useTaskCreationFormController,
  type TaskCreationFormController,
} from "../controllers/use-task-creation-form.controller";
import type { TaskCreationCallbacks } from "../surfaces";
import type { TaskCreationFormType } from "../types";

const TaskCreationFormContext =
  createContext<TaskCreationFormController | null>(null);

type TaskCreationFormProviderProps = {
  children: ReactNode;
  callbacks?: TaskCreationCallbacks;
  taskType?: TaskCreationFormType;
};

export function TaskCreationFormProvider({
  children,
  callbacks,
  taskType,
}: TaskCreationFormProviderProps): React.JSX.Element {
  const controller = useTaskCreationFormController({ callbacks, taskType });

  return (
    <TaskCreationFormContext.Provider value={controller}>
      {children}
    </TaskCreationFormContext.Provider>
  );
}

export function useTaskCreationFormContext(): TaskCreationFormController {
  const context = useContext(TaskCreationFormContext);

  if (!context) {
    throw new Error(
      "useTaskCreationFormContext must be used inside TaskCreationFormProvider",
    );
  }

  return context;
}
