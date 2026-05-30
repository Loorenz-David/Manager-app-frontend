import { createContext, useContext, type ReactNode } from "react";

import {
  useTabBadgeCountsController,
  type TabBadgeCountsController,
} from "@/hooks/use-tab-badge-counts.controller";

const TabBadgeCountsContext = createContext<TabBadgeCountsController | null>(
  null,
);

type TabBadgeCountsProviderProps = {
  children: ReactNode;
};

export function TabBadgeCountsProvider({
  children,
}: TabBadgeCountsProviderProps): React.JSX.Element {
  const controller = useTabBadgeCountsController();

  return (
    <TabBadgeCountsContext.Provider value={controller}>
      {children}
    </TabBadgeCountsContext.Provider>
  );
}

export function useTabBadgeCountsContext(): TabBadgeCountsController {
  const context = useContext(TabBadgeCountsContext);

  if (!context) {
    throw new Error(
      "useTabBadgeCountsContext must be used within <TabBadgeCountsProvider>",
    );
  }

  return context;
}
