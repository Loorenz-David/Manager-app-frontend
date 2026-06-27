import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  TaskStepCountsByStateSchema,
  type TaskStepCountsByState,
} from "../types";

const FetchTaskStepCountsResponseSchema = ApiEnvelopeSchema(
  z.object({
    counts_by_state: TaskStepCountsByStateSchema,
  }),
).extend({ ok: z.literal(true) });

export async function fetchTaskStepCounts(
  taskId: string,
): Promise<TaskStepCountsByState> {
  const envelope = await apiClient.get(
    `/api/v1/tasks/${taskId}/steps/counts`,
    FetchTaskStepCountsResponseSchema,
  );

  return envelope.data.counts_by_state;
}
