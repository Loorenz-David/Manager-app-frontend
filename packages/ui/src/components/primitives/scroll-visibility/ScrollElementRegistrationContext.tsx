import { createContext, useContext } from "react";

// Returns a cleanup fn that only clears if this element is still the active one.
type RegisterScrollElementFn = (element: HTMLElement) => () => void;

export const ScrollElementRegistrationContext =
  createContext<RegisterScrollElementFn | null>(null);

export function useScrollElementRegistration(): RegisterScrollElementFn | null {
  return useContext(ScrollElementRegistrationContext);
}
