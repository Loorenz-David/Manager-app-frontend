import { useQuery } from '@tanstack/react-query';

import type { CaseId } from '@/types/common';

import { caseKeys } from './case-keys';
import { getCase, type GetCaseParams } from './get-case';

export type UseGetCaseQueryOptions = Omit<GetCaseParams, 'case_client_id'>;

export function useGetCaseQuery(
  caseClientId: CaseId | null | undefined,
  options: UseGetCaseQueryOptions = {},
) {
  return useQuery({
    queryKey: caseClientId
      ? caseKeys.detail(caseClientId)
      : [...caseKeys.details(), 'missing'],
    queryFn: () => {
      if (!caseClientId) {
        throw new Error('Case id is required.');
      }

      return getCase({ case_client_id: caseClientId, ...options });
    },
    enabled: Boolean(caseClientId),
  });
}
