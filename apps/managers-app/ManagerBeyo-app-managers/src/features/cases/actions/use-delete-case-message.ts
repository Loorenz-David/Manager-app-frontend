import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiRequestError } from '@/lib/api-client';
import type { CaseConversationId, CaseId } from '@/types/common';

import { caseKeys } from '../api/case-keys';
import { deleteMessage } from '../api/delete-message';

type UseDeleteCaseMessageOptions = {
  caseClientId: CaseId;
  conversationClientId?: CaseConversationId | null;
};

export function useDeleteCaseMessage({
  caseClientId,
  conversationClientId,
}: UseDeleteCaseMessageOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteMessage,
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
    deleteCaseMessage: mutation.mutate,
    deleteCaseMessageAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as ApiRequestError | null,
    reset: mutation.reset,
  };
}
