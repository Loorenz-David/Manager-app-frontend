import { useEffect } from 'react';

import { useSurfaceStore } from '@/providers/SurfaceProvider';
import type { CaseId } from '@/types/common';

import { CasesRouteEntry } from '../route-entry';
import { CASE_CONVERSATION_SURFACE_ID } from '../surfaces';

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
