import { useMutation } from "@tanstack/react-query";
import { processShopifyProducts } from "../api/process-shopify-products";
export function useProcessShopifyProducts() { return useMutation({ mutationFn: processShopifyProducts }); }
export type ProcessShopifyProductsAction = ReturnType<typeof useProcessShopifyProducts>;
