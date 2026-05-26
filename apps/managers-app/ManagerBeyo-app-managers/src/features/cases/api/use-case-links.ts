import { useQuery } from '@tanstack/react-query';

import type { CaseId } from '@/types/common';

import { caseKeys } from './case-keys';
import { listCaseLinks } from './list-case-links';

export function useCaseLinksQuery(caseClientId: CaseId | null | undefined) {
  return useQuery({
    queryKey: caseClientId ? caseKeys.links(caseClientId) : [...caseKeys.linksRoot(), 'missing'],
    queryFn: () => {
      if (!caseClientId) {
        throw new Error('Case id is required.');
      }

      return listCaseLinks(caseClientId);
    },
    enabled: Boolean(caseClientId),
  });
}
