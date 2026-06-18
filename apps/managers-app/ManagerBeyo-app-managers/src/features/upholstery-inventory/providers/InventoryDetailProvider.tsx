import { createContext, useContext, type ReactNode } from "react";

import {
  useInventoryDetailController,
  type InventoryDetailController,
} from "../controllers/use-inventory-detail.controller";
import type { UpholsteryInventoryId } from "@/types/common";

const InventoryDetailContext =
  createContext<InventoryDetailController | null>(null);

export function useInventoryDetailContext(): InventoryDetailController {
  const context = useContext(InventoryDetailContext);
  if (!context) {
    throw new Error(
      "useInventoryDetailContext must be used inside InventoryDetailProvider",
    );
  }
  return context;
}

export function InventoryDetailProvider({
  children,
  inventoryId,
}: {
  children: ReactNode;
  inventoryId: UpholsteryInventoryId;
}): React.JSX.Element {
  const controller = useInventoryDetailController(inventoryId);
  return (
    <InventoryDetailContext.Provider value={controller}>
      {children}
    </InventoryDetailContext.Provider>
  );
}
