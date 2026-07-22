import { createContext, useContext, type ReactNode } from "react";

import {
  usePresentationDashboardController,
  type PresentationDashboardController,
} from "../controllers/use-presentation-dashboard.controller";

const PresentationDashboardContext = createContext<PresentationDashboardController | null>(null);

type PresentationDashboardProviderProps = {
  children: ReactNode;
  navigateToEditor: (id: string) => void;
  workspaceName: string;
  userName: string;
  userAvatarUrl?: string | null;
};

export function PresentationDashboardProvider({
  children,
  navigateToEditor,
  workspaceName,
  userName,
  userAvatarUrl,
}: PresentationDashboardProviderProps): React.JSX.Element {
  const controller = usePresentationDashboardController({
    navigateToEditor,
    workspaceName,
    userName,
    userAvatarUrl,
  });

  return (
    <PresentationDashboardContext.Provider value={controller}>
      {children}
    </PresentationDashboardContext.Provider>
  );
}

export function usePresentationDashboardContext(): PresentationDashboardController {
  const context = useContext(PresentationDashboardContext);
  if (context === null) {
    throw new Error(
      "usePresentationDashboardContext must be used within PresentationDashboardProvider",
    );
  }
  return context;
}
