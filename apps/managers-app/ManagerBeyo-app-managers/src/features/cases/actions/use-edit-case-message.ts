import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiRequestError } from '@/lib/api-client';
import type { CaseConversationId, CaseConversationMessageId, CaseId } from '@/types/common';

import { caseKeys } from '../api/case-keys';
import { editMessage } from '../api/edit-message';
import type { CaseConversationMessageRaw, MessageContentBlock } from '../types';

type UseEditCaseMessageOptions = {
  caseClientId: CaseId;
  conversationClientId?: CaseConversationId | null;
};

type EditCaseMessageVariables = {
  content: MessageContentBlock[];
  messageClientId: CaseConversationMessageId;
  plainText: string;
};

export function useEditCaseMessage({
  caseClientId,
  conversationClientId,
}: UseEditCaseMessageOptions) {
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
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: caseKeys.detail(caseClientId),
      });
      void queryClient.invalidateQueries({
        queryKey: caseKeys.conversationDetailPagesForCase(caseClientId),
      });
      if (conversationClientId) {
        void queryClient.invalidateQueries({
          queryKey: caseKeys.conversationMessages(conversationClientId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: caseKeys.lists(),
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
