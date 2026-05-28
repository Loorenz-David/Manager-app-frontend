import { createContext, useContext } from "react";

import type { ScrollVisibilityContextValue } from "./scroll-visibility.types";

export const ScrollVisibilityContext =
  createContext<ScrollVisibilityContextValue | null>(null);

export function useScrollVisibilityContext(): ScrollVisibilityContextValue {
  const context = useContext(ScrollVisibilityContext);

  if (!context) {
    throw new Error(
      "useScrollVisibilityContext must be used within <ScrollVisibilityProvider>",
    );
  }

  return context;
}
