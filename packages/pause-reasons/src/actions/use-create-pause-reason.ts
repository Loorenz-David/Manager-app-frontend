import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify, type PauseReasonId } from "@beyo/lib";
import { createPauseReason } from "../api/create-pause-reason";
import { pauseReasonKeys } from "../api/pause-reason-keys";
import type {
  CreatePauseReasonInput,
  PauseReason,
  PauseReasonsList,
} from "../types";

function toOptimisticPauseReason(input: CreatePauseReasonInput): PauseReason {
  return {
    client_id: `par_optimistic_${crypto.randomUUID()}` as PauseReasonId,
    name: input.name,
    image_url: input.image_url ?? null,
    pause_type: input.pause_type,
    description: input.description ?? null,
    requires_description: input.requires_description,
    is_system_managed: false,
    slug: "pause_optimistic",
    created_at: new Date().toISOString(),
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  };
}

export function useCreatePauseReason() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createPauseReason,

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: pauseReasonKeys.lists() });
      const previousLists = queryClient.getQueriesData<PauseReasonsList>({
        queryKey: pauseReasonKeys.lists(),
      });
      const optimisticReason = toOptimisticPauseReason(input);

      queryClient.setQueriesData<PauseReasonsList>(
        { queryKey: pauseReasonKeys.lists() },
        (old) =>
          old
            ? {
                ...old,
                pause_reasons: [...old.pause_reasons, optimisticReason],
              }
            : old,
      );

      return { previousLists };
    },

    onSuccess: (reason) => {
      queryClient.setQueryData(pauseReasonKeys.detail(reason.client_id), reason);
      notify.success("Pause reason created");
    },

    onError: (_error, _input, context) => {
      context?.previousLists.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      notify.error("Pause reason not created");
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: pauseReasonKeys.lists() });
    },
  });

  return {
    createPauseReason: mutation.mutate,
    createPauseReasonAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}

export type CreatePauseReasonAction = ReturnType<typeof useCreatePauseReason>;
