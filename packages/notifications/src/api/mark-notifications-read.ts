import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  MarkNotificationsReadInputSchema,
  type MarkNotificationsReadInput,
} from "../types";

const MarkNotificationsReadEnvelopeSchema = ApiEnvelopeSchema(
  z.unknown(),
).extend({ ok: z.literal(true) });

export async function markNotificationsRead(
  input: MarkNotificationsReadInput,
): Promise<void> {
  const body = MarkNotificationsReadInputSchema.parse(input);

  await apiClient.post(
    "/api/v1/notifications/mark-read",
    MarkNotificationsReadEnvelopeSchema,
    body,
  );
}
