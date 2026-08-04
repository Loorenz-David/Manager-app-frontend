import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ForceTaskReadyResultSchema,
  type ForceTaskReadyInput,
  type ForceTaskReadyResult,
} from "../types";

const ForceTaskReadyResponseSchema = ApiEnvelopeSchema(
  ForceTaskReadyResultSchema,
).extend({ ok: z.literal(true) });

export async function forceTaskReady({
  task_id,
  ...body
}: ForceTaskReadyInput): Promise<ForceTaskReadyResult> {
  const envelope = await apiClient.post(
    `/api/v1/tasks/${task_id}/force-ready`,
    ForceTaskReadyResponseSchema,
    body,
  );

  return envelope.data;
}
