import { createContext, useContext, useMemo } from "react";

import type { TaskId } from "@beyo/lib";

import {
  useItemValuationController,
  type ItemValuationViewModel,
} from "../controllers/use-item-valuation.controller";
import type { ItemEconomicsSurfaceOpeners } from "../surface-ids";

/**
 * One provider for the whole expected sold price screen (contract 23): the
 * controller runs once at this boundary, and every block of the page reads the
 * same view model from it.
 */
type ItemValuationContextValue = ItemValuationViewModel & {
  /**
   * Injected by the app, never resolved here: packages declare the surfaces
   * they need and apps register them (architecture §13). Empty is a valid
   * state — every key is optional and every call site uses `?.()`.
   */
  surfaceOpeners: ItemEconomicsSurfaceOpeners;
};

const ItemValuationContext = createContext<ItemValuationContextValue | null>(
  null,
);

type ItemValuationProviderProps = {
  taskId: TaskId;
  onSaveSuccess?: () => void;
  surfaceOpeners?: ItemEconomicsSurfaceOpeners;
  children: React.ReactNode;
};

export function ItemValuationProvider({
  taskId,
  onSaveSuccess,
  surfaceOpeners,
  children,
}: ItemValuationProviderProps): React.JSX.Element {
  const controller = useItemValuationController(taskId, onSaveSuccess);
  const openers = useMemo(
    () => surfaceOpeners ?? {},
    [surfaceOpeners],
  );
  const value = useMemo(
    () => ({ ...controller, surfaceOpeners: openers }),
    [controller, openers],
  );

  return (
    <ItemValuationContext.Provider value={value}>
      {children}
    </ItemValuationContext.Provider>
  );
}

export function useItemValuationContext(): ItemValuationContextValue {
  const context = useContext(ItemValuationContext);

  if (context === null) {
    throw new Error(
      "useItemValuationContext must be used within <ItemValuationProvider>",
    );
  }

  return context;
}
