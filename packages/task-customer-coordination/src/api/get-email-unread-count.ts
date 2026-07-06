import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const GetEmailUnreadCountResponseSchema = ApiEnvelopeSchema(
  z.object({
    unread_count: z.number().int(),
  }),
).extend({ ok: z.literal(true) });

export async function getEmailUnreadCount(): Promise<number> {
  const parsed = await apiClient.get(
    "/api/v1/email-threads/unread-count",
    GetEmailUnreadCountResponseSchema,
    { entity_type: "task_customer_coordination" },
  );

  return parsed.data.unread_count;
}
