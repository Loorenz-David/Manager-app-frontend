import { createContext, useContext } from "react";

import type { TaskId } from "@beyo/lib";

import {
  useItemValuationController,
  type ItemValuationViewModel,
} from "../controllers/use-item-valuation.controller";

/**
 * One provider for the whole expected sold price screen (contract 23): the
 * controller runs once at this boundary, and every block of the page reads the
 * same view model from it.
 */
const ItemValuationContext = createContext<ItemValuationViewModel | null>(null);

type ItemValuationProviderProps = {
  taskId: TaskId;
  children: React.ReactNode;
};

export function ItemValuationProvider({
  taskId,
  children,
}: ItemValuationProviderProps): React.JSX.Element {
  const controller = useItemValuationController(taskId);

  return (
    <ItemValuationContext.Provider value={controller}>
      {children}
    </ItemValuationContext.Provider>
  );
}

export function useItemValuationContext(): ItemValuationViewModel {
  const context = useContext(ItemValuationContext);

  if (context === null) {
    throw new Error(
      "useItemValuationContext must be used within <ItemValuationProvider>",
    );
  }

  return context;
}
