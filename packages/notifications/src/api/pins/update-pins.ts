import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  UpdatePinInputSchema,
  type UpdatePinInput,
} from "../../pins/pin-types";

const UpdatePinsEnvelopeSchema = ApiEnvelopeSchema(
  z.record(z.string(), z.unknown()),
).extend({ ok: z.literal(true) });

export async function updatePins(inputs: UpdatePinInput[]): Promise<void> {
  const body = z.array(UpdatePinInputSchema).parse(inputs);

  await apiClient.patch(
    "/api/v1/notifications/pins",
    UpdatePinsEnvelopeSchema,
    body,
  );
}
