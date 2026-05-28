import { useQuery } from '@tanstack/react-query';

import { getUnreadCounts } from './get-unread-counts';
import { caseKeys } from './case-keys';

export function useUnreadCountsQuery(caseClientIds?: string[]) {
  const normalizedIds = caseClientIds ? [...caseClientIds].sort() : undefined;

  return useQuery({
    queryKey: caseKeys.unreadCounts(normalizedIds),
    queryFn: () => getUnreadCounts(normalizedIds),
    enabled: normalizedIds === undefined || normalizedIds.length > 0,
    staleTime: 30_000,
  });
}
