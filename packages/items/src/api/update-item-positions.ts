import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";

import type { UpdateItemPositionEntryInput } from "../types";

const UpdateItemPositionsResponseSchema = ApiEnvelopeSchema(
  z.object({
    updated_ids: z.array(z.string()),
  }),
).extend({ ok: z.literal(true) });

export async function updateItemPositions(
  entries: UpdateItemPositionEntryInput[],
) {
  return apiClient.patch(
    "/api/v1/items/positions",
    UpdateItemPositionsResponseSchema,
    { entries },
  );
}
