import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const TaskCountsResponseSchema = ApiEnvelopeSchema(
  z.object({
    total: z.number().int(),
    granularity: z.record(z.string(), z.record(z.string(), z.number().int())),
  }),
).extend({ ok: z.literal(true) });

export type TaskCountsParams = {
  task_types?: string;
  task_states?: string;
};

export type TaskCountsResult = z.infer<typeof TaskCountsResponseSchema>["data"];

export async function getTaskCounts(
  params: TaskCountsParams,
): Promise<TaskCountsResult> {
  const queryParams: Record<string, string> = {};

  if (params.task_types) queryParams.task_types = params.task_types;
  if (params.task_states) queryParams.task_states = params.task_states;

  const parsed = await apiClient.get(
    "/api/v1/tasks/counts",
    TaskCountsResponseSchema,
    queryParams,
  );

  return parsed.data;
}
