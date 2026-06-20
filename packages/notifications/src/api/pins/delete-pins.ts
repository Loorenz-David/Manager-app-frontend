import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  DeletePinTargetSchema,
  type DeletePinTarget,
} from "../../pins/pin-types";

const DeletePinsEnvelopeSchema = ApiEnvelopeSchema(
  z.record(z.string(), z.unknown()),
).extend({ ok: z.literal(true) });

export async function deletePins(targets: DeletePinTarget[]): Promise<void> {
  const body = z.array(DeletePinTargetSchema).parse(targets);

  await apiClient.delete(
    "/api/v1/notifications/pins",
    DeletePinsEnvelopeSchema,
    body,
  );
}
