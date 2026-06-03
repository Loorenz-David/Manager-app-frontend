import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import type { TaskStepId } from "@beyo/lib";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  LastStateRecordSchema,
  StepStateSchema,
  type TransitionStepStateInput,
  type TransitionStepStateOutput,
} from "../types";

const PendingCompletionDataSchema = z
  .object({
    pending_completion_id: z.string(),
    expires_at: z.string(),
  })
  .transform((data) => ({ kind: "pending_completion" as const, ...data }));

const ImmediateTransitionDataSchema = z
  .object({
    step_id: z.string().transform((value) => value as TaskStepId),
    new_state: StepStateSchema,
    last_state_record: LastStateRecordSchema,
  })
  .transform((data) => ({ kind: "immediate" as const, ...data }));

const TransitionResponseDataSchema = z.union([
  PendingCompletionDataSchema,
  ImmediateTransitionDataSchema,
]);

export async function transitionStepState(
  input: TransitionStepStateInput,
): Promise<TransitionStepStateOutput> {
  const { task_id, step_id, ...body } = input;
  const envelope = await apiClient.post(
    `/api/v1/tasks/${task_id}/steps/${step_id}/transition`,
    ApiEnvelopeSchema(TransitionResponseDataSchema),
    body,
  );

  return envelope.data;
}
