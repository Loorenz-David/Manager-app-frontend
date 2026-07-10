import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ShopifyCustomerLookupResultSchema,
  ShopifyLookupFailedShopSchema,
  type ShopifyCustomerLookupParams,
  type ShopifyCustomerLookupResult,
  type ShopifyLookupFailedShop,
} from "../types";

const SHOPIFY_CUSTOMER_LOOKUP_ENDPOINT =
  "/api/v1/integrations/shopify/customers/by-product-identity";

const ShopifyCustomerLookupResponseSchema = ApiEnvelopeSchema(
  z.object({
    customer_matches: z.array(ShopifyCustomerLookupResultSchema),
    failed_shops: z.array(ShopifyLookupFailedShopSchema).default([]),
  }),
);

export async function fetchShopifyCustomerLookup(
  params: ShopifyCustomerLookupParams,
): Promise<{
  customer_matches: ShopifyCustomerLookupResult[];
  failed_shops: ShopifyLookupFailedShop[];
}> {
  const articleNumber = params.article_number?.trim();
  const sku = params.sku?.trim();

  const body: ShopifyCustomerLookupParams = {};

  if (articleNumber) {
    body.article_number = articleNumber;
  }

  if (sku) {
    body.sku = sku;
  }

  const envelope = await apiClient.post(
    SHOPIFY_CUSTOMER_LOOKUP_ENDPOINT,
    ShopifyCustomerLookupResponseSchema,
    body,
  );

  return {
    customer_matches: envelope.data.customer_matches,
    failed_shops: envelope.data.failed_shops,
  };
}
