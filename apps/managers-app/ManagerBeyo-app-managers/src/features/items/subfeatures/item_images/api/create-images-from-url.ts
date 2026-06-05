import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import type { CreateImageFromUrlBatch } from "../types";

const CreateImagesFromUrlResponseSchema = ApiEnvelopeSchema(
  z.object({
    images: z.array(
      z.object({
        client_id: z.string(),
        image_url: z.string(),
      }),
    ),
  }),
);

export async function createImagesFromUrl(payload: CreateImageFromUrlBatch) {
  const response = await apiClient.post(
    "/api/v1/images/from-url",
    CreateImagesFromUrlResponseSchema,
    payload,
  );

  return response.data.images;
}
