import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiRequestError } from '@/lib/api-client';
import type { CaseConversationMessageId, CaseId } from '@/types/common';

import { caseKeys } from '../api/case-keys';
import { deleteMessage } from '../api/delete-message';
import type { CaseDetailRaw } from '../types';

type UseDeleteCaseMessageOptions = {
  caseClientId: CaseId;
  conversationClientId?: string | null;
};

function softDeleteMessageInPages(
  data: InfiniteData<CaseDetailRaw> | undefined,
  messageClientId: CaseConversationMessageId,
): InfiniteData<CaseDetailRaw> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      case_conversation_messages: page.case_conversation_messages.map((m) =>
        m.client_id === messageClientId ? { ...m, has_been_deleted: true } : m,
      ),
    })),
  };
}

export function useDeleteCaseMessage({ caseClientId }: UseDeleteCaseMessageOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteMessage,
    onSuccess: (_, messageClientId) => {
      queryClient.setQueriesData<InfiniteData<CaseDetailRaw>>(
        { queryKey: caseKeys.conversationDetailPagesForCase(caseClientId) },
        (data) => softDeleteMessageInPages(data, messageClientId),
      );
      void queryClient.invalidateQueries({
        queryKey: caseKeys.detail(caseClientId),
        refetchType: 'none',
      });
      void queryClient.invalidateQueries({
        queryKey: caseKeys.lists(),
        refetchType: 'none',
      });
    },
  });

  return {
    deleteCaseMessage: mutation.mutate,
    deleteCaseMessageAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as ApiRequestError | null,
    reset: mutation.reset,
  };
}
