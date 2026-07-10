import { formatShortDate } from "@beyo/lib";

export function formatShopifyDetailDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return formatShortDate(value) ?? value;
}

export function formatShopifyDetailValue(
  value: string | null | undefined,
): string {
  if (!value) {
    return "—";
  }

  return value;
}
