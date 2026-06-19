import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  UnreadCountResponseSchema,
  type UnreadCountResponse,
} from "../types";

const UnreadCountEnvelopeSchema = ApiEnvelopeSchema(
  UnreadCountResponseSchema,
).extend({ ok: z.literal(true) });

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  const response = await apiClient.get(
    "/api/v1/notifications/unread-count",
    UnreadCountEnvelopeSchema,
  );

  return response.data;
}
