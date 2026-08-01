import { createContext, useContext } from "react";
import {
  useHomeTopCardsController,
  type HomeTopCardsController,
} from "../controllers/use-home-top-cards.controller";

const HomeTopCardsContext = createContext<HomeTopCardsController | null>(null);

export function HomeTopCardsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = useHomeTopCardsController();

  return (
    <HomeTopCardsContext.Provider value={controller}>
      {children}
    </HomeTopCardsContext.Provider>
  );
}

export function useHomeTopCardsContext(): HomeTopCardsController {
  const ctx = useContext(HomeTopCardsContext);
  if (!ctx) {
    throw new Error(
      "useHomeTopCardsContext must be used within <HomeTopCardsProvider>",
    );
  }
  return ctx;
}
