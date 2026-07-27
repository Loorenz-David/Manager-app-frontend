import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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
  // Registrations overlap whenever two scroll containers are mounted at once —
  // a page transition, or a slide-stack drag rendering the pane beneath the
  // active one. Keeping them as a stack means the newest live container is
  // always current, and unregistering it falls back to the previous one rather
  // than leaving the app with none.
  const registrationsRef = useRef<HTMLElement[]>([]);

  const registerScrollElement = useCallback((element: HTMLElement) => {
    registrationsRef.current = [...registrationsRef.current, element];
    setScrollElement(element);

    return () => {
      registrationsRef.current = registrationsRef.current.filter(
        (registered) => registered !== element,
      );
      setScrollElement(registrationsRef.current.at(-1) ?? null);
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
