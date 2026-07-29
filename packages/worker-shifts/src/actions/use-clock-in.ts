import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClockInResultSchema,
  type ClockInInput,
  type ClockInResult,
} from "../types";
import { workerShiftKeys } from "../api/worker-shift-keys";

const ClockInResponseSchema = ApiEnvelopeSchema(ClockInResultSchema);

async function clockIn(input: ClockInInput): Promise<ClockInResult> {
  const response = await apiClient.post(
    "/api/v1/worker-shifts/clock-in",
    ClockInResponseSchema,
    input,
  );
  return response.data;
}

export function useClockIn() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: clockIn,
    onSettled: (_data, _error, input) =>
      queryClient.invalidateQueries({
        queryKey: workerShiftKeys.current({ user_id: input.user_id }),
      }),
  });

  return {
    clockIn: mutation.mutate,
    clockInAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export type ClockInAction = ReturnType<typeof useClockIn>;
