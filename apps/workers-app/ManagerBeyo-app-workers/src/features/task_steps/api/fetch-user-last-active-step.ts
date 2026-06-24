import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { TaskStepSchema, type UserLastActivePayload } from "../types";

const ResponseDataSchema = z.object({
  user_last_active_step_record: TaskStepSchema.nullable(),
  active_batch_steps: z.array(TaskStepSchema).nullable(),
});

export async function fetchUserLastActiveStep(): Promise<UserLastActivePayload> {
  const envelope = await apiClient.get(
    "/api/v1/working-sections/steps/user-last-active",
    ApiEnvelopeSchema(ResponseDataSchema),
  );

  return {
    step: envelope.data.user_last_active_step_record,
    batchSteps: envelope.data.active_batch_steps ?? null,
  };
}
