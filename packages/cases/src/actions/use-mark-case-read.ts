import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiRequestError, RequestActivity } from '@beyo/api-client';
import type { CaseId, CaseParticipantId } from '@beyo/lib';

import { caseKeys } from '../api/case-keys';
import { markRead } from '../api/mark-read';
import type { CaseParticipant } from '../types';

type MarkCaseReadVariables = {
  caseClientId: CaseId;
  caseParticipantClientId: CaseParticipantId;
  upToMessageSeq: number;
  /** `background` when the read receipt was not caused by a user action. */
  activity?: RequestActivity;
};

export function useMarkCaseRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      caseParticipantClientId,
      upToMessageSeq,
      activity,
    }: MarkCaseReadVariables) =>
      markRead(
        {
          case_participant_client_id: caseParticipantClientId,
          up_to_message_seq: upToMessageSeq,
        },
        activity ? { activity } : undefined,
      ),
    onSuccess: (lastReadMessageSeq, { caseClientId, caseParticipantClientId }) => {
      queryClient.setQueryData<CaseParticipant[]>(
        caseKeys.participantsList(caseClientId),
        (currentData) =>
          currentData?.map((p) =>
            p.client_id === caseParticipantClientId
              ? { ...p, last_read_message_seq: lastReadMessageSeq }
              : p,
          ),
      );
      void queryClient.invalidateQueries({
        queryKey: caseKeys.participantsList(caseClientId),
        refetchType: 'none',
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
