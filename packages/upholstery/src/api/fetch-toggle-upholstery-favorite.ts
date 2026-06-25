import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { UpholsteryDbRecordSchema } from "../types";

const ToggleFavoriteResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery: UpholsteryDbRecordSchema,
  }),
);

export type ToggleFavoriteInput = {
  client_id: string;
  favorite: boolean;
};

export async function fetchToggleUpholsteryFavorite(
  input: ToggleFavoriteInput,
) {
  const response = await apiClient.patch(
    `/api/v1/upholsteries/${input.client_id}/favorite`,
    ToggleFavoriteResponseSchema,
    { favorite: input.favorite },
  );

  return response.data.upholstery;
}
