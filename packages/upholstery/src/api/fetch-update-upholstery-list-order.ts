import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { UpholsteryPickerOptionSchema } from "../types";

const UpdateListOrderResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery: UpholsteryPickerOptionSchema,
  }),
);

export type UpdateListOrderInput = {
  client_id: string;
  list_order: number | null;
};

export async function fetchUpdateUpholsteryListOrder(
  input: UpdateListOrderInput,
) {
  const response = await apiClient.patch(
    `/api/v1/upholsteries/${input.client_id}/list-order`,
    UpdateListOrderResponseSchema,
    { list_order: input.list_order },
  );

  return response.data.upholstery;
}
