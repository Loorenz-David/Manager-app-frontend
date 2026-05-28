import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiRequestError } from '@beyo/api-client';
import type { CaseId } from '@beyo/lib';

import { caseKeys } from '../api/case-keys';
import { updateCaseState } from '../api/update-case-state';
import type { UpdateCaseStateInput } from '../types';

type UpdateCaseStateVariables = Pick<UpdateCaseStateInput, 'new_state'>;

export function useUpdateCaseState(caseClientId: CaseId) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ new_state }: UpdateCaseStateVariables) =>
      updateCaseState({
        case_client_id: caseClientId,
        new_state,
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseClientId) });
      void queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: caseKeys.unreadCountsRoot() });
    },
  });

  return {
    updateCaseState: mutation.mutate,
    updateCaseStateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as ApiRequestError | null,
    reset: mutation.reset,
  };
}
