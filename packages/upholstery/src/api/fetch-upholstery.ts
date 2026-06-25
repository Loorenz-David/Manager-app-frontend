import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { UpholsteryDbRecordSchema } from "../types";

const FetchUpholsteryResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery: UpholsteryDbRecordSchema,
  }),
);

export async function fetchUpholstery(clientId: string) {
  const envelope = await apiClient.get(
    `/api/v1/upholsteries/${clientId}`,
    FetchUpholsteryResponseSchema,
  );

  return envelope.data.upholstery;
}
