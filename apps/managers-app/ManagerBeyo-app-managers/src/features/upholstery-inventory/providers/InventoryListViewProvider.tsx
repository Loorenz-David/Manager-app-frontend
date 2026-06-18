import { createContext, useContext, type ReactNode } from "react";

import {
  useInventoryListController,
  type InventoryListController,
} from "../controllers/use-inventory-list.controller";

const InventoryListViewContext =
  createContext<InventoryListController | null>(null);

export function useInventoryListViewContext(): InventoryListController {
  const context = useContext(InventoryListViewContext);
  if (!context) {
    throw new Error(
      "useInventoryListViewContext must be used inside InventoryListViewProvider",
    );
  }
  return context;
}

export function InventoryListViewProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const controller = useInventoryListController();
  return (
    <InventoryListViewContext.Provider value={controller}>
      {children}
    </InventoryListViewContext.Provider>
  );
}
