import type { ShopifyCustomerLookupParams } from "../types";

export const shopifyCustomerLookupKeys = {
  all: ["shopify-customer-lookup"] as const,
  lookup: (params: ShopifyCustomerLookupParams) =>
    [...shopifyCustomerLookupKeys.all, params] as const,
};
