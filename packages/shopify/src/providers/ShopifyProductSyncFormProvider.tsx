import { createContext, useContext } from "react";
import type { ShopifyProductSyncSurfaceOpeners } from "../surface-ids";
type Value = {
  itemClientId: string;
  itemArticleNumber: string | null;
  itemSku: string | null;
  defaultTitle: string | null;
  surfaceOpeners: ShopifyProductSyncSurfaceOpeners;
  onCompleted?: () => void;
  onSkipped?: () => void;
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
