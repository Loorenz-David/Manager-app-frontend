import { createContext, useContext } from "react";
import {
  useLastActiveStepCardController,
  type LastActiveStepCardController,
} from "../controllers/use-last-active-step-card.controller";

const LastActiveStepCardContext =
  createContext<LastActiveStepCardController | null>(null);

export function LastActiveStepCardProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = useLastActiveStepCardController();

  return (
    <LastActiveStepCardContext.Provider value={controller}>
      {children}
    </LastActiveStepCardContext.Provider>
  );
}

export function useLastActiveStepCardContext(): LastActiveStepCardController {
  const context = useContext(LastActiveStepCardContext);

  if (!context) {
    throw new Error(
      "useLastActiveStepCardContext must be used within <LastActiveStepCardProvider>",
    );
  }

  return context;
}
