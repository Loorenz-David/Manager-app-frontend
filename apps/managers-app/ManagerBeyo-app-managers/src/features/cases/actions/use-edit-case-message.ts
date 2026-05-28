import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiRequestError } from '@/lib/api-client';
import type { CaseId } from '@/types/common';

import { caseKeys } from '../api/case-keys';
import { editMessage } from '../api/edit-message';
import type { CaseConversationMessageRaw, CaseDetailRaw, MessageContentBlock } from '../types';

type UseEditCaseMessageOptions = {
  caseClientId: CaseId;
  conversationClientId?: string | null;
};

type EditCaseMessageVariables = {
  content: MessageContentBlock[];
  messageClientId: CaseConversationMessageRaw['client_id'];
  plainText: string;
};

function patchMessageInPages(
  data: InfiniteData<CaseDetailRaw> | undefined,
  updatedMessage: CaseConversationMessageRaw,
): InfiniteData<CaseDetailRaw> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      case_conversation_messages: page.case_conversation_messages.map((m) =>
        m.client_id === updatedMessage.client_id ? updatedMessage : m,
      ),
    })),
  };
}

export function useEditCaseMessage({ caseClientId }: UseEditCaseMessageOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      content,
      messageClientId,
      plainText,
    }: EditCaseMessageVariables): Promise<CaseConversationMessageRaw> => {
      return editMessage({
        message_client_id: messageClientId,
        content,
        plain_text: plainText,
      });
    },
    onSuccess: (editedMessage) => {
      queryClient.setQueriesData<InfiniteData<CaseDetailRaw>>(
        { queryKey: caseKeys.conversationDetailPagesForCase(caseClientId) },
        (data) => patchMessageInPages(data, editedMessage),
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
    editCaseMessage: mutation.mutate,
    editCaseMessageAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as ApiRequestError | null,
    reset: mutation.reset,
  };
}
