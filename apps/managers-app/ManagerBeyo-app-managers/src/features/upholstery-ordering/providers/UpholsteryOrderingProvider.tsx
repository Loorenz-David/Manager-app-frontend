import { createContext, useContext } from "react";

import {
  useUpholsteryOrderingController,
  type UpholsteryOrderingController,
} from "../controllers/use-upholstery-ordering.controller";

const UpholsteryOrderingContext =
  createContext<UpholsteryOrderingController | null>(null);

export function UpholsteryOrderingProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = useUpholsteryOrderingController();
  return (
    <UpholsteryOrderingContext.Provider value={controller}>
      {children}
    </UpholsteryOrderingContext.Provider>
  );
}

export function useUpholsteryOrderingContext(): UpholsteryOrderingController {
  const context = useContext(UpholsteryOrderingContext);
  if (!context) {
    throw new Error(
      "useUpholsteryOrderingContext must be used within <UpholsteryOrderingProvider>",
    );
  }
  return context;
}
