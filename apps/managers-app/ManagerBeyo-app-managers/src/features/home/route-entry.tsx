import { HomeView } from './components/HomeView';
import { HomeViewProvider } from './providers/HomeViewProvider';

export function HomeRouteEntry(): React.JSX.Element {
  return (
    <HomeViewProvider>
      <HomeView />
    </HomeViewProvider>
  );
}
