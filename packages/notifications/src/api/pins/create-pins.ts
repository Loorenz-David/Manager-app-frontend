import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  CreatePinInputSchema,
  NotificationPinIdSchema,
  type CreatePinInput,
  type NotificationPinId,
} from "../../pins/pin-types";

const CreatePinsResponseSchema = z.object({
  pins: z.array(z.object({ client_id: NotificationPinIdSchema })),
});

const CreatePinsEnvelopeSchema = ApiEnvelopeSchema(
  CreatePinsResponseSchema,
).extend({ ok: z.literal(true) });

export async function createPins(
  inputs: CreatePinInput[],
): Promise<NotificationPinId[]> {
  const body = z.array(CreatePinInputSchema).parse(inputs);

  const response = await apiClient.post(
    "/api/v1/notifications/pins",
    CreatePinsEnvelopeSchema,
    body,
  );

  return response.data.pins.map((pin) => pin.client_id);
}
