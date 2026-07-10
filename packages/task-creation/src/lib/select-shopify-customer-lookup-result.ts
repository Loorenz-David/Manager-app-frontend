import type {
  ShopifyCustomerLookupParams,
  ShopifyCustomerLookupResult,
} from "../types";

function normalizeMatchValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function scoreResult(
  result: ShopifyCustomerLookupResult,
  params: ShopifyCustomerLookupParams,
): number {
  const normalizedSku = normalizeMatchValue(params.sku);
  const normalizedArticleNumber = normalizeMatchValue(params.article_number);
  const normalizedMatchedValue = normalizeMatchValue(result.matched_value);

  if (
    result.match_type === "sku" &&
    normalizedSku &&
    normalizedMatchedValue === normalizedSku
  ) {
    return 4;
  }

  if (
    result.match_type === "barcode" &&
    normalizedArticleNumber &&
    normalizedMatchedValue === normalizedArticleNumber
  ) {
    return 3;
  }

  if (result.match_type === "sku" && normalizedSku) {
    return 2;
  }

  if (result.match_type === "barcode" && normalizedArticleNumber) {
    return 1;
  }

  return 0;
}

export function selectBestShopifyCustomerLookupResult(
  results: ShopifyCustomerLookupResult[],
  params: ShopifyCustomerLookupParams,
): ShopifyCustomerLookupResult | null {
  let selectedResult: ShopifyCustomerLookupResult | null = null;
  let selectedScore = -1;

  for (const result of results) {
    const score = scoreResult(result, params);

    if (score > selectedScore) {
      selectedResult = result;
      selectedScore = score;
    }
  }

  return selectedResult;
}
