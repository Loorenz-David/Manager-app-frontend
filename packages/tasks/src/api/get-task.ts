import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { TaskDetailRawSchema } from "../types";

const GetTaskResponseSchema = ApiEnvelopeSchema(TaskDetailRawSchema).extend({
  ok: z.literal(true),
});

export type GetTaskResult = z.infer<typeof GetTaskResponseSchema>["data"];

// Deleted tasks are read too: the managers list can show them (Show deleted
// filter), and their detail page is where they get restored. `is_deleted` on
// the payload tells the page to render read-only.
export async function getTask(taskId: string): Promise<GetTaskResult> {
  const parsed = await apiClient.get(
    `/api/v1/tasks/${taskId}`,
    GetTaskResponseSchema,
    { include_deleted: true },
  );
  return parsed.data;
}
