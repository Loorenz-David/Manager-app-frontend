import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const CreateItemIssueInputSchema = z.object({
  itemId: z.string(),
  issue_type_id: z.string(),
  issue_severity_id: z.string().optional(),
  base_time_seconds: z.number().int().optional(),
  time_multiplier: z.number().optional(),
  issue_name_snapshot: z.string().optional(),
  severity_name_snapshot: z.string().optional(),
});
export type CreateItemIssueInput = z.infer<typeof CreateItemIssueInputSchema>;

const CreateItemIssueResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() }),
).extend({ ok: z.literal(true) });

export async function createItemIssue(input: CreateItemIssueInput) {
  const { itemId, ...body } = CreateItemIssueInputSchema.parse(input);

  return apiClient.post(
    `/api/v1/items/${itemId}/issues`,
    CreateItemIssueResponseSchema,
    body,
  );
}
