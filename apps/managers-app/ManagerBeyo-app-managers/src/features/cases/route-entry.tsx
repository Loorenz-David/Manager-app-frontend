import { CasesView } from './components/CasesView';
import { CasesViewProvider } from './providers/CasesViewProvider';

export function CasesRouteEntry(): React.JSX.Element {
  return (
    <CasesViewProvider>
      <CasesView />
    </CasesViewProvider>
  );
}
