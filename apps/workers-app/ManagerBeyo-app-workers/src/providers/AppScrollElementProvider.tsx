import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  ScrollElementRegistrationContext,
  ScrollVisibilityProvider,
} from "@beyo/ui";

type AppScrollElementContextValue = {
  registerScrollElement: (element: HTMLElement) => () => void;
};

const AppScrollElementContext =
  createContext<AppScrollElementContextValue | null>(null);

export function AppScrollElementProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

  const registerScrollElement = useCallback((element: HTMLElement) => {
    setScrollElement(element);
    return () => {
      setScrollElement((prev) => (prev === element ? null : prev));
    };
  }, []);

  const contextValue = useMemo(
    () => ({ registerScrollElement }),
    [registerScrollElement],
  );

  return (
    <AppScrollElementContext.Provider value={contextValue}>
      <ScrollElementRegistrationContext.Provider value={registerScrollElement}>
        <ScrollVisibilityProvider scrollElement={scrollElement} mode="relative">
          {children}
        </ScrollVisibilityProvider>
      </ScrollElementRegistrationContext.Provider>
    </AppScrollElementContext.Provider>
  );
}

export function useRegisterScrollElement(): (
  element: HTMLElement,
) => () => void {
  const context = useContext(AppScrollElementContext);

  if (!context) {
    throw new Error(
      "useRegisterScrollElement must be used within <AppScrollElementProvider>",
    );
  }

  return context.registerScrollElement;
}
