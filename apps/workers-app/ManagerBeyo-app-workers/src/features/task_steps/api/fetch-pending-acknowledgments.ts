import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { ReassignmentStepSchema, type ReassignmentStep } from "../types";

const ResponseDataSchema = z.object({
  acknowledgments: z.array(ReassignmentStepSchema),
  acknowledgments_pagination: z.object({
    has_more: z.boolean(),
    limit: z.number(),
    offset: z.number(),
  }),
});

export async function fetchPendingAcknowledgments(): Promise<
  ReassignmentStep[]
> {
  const envelope = await apiClient.get(
    "/api/v1/task-step-acknowledgments/pending?limit=50&offset=0",
    ApiEnvelopeSchema(ResponseDataSchema),
  );

  return envelope.data.acknowledgments;
}
