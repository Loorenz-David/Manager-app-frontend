import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { StepStateSchema } from "../types";

const TransitionTaskStepInputSchema = z.object({
  task_id: z.string(),
  step_id: z.string(),
  new_state: StepStateSchema,
  credited_user_id: z.string().optional(),
  reason: z.string().optional(),
  description: z.string().optional(),
  mark_closing_record_inaccurate: z.boolean().optional(),
});

export type TransitionTaskStepInput = z.infer<
  typeof TransitionTaskStepInputSchema
>;

const TransitionTaskStepResponseSchema = ApiEnvelopeSchema(z.unknown());

export async function transitionTaskStep(input: TransitionTaskStepInput) {
  const { task_id, step_id, ...body } =
    TransitionTaskStepInputSchema.parse(input);

  return apiClient.post(
    `/api/v1/tasks/${task_id}/steps/${step_id}/transition`,
    TransitionTaskStepResponseSchema,
    body,
  );
}
