import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  ListNotificationsParamsSchema,
  NotificationListResponseSchema,
  type ListNotificationsParams,
  type NotificationListResponse,
} from "../types";

const ListNotificationsEnvelopeSchema = ApiEnvelopeSchema(
  NotificationListResponseSchema,
).extend({ ok: z.literal(true) });

export async function fetchNotifications(
  params: ListNotificationsParams = {},
): Promise<NotificationListResponse> {
  const parsedParams = ListNotificationsParamsSchema.parse(params);
  const response = await apiClient.get(
    "/api/v1/notifications",
    ListNotificationsEnvelopeSchema,
    parsedParams,
  );

  return response.data;
}
