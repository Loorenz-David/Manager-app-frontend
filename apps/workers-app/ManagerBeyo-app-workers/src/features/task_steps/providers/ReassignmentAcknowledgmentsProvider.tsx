import { createContext, useContext } from "react";
import {
  useReassignmentAcknowledgmentsController,
  type ReassignmentAcknowledgmentsController,
} from "../controllers/use-reassignment-acknowledgments.controller";

const ReassignmentAcknowledgmentsContext =
  createContext<ReassignmentAcknowledgmentsController | null>(null);

export function ReassignmentAcknowledgmentsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = useReassignmentAcknowledgmentsController();

  return (
    <ReassignmentAcknowledgmentsContext.Provider value={controller}>
      {children}
    </ReassignmentAcknowledgmentsContext.Provider>
  );
}

export function useReassignmentAcknowledgmentsContext(): ReassignmentAcknowledgmentsController {
  const context = useContext(ReassignmentAcknowledgmentsContext);

  if (!context) {
    throw new Error(
      "useReassignmentAcknowledgmentsContext must be used within <ReassignmentAcknowledgmentsProvider>",
    );
  }

  return context;
}
