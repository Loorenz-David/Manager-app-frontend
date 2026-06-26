import { createContext, useContext, type ReactNode } from "react";

import {
  useTaskWorkingSectionsController,
  type TaskWorkingSectionsController,
} from "../controllers/use-task-working-sections.controller";
import type {
  RecoveredPendingAdd,
  RecoveredPendingReassignment,
  TaskWorkingSectionsSurfaceOpeners,
} from "../surface-ids";

const TaskWorkingSectionsContext =
  createContext<TaskWorkingSectionsController | null>(null);

type TaskWorkingSectionsProviderProps = {
  taskId: string;
  initialPendingAdds?: RecoveredPendingAdd[];
  initialPendingRemoveIds?: string[];
  initialPendingReassignments?: RecoveredPendingReassignment[];
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
  children: ReactNode;
};

export function TaskWorkingSectionsProvider({
  taskId,
  initialPendingAdds,
  initialPendingRemoveIds,
  initialPendingReassignments,
  surfaceOpeners,
  children,
}: TaskWorkingSectionsProviderProps): React.JSX.Element {
  const controller = useTaskWorkingSectionsController(taskId, {
    initialPendingAdds,
    initialPendingRemoveIds,
    initialPendingReassignments,
    surfaceOpeners,
  });

  return (
    <TaskWorkingSectionsContext.Provider value={controller}>
      {children}
    </TaskWorkingSectionsContext.Provider>
  );
}

export function useTaskWorkingSectionsContext(): TaskWorkingSectionsController {
  const context = useContext(TaskWorkingSectionsContext);

  if (context === null) {
    throw new Error(
      "useTaskWorkingSectionsContext must be used inside TaskWorkingSectionsProvider",
    );
  }

  return context;
}
