import { createContext, useContext } from "react";
import type { ShopifyProductSyncSurfaceOpeners } from "../surface-ids";
import type { ShopifyProductSyncFormMode } from "../types";
type Value = {
  itemClientId: string;
  itemArticleNumber: string | null;
  itemSku: string | null;
  itemCategoryId: string | null;
  productCategory: string | null;
  defaultTitle: string | null;
  taskClientId: string;
  mode: ShopifyProductSyncFormMode;
  surfaceOpeners: ShopifyProductSyncSurfaceOpeners;
  onCompleted?: () => void;
  onSkipped?: () => void;
  onKept?: () => void;
};
const Context = createContext<Value | null>(null);
export function ShopifyProductSyncFormProvider({
  children,
  surfaceOpeners,
  ...rest
}: Value & { children: React.ReactNode }): React.JSX.Element {
  return (
    <Context.Provider value={{ ...rest, surfaceOpeners: surfaceOpeners ?? {} }}>
      {children}
    </Context.Provider>
  );
}
export function useShopifyProductSyncFormContext(): Value {
  const value = useContext(Context);
  if (!value)
    throw new Error(
      "useShopifyProductSyncFormContext must be used within ShopifyProductSyncFormProvider",
    );
  return value;
}
