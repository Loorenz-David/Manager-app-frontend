import { CasesView } from "./components/CasesView";
import { CasesViewProvider } from "./providers/CasesViewProvider";
import type {
  CaseConversationSurfaceOpeners,
  CasesViewSurfaceOpeners,
} from "./surface-ids";

type CasesRouteEntryProps = {
  surfaceOpeners?: CaseConversationSurfaceOpeners;
  viewSurfaceOpeners?: CasesViewSurfaceOpeners;
};

export function CasesRouteEntry({
  surfaceOpeners,
  viewSurfaceOpeners,
}: CasesRouteEntryProps = {}): React.JSX.Element {
  return (
    <CasesViewProvider
      surfaceOpeners={surfaceOpeners}
      viewSurfaceOpeners={viewSurfaceOpeners}
    >
      <CasesView />
    </CasesViewProvider>
  );
}
