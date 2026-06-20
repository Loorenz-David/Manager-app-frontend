import { createContext, useContext } from "react";
import type { TaskId } from "@beyo/lib";
import {
  usePinNotificationsController,
  type PinNotificationsController,
} from "../controllers/use-pin-notifications.controller";

const PinNotificationsContext =
  createContext<PinNotificationsController | null>(null);

export function PinNotificationsProvider({
  taskId,
  itemId,
  children,
}: {
  taskId: TaskId;
  itemId: string | null | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = usePinNotificationsController({ taskId, itemId });

  return (
    <PinNotificationsContext.Provider value={controller}>
      {children}
    </PinNotificationsContext.Provider>
  );
}

export function usePinNotificationsContext(): PinNotificationsController {
  const context = useContext(PinNotificationsContext);

  if (!context) {
    throw new Error(
      "usePinNotificationsContext must be used within PinNotificationsProvider",
    );
  }

  return context;
}
