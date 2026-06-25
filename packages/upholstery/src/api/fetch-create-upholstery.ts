import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { type CreateUpholsteryInput, UpholsteryDbRecordSchema } from "../types";

const CreateUpholsteryResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery: UpholsteryDbRecordSchema,
  }),
);

export async function fetchCreateUpholstery(input: CreateUpholsteryInput) {
  const response = await apiClient.put(
    "/api/v1/upholsteries",
    CreateUpholsteryResponseSchema,
    input,
  );

  return response.data.upholstery;
}
