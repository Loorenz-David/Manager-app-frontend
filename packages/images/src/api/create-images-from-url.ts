import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  CreateImageFromUrlBatchSchema,
  type CreateImageFromUrlBatch,
} from "../types";

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

export async function createImagesFromUrl(
  payload: CreateImageFromUrlBatch,
): Promise<Array<{ client_id: string; image_url: string }>> {
  const parsedPayload = CreateImageFromUrlBatchSchema.parse(payload);
  const envelope = await apiClient.post(
    "/api/v1/images/from-url",
    CreateImagesFromUrlResponseSchema,
    parsedPayload,
  );

  return envelope.data.images;
}
