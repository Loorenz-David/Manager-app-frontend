import type { ReturnFormValues } from "../types";

/**
 * `hasSkuTemplate` mirrors the SKU-template preview lookup for return tasks.
 * Only `after_purchase` returns treat a blank identity as the normal,
 * auto-assign path (see ReturnFormSchema.has_sku_template) — the field starts
 * blank regardless, since before-purchase and store returns still require it.
 */
export function buildReturnFormDefaultValues(
  hasSkuTemplate = false,
): ReturnFormValues {
  return {
    has_sku_template: hasSkuTemplate,
    assortment: undefined,
    item: {
      designer: "",
      article_number: "",
      sku: "",
      quantity: 1,
      item_position: "",
      item_zone: "",
      item_currency: undefined,
      item_category_id: undefined,
      major_category: undefined,
    },
    item_upholstery: {
      upholstery_client_id: null,
      upholstery_amount_meters: null,
    },
    item_issues: [],
    customer: {
      display_name: "",
      customer_type: undefined,
      primary_email: "",
      primary_phone_number: "",
      address: {
        street: "",
        city: "",
        postal_code: "",
        coordinates: {
          latitude: null,
          longitude: null,
        },
      },
    },
    return_source: undefined,
    fulfillment_method: undefined,
    scheduled_start_at: null,
    scheduled_end_at: null,
    working_section_assignments: [],
    ready_by_at: null,
    note_content: null,
  };
}
