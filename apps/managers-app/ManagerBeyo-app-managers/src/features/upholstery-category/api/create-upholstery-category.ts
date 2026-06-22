import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import {
  UpholsteryCategorySchema,
  type CreateUpholsteryCategoryPayload,
  type UpholsteryCategory,
} from "../types";

const CreateUpholsteryCategoryResponseSchema = ApiEnvelopeSchema(
  z.object({ upholstery_category: UpholsteryCategorySchema }),
).extend({ ok: z.literal(true) });

export async function createUpholsteryCategory(
  payload: CreateUpholsteryCategoryPayload,
): Promise<UpholsteryCategory> {
  const parsed = await apiClient.put(
    "/api/v1/upholstery-categories",
    CreateUpholsteryCategoryResponseSchema,
    payload,
  );

  return parsed.data.upholstery_category;
}
