import { z } from "zod";
import { apiClient, type ApiCallOptions } from "@beyo/api-client";
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
  options?: ApiCallOptions,
): Promise<void> {
  const body = MarkNotificationsReadInputSchema.parse(input);

  await apiClient.post(
    "/api/v1/notifications/mark-read",
    MarkNotificationsReadEnvelopeSchema,
    body,
    options,
  );
}
