import { createContext, useContext, type ReactNode } from 'react';
import {
  useStatsViewController,
  type StatsViewController,
} from '../controllers/use-stats-view.controller';

const StatsViewContext = createContext<StatsViewController | null>(null);

type Props = { children: ReactNode };

export function useStatsViewContext(): StatsViewController {
  const context = useContext(StatsViewContext);
  if (context === null) {
    throw new Error('useStatsViewContext must be used inside StatsViewProvider');
  }
  return context;
}

export function StatsViewProvider({ children }: Props): React.JSX.Element {
  const controller = useStatsViewController();
  return <StatsViewContext.Provider value={controller}>{children}</StatsViewContext.Provider>;
}
