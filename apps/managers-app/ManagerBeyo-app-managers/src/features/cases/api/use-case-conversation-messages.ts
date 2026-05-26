import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import type { CaseId } from '@/types/common';

import { caseKeys } from './case-keys';
import { getCase } from './get-case';
import type { CaseDetailRaw } from '../types';

export const CASE_CONVERSATION_MESSAGES_PAGE_SIZE = 10;

type UseCaseConversationMessagesOptions = {
  messagesLimit?: number;
};

export function useCaseConversationMessagesQuery(
  caseClientId: CaseId | null | undefined,
  options: UseCaseConversationMessagesOptions = {},
) {
  const queryClient = useQueryClient();
  const messagesLimit = options.messagesLimit ?? CASE_CONVERSATION_MESSAGES_PAGE_SIZE;
  const initialDetail = caseClientId
    ? queryClient.getQueryData<CaseDetailRaw>(caseKeys.detail(caseClientId))
    : undefined;

  return useInfiniteQuery({
    queryKey: caseClientId
      ? caseKeys.conversationDetailPages(caseClientId, { messages_limit: messagesLimit })
      : [...caseKeys.conversationDetailPagesRoot(), 'missing'] as const,
    queryFn: ({ pageParam }) => {
      if (!caseClientId) {
        throw new Error('Case id is required.');
      }

      return getCase({
        case_client_id: caseClientId,
        before_message_seq: pageParam ?? undefined,
        messages_limit: messagesLimit,
      });
    },
    enabled: Boolean(caseClientId),
    initialPageParam: null as number | null,
    initialData: initialDetail
      ? {
          pages: [initialDetail],
          pageParams: [null],
        }
      : undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.messages_pagination.has_more) {
        return undefined;
      }

      return lastPage.messages_pagination.next_before_message_seq ?? undefined;
    },
  });
}
