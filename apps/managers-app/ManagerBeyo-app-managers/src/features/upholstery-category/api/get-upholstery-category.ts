import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import { UpholsteryCategorySchema, type UpholsteryCategory } from "../types";

const GetUpholsteryCategoryResponseSchema = ApiEnvelopeSchema(
  z.object({ upholstery_category: UpholsteryCategorySchema }),
).extend({ ok: z.literal(true) });

export async function getUpholsteryCategory(
  id: string,
): Promise<UpholsteryCategory> {
  const parsed = await apiClient.get(
    `/api/v1/upholstery-categories/${id}`,
    GetUpholsteryCategoryResponseSchema,
  );

  return parsed.data.upholstery_category;
}
