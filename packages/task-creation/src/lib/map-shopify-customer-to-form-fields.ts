import type { ShopifyCustomerLookupResult } from "../types";

export type ShopifyCustomerPrefillFields = {
  "customer.display_name"?: string;
  "customer.customer_type"?: "private";
  "customer.primary_email"?: string;
  "customer.primary_phone_number"?: string;
  "customer.address.street"?: string;
  "customer.address.city"?: string;
  "customer.address.postal_code"?: string;
  "customer.address.coordinates.latitude"?: number;
  "customer.address.coordinates.longitude"?: number;
};

function normalizeFormValue(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

export function mapShopifyCustomerLookupResultToFormFields(
  result: ShopifyCustomerLookupResult | null,
): ShopifyCustomerPrefillFields {
  if (!result) {
    return {};
  }

  return {
    "customer.display_name": normalizeFormValue(result.display_name),
    "customer.customer_type": "private",
    "customer.primary_email": normalizeFormValue(result.primary_email),
    "customer.primary_phone_number": normalizeFormValue(
      result.primary_phone_number,
    ),
    "customer.address.street": normalizeFormValue(
      result.address?.street_address,
    ),
    "customer.address.city": normalizeFormValue(result.address?.city),
    "customer.address.postal_code": normalizeFormValue(
      result.address?.post_code,
    ),
    "customer.address.coordinates.latitude":
      result.address?.coordinates?.latitude ?? undefined,
    "customer.address.coordinates.longitude":
      result.address?.coordinates?.longitude ?? undefined,
  };
}
