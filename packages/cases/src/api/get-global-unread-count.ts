import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const GetGlobalUnreadCountResponseSchema = ApiEnvelopeSchema(
  z.object({ unread_count: z.number().int().nonnegative() }),
).extend({ ok: z.literal(true) });

export async function getGlobalUnreadCount(): Promise<number> {
  const parsed = await apiClient.get(
    "/api/v1/cases/unread-count",
    GetGlobalUnreadCountResponseSchema,
  );

  return parsed.data.unread_count;
}
