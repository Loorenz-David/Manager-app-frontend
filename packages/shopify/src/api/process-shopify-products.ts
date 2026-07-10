import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { ProcessShopifyProductsRequestSchema, ProcessShopifyProductsResponseSchema } from "../types";
import type { ProcessShopifyProductsRequest } from "../types";
const Envelope = ApiEnvelopeSchema(ProcessShopifyProductsResponseSchema).extend({ ok: z.literal(true) });
export type ProcessShopifyProductsResult = z.infer<typeof Envelope>["data"];
export async function processShopifyProducts(input: ProcessShopifyProductsRequest): Promise<ProcessShopifyProductsResult> {
  const parsed = await apiClient.post("/api/v1/integrations/shopify/products/process", Envelope, ProcessShopifyProductsRequestSchema.parse(input));
  return parsed.data;
}
