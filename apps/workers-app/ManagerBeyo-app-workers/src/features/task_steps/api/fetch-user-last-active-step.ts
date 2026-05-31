import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { TaskStepSchema, type TaskStep } from "../types";

const ResponseDataSchema = z.object({
  user_last_active_step_record: TaskStepSchema.nullable(),
});

export async function fetchUserLastActiveStep(): Promise<TaskStep | null> {
  const envelope = await apiClient.get(
    "/api/v1/working-sections/steps/user-last-active",
    ApiEnvelopeSchema(ResponseDataSchema),
  );

  return envelope.data.user_last_active_step_record;
}
