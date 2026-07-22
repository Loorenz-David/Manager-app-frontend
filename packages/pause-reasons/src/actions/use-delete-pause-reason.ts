import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import { deletePauseReason } from "../api/delete-pause-reason";
import { pauseReasonKeys } from "../api/pause-reason-keys";
import type { PauseReason, PauseReasonsList } from "../types";

export function useDeletePauseReason() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deletePauseReason,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: pauseReasonKeys.lists() });
      const previousLists = queryClient.getQueriesData<PauseReasonsList>({
        queryKey: pauseReasonKeys.lists(),
      });
      const previousDetail = queryClient.getQueryData<PauseReason>(
        pauseReasonKeys.detail(id),
      );

      queryClient.setQueriesData<PauseReasonsList>(
        { queryKey: pauseReasonKeys.lists() },
        (old) =>
          old
            ? {
                ...old,
                pause_reasons: old.pause_reasons.filter(
                  (reason) => reason.client_id !== id,
                ),
              }
            : old,
      );

      return { previousLists, previousDetail };
    },

    onSuccess: () => {
      notify.success("Pause reason deleted");
    },

    onError: (_error, id, context) => {
      queryClient.setQueryData(pauseReasonKeys.detail(id), context?.previousDetail);
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      notify.error("Pause reason not deleted");
    },

    onSettled: (_data, _error, id) => {
      queryClient.removeQueries({ queryKey: pauseReasonKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: pauseReasonKeys.lists() });
    },
  });

  return {
    deletePauseReason: mutation.mutate,
    deletePauseReasonAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export type DeletePauseReasonAction = ReturnType<typeof useDeletePauseReason>;
