import { createContext, useContext, type ReactNode } from 'react';
import {
  useHomeViewController,
  type HomeViewController,
} from '../controllers/use-home-view.controller';

const HomeViewContext = createContext<HomeViewController | null>(null);

type Props = { children: ReactNode };

export function useHomeViewContext(): HomeViewController {
  const context = useContext(HomeViewContext);
  if (context === null) {
    throw new Error('useHomeViewContext must be used inside HomeViewProvider');
  }
  return context;
}

export function HomeViewProvider({ children }: Props): React.JSX.Element {
  const controller = useHomeViewController();
  return <HomeViewContext.Provider value={controller}>{children}</HomeViewContext.Provider>;
}
