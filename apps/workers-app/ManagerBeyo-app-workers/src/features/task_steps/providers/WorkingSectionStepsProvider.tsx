import { createContext, useContext } from "react";
import type { WorkingSectionId } from "@beyo/lib";
import {
  useWorkingSectionStepsController,
  type WorkingSectionStepsController,
} from "../controllers/use-working-section-steps.controller";

const WorkingSectionStepsContext =
  createContext<WorkingSectionStepsController | null>(null);

export function WorkingSectionStepsProvider({
  sectionId,
  children,
}: {
  sectionId: WorkingSectionId;
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = useWorkingSectionStepsController(sectionId);

  return (
    <WorkingSectionStepsContext.Provider value={controller}>
      {children}
    </WorkingSectionStepsContext.Provider>
  );
}

export function useWorkingSectionStepsContext(): WorkingSectionStepsController {
  const ctx = useContext(WorkingSectionStepsContext);

  if (!ctx) {
    throw new Error(
      "useWorkingSectionStepsContext must be used within <WorkingSectionStepsProvider>",
    );
  }

  return ctx;
}
