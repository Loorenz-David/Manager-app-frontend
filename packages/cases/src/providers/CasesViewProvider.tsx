import { createContext, useContext, type ReactNode } from "react";
import {
  useCasesViewController,
  type CasesViewController,
} from "../controllers/use-cases-view.controller";
import type { CASE_LINK_ENTITY_TYPE } from "../types";
import type {
  CaseConversationSurfaceOpeners,
  CasesViewSurfaceOpeners,
} from "../surface-ids";

const CasesViewContext = createContext<CasesViewController | null>(null);

type Props = {
  children: ReactNode;
  entityClientId?: string;
  entityType?: (typeof CASE_LINK_ENTITY_TYPE)[number];
  surfaceOpeners?: CaseConversationSurfaceOpeners;
  viewSurfaceOpeners?: CasesViewSurfaceOpeners;
};

export function useCasesViewContext(): CasesViewController {
  const context = useContext(CasesViewContext);
  if (context === null) {
    throw new Error(
      "useCasesViewContext must be used inside CasesViewProvider",
    );
  }
  return context;
}

export function CasesViewProvider({
  children,
  entityClientId,
  entityType,
  surfaceOpeners,
  viewSurfaceOpeners,
}: Props): React.JSX.Element {
  const controller = useCasesViewController({
    entityClientId,
    entityType,
    surfaceOpeners,
    viewSurfaceOpeners,
  });
  return (
    <CasesViewContext.Provider value={controller}>
      {children}
    </CasesViewContext.Provider>
  );
}
