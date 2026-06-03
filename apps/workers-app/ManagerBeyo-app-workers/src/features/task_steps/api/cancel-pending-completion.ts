import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { TaskId, TaskStepId } from "@beyo/lib";
import { z } from "zod";
import type { CancelPendingCompletionOutput } from "../types";

const CancelPendingCompletionResponseSchema = z.object({
  cancelled: z.literal(true),
});

export async function cancelPendingCompletion(input: {
  task_id: TaskId;
  step_id: TaskStepId;
}): Promise<CancelPendingCompletionOutput> {
  const envelope = await apiClient.delete(
    `/api/v1/tasks/${input.task_id}/steps/${input.step_id}/pending-completion`,
    ApiEnvelopeSchema(CancelPendingCompletionResponseSchema),
  );

  return envelope.data;
}
