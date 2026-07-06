import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const PostThreadReadResponseSchema = ApiEnvelopeSchema(
  z.object({
    marked_read: z.boolean(),
  }),
).extend({ ok: z.literal(true) });

export async function postThreadRead(threadId: string): Promise<void> {
  await apiClient.post(
    `/api/v1/email-threads/${threadId}/read`,
    PostThreadReadResponseSchema,
    {},
  );
}
