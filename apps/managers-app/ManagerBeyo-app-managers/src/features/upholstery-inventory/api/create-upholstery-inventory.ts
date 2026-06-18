import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import type { CreateInventoryPayload } from "../types";

const CreateInventoryResponseSchema = ApiEnvelopeSchema(
  z.object({}).passthrough(),
).extend({ ok: z.literal(true) });

export async function createUpholsteryInventory(
  payload: CreateInventoryPayload,
): Promise<void> {
  await apiClient.put(
    "/api/v1/upholsteries",
    CreateInventoryResponseSchema,
    payload,
  );
}
