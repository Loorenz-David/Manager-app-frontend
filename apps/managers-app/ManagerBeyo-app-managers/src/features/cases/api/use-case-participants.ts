import { useQuery } from '@tanstack/react-query';

import type { CaseId } from '@/types/common';

import { caseKeys } from './case-keys';
import { listCaseParticipants } from './list-case-participants';

export function useCaseParticipantsQuery(caseClientId: CaseId | null | undefined) {
  return useQuery({
    queryKey: caseClientId
      ? caseKeys.participantsList(caseClientId)
      : [...caseKeys.all, 'participants', 'missing'],
    queryFn: () => {
      if (!caseClientId) {
        throw new Error('Case id is required.');
      }

      return listCaseParticipants(caseClientId);
    },
    enabled: Boolean(caseClientId),
  });
}
