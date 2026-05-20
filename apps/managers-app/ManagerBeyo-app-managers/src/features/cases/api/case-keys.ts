import type { CaseId } from '@/types/common';
import type { ListCasesParams } from '@/features/cases/types';

export const caseKeys = {
  all: ['cases'] as const,
  lists: () => [...caseKeys.all, 'list'] as const,
  list: (params: ListCasesParams = {}) => [...caseKeys.lists(), params] as const,
  details: () => [...caseKeys.all, 'detail'] as const,
  detail: (id: CaseId) => [...caseKeys.details(), id] as const,
};
