import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DeclareStateResultSchema,
  type DeclareStateInput,
  type DeclareStateResult,
} from "../types";
import { workerShiftKeys } from "../api/worker-shift-keys";

const DeclareStateResponseSchema = ApiEnvelopeSchema(
  DeclareStateResultSchema,
);

async function declareState(
  input: DeclareStateInput,
): Promise<DeclareStateResult> {
  const response = await apiClient.post(
    "/api/v1/worker-shifts/declared-states",
    DeclareStateResponseSchema,
    input,
  );
  return response.data;
}

export function useDeclareState() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: declareState,
    onSettled: (_data, _error, input) =>
      queryClient.invalidateQueries({
        queryKey: workerShiftKeys.current({ user_id: input.user_id }),
      }),
  });

  return {
    declareState: mutation.mutate,
    declareStateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export type DeclareStateAction = ReturnType<typeof useDeclareState>;
