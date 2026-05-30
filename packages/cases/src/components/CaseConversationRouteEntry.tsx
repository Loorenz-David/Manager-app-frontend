import type { CaseId } from "@beyo/lib";

import { CaseConversationProvider } from "../providers/CaseConversationProvider";
import { CaseConversationSlideView } from "./CaseConversationSlideView";
import type { CaseConversationSurfaceOpeners } from "../surface-ids";

type CaseConversationRouteEntryProps = {
  caseClientId: CaseId;
  surfaceOpeners?: CaseConversationSurfaceOpeners;
};

export function CaseConversationRouteEntry({
  caseClientId,
  surfaceOpeners,
}: CaseConversationRouteEntryProps): React.JSX.Element {
  return (
    <CaseConversationProvider
      caseClientId={caseClientId}
      surfaceOpeners={surfaceOpeners}
    >
      <CaseConversationSlideView />
    </CaseConversationProvider>
  );
}
