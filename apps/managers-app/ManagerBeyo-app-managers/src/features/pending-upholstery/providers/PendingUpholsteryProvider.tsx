import { createContext, useContext } from "react";

import {
  usePendingUpholsteryController,
  type PendingUpholsteryController,
} from "../controllers/use-pending-upholstery.controller";

const PendingUpholsteryContext =
  createContext<PendingUpholsteryController | null>(null);

export function PendingUpholsteryProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = usePendingUpholsteryController();
  return (
    <PendingUpholsteryContext.Provider value={controller}>
      {children}
    </PendingUpholsteryContext.Provider>
  );
}

export function usePendingUpholsteryContext(): PendingUpholsteryController {
  const context = useContext(PendingUpholsteryContext);
  if (!context) {
    throw new Error(
      "usePendingUpholsteryContext must be used within <PendingUpholsteryProvider>",
    );
  }
  return context;
}
