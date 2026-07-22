import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify, type PauseReasonId } from "@beyo/lib";
import { updatePauseReason } from "../api/update-pause-reason";
import { pauseReasonKeys } from "../api/pause-reason-keys";
import type {
  PauseReason,
  PauseReasonsList,
  UpdatePauseReasonInput,
} from "../types";

export type UpdatePauseReasonActionInput = UpdatePauseReasonInput & {
  id: PauseReasonId;
};

export function useUpdatePauseReason() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, ...changes }: UpdatePauseReasonActionInput) =>
      updatePauseReason(id, changes),

    onMutate: async ({ id, ...changes }) => {
      await queryClient.cancelQueries({ queryKey: pauseReasonKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: pauseReasonKeys.lists() });

      const previousDetail = queryClient.getQueryData<PauseReason>(
        pauseReasonKeys.detail(id),
      );
      const previousLists = queryClient.getQueriesData<PauseReasonsList>({
        queryKey: pauseReasonKeys.lists(),
      });

      queryClient.setQueryData<PauseReason>(
        pauseReasonKeys.detail(id),
        (old) => (old ? { ...old, ...changes } : old),
      );
      queryClient.setQueriesData<PauseReasonsList>(
        { queryKey: pauseReasonKeys.lists() },
        (old) =>
          old
            ? {
                ...old,
                pause_reasons: old.pause_reasons.map((reason) =>
                  reason.client_id === id ? { ...reason, ...changes } : reason,
                ),
              }
            : old,
      );

      return { previousDetail, previousLists };
    },

    onSuccess: (reason) => {
      queryClient.setQueryData(pauseReasonKeys.detail(reason.client_id), reason);
    },

    onError: (_error, { id }, context) => {
      queryClient.setQueryData(pauseReasonKeys.detail(id), context?.previousDetail);
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      notify.error("Pause reason not updated");
    },

    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: pauseReasonKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: pauseReasonKeys.lists() });
    },
  });

  return {
    updatePauseReason: mutation.mutate,
    updatePauseReasonAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}

export type UpdatePauseReasonAction = ReturnType<typeof useUpdatePauseReason>;
