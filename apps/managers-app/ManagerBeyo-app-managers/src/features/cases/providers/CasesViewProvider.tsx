import { createContext, useContext, type ReactNode } from 'react';
import {
  useCasesViewController,
  type CasesViewController,
} from '../controllers/use-cases-view.controller';

const CasesViewContext = createContext<CasesViewController | null>(null);

type Props = { children: ReactNode };

export function useCasesViewContext(): CasesViewController {
  const context = useContext(CasesViewContext);
  if (context === null) {
    throw new Error('useCasesViewContext must be used inside CasesViewProvider');
  }
  return context;
}

export function CasesViewProvider({ children }: Props): React.JSX.Element {
  const controller = useCasesViewController();
  return <CasesViewContext.Provider value={controller}>{children}</CasesViewContext.Provider>;
}
