import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const FailCoordinationResponseSchema = ApiEnvelopeSchema(
  z.object({
    failed_ids: z.array(z.string()),
  }),
).extend({ ok: z.literal(true) });

export type FailCoordinationInput = {
  taskId: string;
  coordinationIds?: string[];
};

export async function postFailCoordination(input: FailCoordinationInput) {
  const parsed = await apiClient.post(
    `/api/v1/tasks/${input.taskId}/customer-coordination/fail`,
    FailCoordinationResponseSchema,
    {
      coordination_ids: input.coordinationIds,
    },
  );

  return parsed.data;
}
