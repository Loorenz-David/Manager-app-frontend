import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema, type TaskId } from "@beyo/lib";

import { ITEM_ECONOMICS_BASE_PATH } from "../types";

/**
 * Save is one call (price-scenario handoff §6): it both prices the item and
 * moves the task's working budget. No currency is ever accepted here — the
 * evaluation's currency is the valuation's (operational handoff §4.1).
 */
export type CommitTaskEvaluationBody = {
  expected_sale_price_minor: number;
};

/**
 * Minimal by plan task 1: the two fields M8 reconciles against, plus the
 * evaluation's identity. `allowed_worker_minutes` is a two-decimal string and is
 * compared as a string — parsing it to a float would reintroduce exactly the
 * exposure the integer contract exists to avoid.
 */
const CommittedEvaluationSchema = z.object({
  client_id: z.string(),
  production_budget_minor: z.number().int(),
  allowed_worker_minutes: z.string(),
});

export type CommittedEvaluation = z.infer<typeof CommittedEvaluationSchema>;

const CommitTaskEvaluationEnvelopeSchema = ApiEnvelopeSchema(
  z.object({ evaluation: CommittedEvaluationSchema }),
);

export async function commitTaskEvaluation(
  taskId: TaskId,
  body: CommitTaskEvaluationBody,
): Promise<CommittedEvaluation> {
  const response = await apiClient.post(
    `${ITEM_ECONOMICS_BASE_PATH}/tasks/${taskId}/evaluations/commit`,
    CommitTaskEvaluationEnvelopeSchema,
    body,
  );

  return response.data.evaluation;
}
