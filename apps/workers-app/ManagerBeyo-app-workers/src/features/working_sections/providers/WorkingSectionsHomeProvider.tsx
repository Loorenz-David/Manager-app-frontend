import { createContext, useContext } from "react";
import {
  useWorkingSectionsHomeController,
  type WorkingSectionsHomeController,
} from "../controllers/use-working-sections-home.controller";

const WorkingSectionsHomeContext =
  createContext<WorkingSectionsHomeController | null>(null);

export function WorkingSectionsHomeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = useWorkingSectionsHomeController();

  return (
    <WorkingSectionsHomeContext.Provider value={controller}>
      {children}
    </WorkingSectionsHomeContext.Provider>
  );
}

export function useWorkingSectionsHomeContext(): WorkingSectionsHomeController {
  const ctx = useContext(WorkingSectionsHomeContext);

  if (!ctx) {
    throw new Error(
      "useWorkingSectionsHomeContext must be used within <WorkingSectionsHomeProvider>",
    );
  }

  return ctx;
}
