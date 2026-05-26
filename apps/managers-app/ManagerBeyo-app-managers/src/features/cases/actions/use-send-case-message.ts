import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiRequestError } from '@/lib/api-client';
import { generateClientId } from '@/lib/client-id';
import type { CaseId } from '@/types/common';

import { caseKeys } from '../api/case-keys';
import { sendMessage } from '../api/send-message';
import type { SendMessageInput } from '../types';

type SendCaseMessageVariables = Omit<SendMessageInput, 'client_id'>;

export function useSendCaseMessage(caseClientId: CaseId) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: SendCaseMessageVariables) =>
      sendMessage({
        ...input,
        client_id: generateClientId('CaseConversationMessage'),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: caseKeys.detail(caseClientId),
      });
      void queryClient.invalidateQueries({
        queryKey: caseKeys.conversationDetailPagesForCase(caseClientId),
      });
      void queryClient.invalidateQueries({
        queryKey: caseKeys.lists(),
      });
    },
  });

  return {
    sendCaseMessage: mutation.mutate,
    sendCaseMessageAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as ApiRequestError | null,
    reset: mutation.reset,
  };
}
