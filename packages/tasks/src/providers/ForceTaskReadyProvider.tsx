import { createContext, useContext } from "react";

import {
  useForceTaskReadyController,
  type ForceTaskReadyController,
} from "../controllers/use-force-task-ready.controller";

const ForceTaskReadyContext = createContext<ForceTaskReadyController | null>(
  null,
);

type ForceTaskReadyProviderProps = {
  taskId: string;
  onCompleted?: () => void;
  children: React.ReactNode;
};

export function ForceTaskReadyProvider({
  taskId,
  onCompleted,
  children,
}: ForceTaskReadyProviderProps): React.JSX.Element {
  const controller = useForceTaskReadyController(taskId, onCompleted);

  return (
    <ForceTaskReadyContext.Provider value={controller}>
      {children}
    </ForceTaskReadyContext.Provider>
  );
}

export function useForceTaskReadyContext(): ForceTaskReadyController {
  const ctx = useContext(ForceTaskReadyContext);
  if (!ctx) {
    throw new Error(
      "useForceTaskReadyContext must be used within <ForceTaskReadyProvider>",
    );
  }
  return ctx;
}
