import { useQuery } from '@tanstack/react-query';

import { listCases } from './list-cases';
import { caseKeys } from './case-keys';
import type { ListCasesParams } from '../types';

export function useListCasesQuery(params: ListCasesParams) {
  return useQuery({
    queryKey: caseKeys.list(params),
    queryFn: () => listCases(params),
  });
}
