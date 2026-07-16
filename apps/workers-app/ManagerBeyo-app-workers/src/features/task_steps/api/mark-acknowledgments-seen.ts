import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { TaskStepId } from "@beyo/lib";

const ResponseDataSchema = z.object({
  seen_step_ids: z.array(z.string()),
});

export async function markAcknowledgmentsSeen(input: {
  step_ids: TaskStepId[];
}): Promise<{ seen_step_ids: string[] }> {
  const envelope = await apiClient.post(
    "/api/v1/task-step-acknowledgments/seen",
    ApiEnvelopeSchema(ResponseDataSchema),
    { step_ids: input.step_ids },
  );

  return envelope.data;
}
