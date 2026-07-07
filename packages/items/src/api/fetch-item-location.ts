import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ItemLocationResultSchema,
  type LookupItemLocationParams,
} from "../types";

const LookupItemLocationResponseSchema = ApiEnvelopeSchema(
  z.array(ItemLocationResultSchema),
);

export async function fetchItemLocation(
  params: LookupItemLocationParams,
): Promise<{ items: z.infer<typeof ItemLocationResultSchema>[] }> {
  const envelope = await apiClient.get(
    "/api/v1/location-tracker/items/location",
    LookupItemLocationResponseSchema,
    params,
  );

  return {
    items: envelope.data,
  };
}
