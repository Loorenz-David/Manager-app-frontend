import { StatsView } from './components/StatsView';
import { StatsViewProvider } from './providers/StatsViewProvider';

export function StatsRouteEntry(): React.JSX.Element {
  return (
    <StatsViewProvider>
      <StatsView />
    </StatsViewProvider>
  );
}
