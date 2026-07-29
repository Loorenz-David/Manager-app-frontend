import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CloseDeclaredStateResultSchema,
  type CloseDeclaredStateInput,
  type CloseDeclaredStateResult,
} from "../types";
import { workerShiftKeys } from "../api/worker-shift-keys";

const CloseDeclaredStateResponseSchema = ApiEnvelopeSchema(
  CloseDeclaredStateResultSchema,
);

async function closeDeclaredState(
  input: CloseDeclaredStateInput,
): Promise<CloseDeclaredStateResult> {
  const response = await apiClient.post(
    "/api/v1/worker-shifts/declared-states/close",
    CloseDeclaredStateResponseSchema,
    input,
  );
  return response.data;
}

export function useCloseDeclaredState() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: closeDeclaredState,
    onSettled: (_data, _error, input) =>
      queryClient.invalidateQueries({
        queryKey: workerShiftKeys.current({ user_id: input.user_id }),
      }),
  });

  return {
    closeDeclaredState: mutation.mutate,
    closeDeclaredStateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export type CloseDeclaredStateAction = ReturnType<
  typeof useCloseDeclaredState
>;
