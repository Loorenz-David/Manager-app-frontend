import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiRequestError } from '@/lib/api-client';
import type { CaseId } from '@/types/common';

import { caseKeys } from '../api/case-keys';
import { markRead } from '../api/mark-read';
import type { CaseParticipantId } from '@/types/common';

type MarkCaseReadVariables = {
  caseClientId: CaseId;
  caseParticipantClientId: CaseParticipantId;
  upToMessageSeq: number;
};

export function useMarkCaseRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      caseParticipantClientId,
      upToMessageSeq,
    }: MarkCaseReadVariables) =>
      markRead({
        case_participant_client_id: caseParticipantClientId,
        up_to_message_seq: upToMessageSeq,
      }),
    onSuccess: (_lastReadMessageSeq, { caseClientId }) => {
      void queryClient.invalidateQueries({
        queryKey: caseKeys.participantsList(caseClientId),
      });
      void queryClient.invalidateQueries({ queryKey: caseKeys.unreadCountsRoot() });
    },
  });

  return {
    markCaseRead: mutation.mutate,
    markCaseReadAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as ApiRequestError | null,
    reset: mutation.reset,
  };
}
