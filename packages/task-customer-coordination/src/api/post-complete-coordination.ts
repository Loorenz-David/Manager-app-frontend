import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const CompleteCoordinationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
  }),
).extend({ ok: z.literal(true) });

export type CompleteCoordinationInput = {
  taskId: string;
  coordinationId: string | null;
};

export async function postCompleteCoordination(input: CompleteCoordinationInput) {
  const parsed = await apiClient.post(
    `/api/v1/tasks/${input.taskId}/customer-coordination/complete`,
    CompleteCoordinationResponseSchema,
    {
      coordination_id: input.coordinationId,
    },
  );

  return parsed.data;
}
