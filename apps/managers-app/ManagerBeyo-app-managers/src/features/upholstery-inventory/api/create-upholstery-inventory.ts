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
    {
      client_id: payload.client_id ?? null,
      upholstery_category_id: payload.upholstery_category_id,
      name: payload.name,
      code: payload.code,
      image_url: payload.image_url,
      current_stored_amount_meters: payload.current_stored_amount_meters,
      low_stock_threshold_meters: payload.low_stock_threshold_meters,
      favorite: payload.favorite,
    },
  );
}
