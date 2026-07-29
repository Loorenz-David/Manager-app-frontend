import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClockOutResultSchema,
  type ClockOutInput,
  type ClockOutResult,
} from "../types";
import { workerShiftKeys } from "../api/worker-shift-keys";

const ClockOutResponseSchema = ApiEnvelopeSchema(ClockOutResultSchema);

async function clockOut(input: ClockOutInput): Promise<ClockOutResult> {
  const response = await apiClient.post(
    "/api/v1/worker-shifts/clock-out",
    ClockOutResponseSchema,
    input,
  );
  return response.data;
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: clockOut,
    onSettled: (_data, _error, input) =>
      queryClient.invalidateQueries({
        queryKey: workerShiftKeys.current({ user_id: input.user_id }),
      }),
  });

  return {
    clockOut: mutation.mutate,
    clockOutAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export type ClockOutAction = ReturnType<typeof useClockOut>;
