import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { TaskStepId } from "@beyo/lib";
import { TaskStepSchema, type TaskStep } from "../types";

const ResponseDataSchema = z.object({
  step: TaskStepSchema,
});

/**
 * One step in the worker step-card shape, byte-for-byte a section-list item
 * (HANDOFF_TO_FRONTEND_single_task_step_fetch_answer_20260922). 404 for a
 * missing, deleted or foreign-workspace step.
 */
export async function fetchTaskStep(stepId: TaskStepId): Promise<TaskStep> {
  const envelope = await apiClient.get(
    `/api/v1/working-sections/steps/${stepId}`,
    ApiEnvelopeSchema(ResponseDataSchema),
  );
  return envelope.data.step;
}
