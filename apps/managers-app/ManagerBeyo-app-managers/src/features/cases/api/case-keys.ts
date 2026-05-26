import type { CaseConversationId, CaseId } from '@/types/common';
import type { ListCasesParams, ListMessagesParams } from '@/features/cases/types';

export const caseKeys = {
  all: ['cases'] as const,
  lists: () => [...caseKeys.all, 'list'] as const,
  list: (params: ListCasesParams = {}) => [...caseKeys.lists(), params] as const,
  details: () => [...caseKeys.all, 'detail'] as const,
  detail: (id: CaseId) => [...caseKeys.details(), id] as const,
  linksRoot: () => [...caseKeys.all, 'links'] as const,
  links: (caseId: CaseId) => [...caseKeys.linksRoot(), caseId] as const,
  unreadCountsRoot: () => [...caseKeys.all, 'unread-counts'] as const,
  unreadCounts: (caseClientIds?: string[]) => [...caseKeys.unreadCountsRoot(), caseClientIds] as const,
  participantsList: (caseId: CaseId) => [...caseKeys.all, 'participants', caseId] as const,
  conversationMessages: (
    conversationId: CaseConversationId,
    params: Partial<ListMessagesParams> = {},
  ) => [...caseKeys.all, 'conversation-messages', conversationId, params] as const,
};
