import { useEffect } from "react";

import { useSurfaceStore } from "@beyo/ui";
import type { CaseId } from "@beyo/lib";

import { CasesRouteEntry } from "../route-entry";
import { CASE_CONVERSATION_SURFACE_ID } from "../surface-ids";

type CaseConversationRouteHydratorProps = {
  caseClientId: CaseId;
};

export function CaseConversationRouteHydrator({
  caseClientId,
}: CaseConversationRouteHydratorProps): React.JSX.Element {
  useEffect(() => {
    useSurfaceStore
      .getState()
      .hydrate(CASE_CONVERSATION_SURFACE_ID, { caseClientId });
  }, [caseClientId]);

  return <CasesRouteEntry />;
}
