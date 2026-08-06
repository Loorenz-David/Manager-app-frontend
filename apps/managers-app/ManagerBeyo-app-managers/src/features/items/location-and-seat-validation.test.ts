import { describe, expect, it } from "vitest";

import { shouldApplyLookupZone } from "@beyo/items";
import {
  InternalFormSchema,
  PreOrderFormSchema,
  ReturnFormSchema,
} from "@beyo/task-creation";

describe("shared item location helpers", () => {
  it("replaces a previously auto-filled zone when the lookup identity changes", () => {
    expect(
      shouldApplyLookupZone({
        currentZone: "A1",
        nextZone: "B2",
        previousAutoAppliedZone: "A1",
        zoneDirty: false,
        signature: "sku:next:B2",
        lastAppliedSignature: "sku:prev:A1",
      }),
    ).toBe(true);
  });

  it("does not replace a user-edited zone with a later lookup result", () => {
    expect(
      shouldApplyLookupZone({
        currentZone: "CUSTOM",
        nextZone: "B2",
        previousAutoAppliedZone: "A1",
        zoneDirty: true,
        signature: "sku:next:B2",
        lastAppliedSignature: "sku:prev:A1",
      }),
    ).toBe(false);
  });
});

const baseItem = {
  designer: "",
  article_number: "1234567",
  sku: "",
  quantity: 1,
  item_position: "",
  item_zone: "",
  item_currency: undefined,
  item_category_id: "cat_1",
  major_category: "seat",
};

describe("task creation seat location validation", () => {
  // Pre-order is intentionally excluded here: a pre-ordered item isn't in the
  // building yet, so it has nowhere to be — see the standalone test below.
  it.each([
    ["internal", InternalFormSchema, { working_section_assignments: [] }],
    [
      "return",
      ReturnFormSchema,
      {
        has_sku_template: false,
        assortment: undefined,
        customer: {
          display_name: "Ada",
          customer_type: "private",
          primary_email: "ada@example.com",
          primary_phone_number: "0701234567",
          address: {
            street: "",
            city: "",
            postal_code: "",
            country: "",
          },
        },
        fulfillment_method: undefined,
        return_source: undefined,
        scheduled_end_at: null,
        scheduled_start_at: null,
        working_section_assignments: [],
      },
    ],
  ])(
    "requires either zone or position for seat items in %s form",
    (_label, schema, extraValues) => {
      const result = schema.safeParse({
        item: baseItem,
        item_upholstery: {
          upholstery_client_id: null,
          upholstery_amount_meters: null,
        },
        item_issues: [],
        note_content: null,
        ready_by_at: null,
        ...extraValues,
      });

      expect(result.success).toBe(false);

      if (result.success) {
        return;
      }

      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["item", "item_position"],
            message: "Enter a zone or position for seat items.",
          }),
          expect.objectContaining({
            path: ["item", "item_zone"],
            message: "Enter a zone or position for seat items.",
          }),
        ]),
      );
    },
  );

  it("does not require a zone or position for a pre-ordered seat item", () => {
    const result = PreOrderFormSchema.safeParse({
      item: baseItem,
      item_upholstery: {
        upholstery_client_id: null,
        upholstery_amount_meters: null,
      },
      item_issues: [],
      note_content: null,
      ready_by_at: null,
      has_sku_template: false,
      product_unit_price: 100,
      shopIntegrationIds: ["shop_1"],
      inventoryQuantities: [
        { shopIntegrationId: "shop_1", locationId: "loc_1", quantity: 1 },
      ],
      customer: {
        display_name: "Ada",
        customer_type: "private",
        primary_email: "ada@example.com",
        primary_phone_number: "0701234567",
        address: { street: "", city: "", postal_code: "", country: "" },
      },
      fulfillment_method: undefined,
      return_source: undefined,
      scheduled_end_at: null,
      scheduled_start_at: null,
      working_section_assignments: [],
    });

    expect(result.success).toBe(true);
  });

  it.each([InternalFormSchema, PreOrderFormSchema, ReturnFormSchema])(
    "accepts a seat item when a zone is present",
    (schema) => {
      const result = schema.safeParse({
        item: {
          ...baseItem,
          item_zone: "A1",
        },
        item_upholstery: {
          upholstery_client_id: null,
          upholstery_amount_meters: null,
        },
        item_issues: [],
        note_content: null,
        ready_by_at: null,
        ...(schema === InternalFormSchema
          ? { working_section_assignments: [] }
          : {
              has_sku_template: false,
              customer: {
                display_name: "Ada",
                customer_type: "private",
                primary_email: "ada@example.com",
                primary_phone_number: "0701234567",
                address: {
                  street: "",
                  city: "",
                  postal_code: "",
                  country: "",
                },
              },
              fulfillment_method: undefined,
              return_source: undefined,
              scheduled_end_at: null,
              scheduled_start_at: null,
              working_section_assignments: [],
              ...(schema === ReturnFormSchema ? { assortment: undefined } : {}),
              ...(schema === PreOrderFormSchema
                ? {
                    product_unit_price: 100,
                    shopIntegrationIds: ["shop_1"],
                    inventoryQuantities: [
                      {
                        shopIntegrationId: "shop_1",
                        locationId: "loc_1",
                        quantity: 1,
                      },
                    ],
                  }
                : {}),
            }),
      });

      expect(result.success).toBe(true);
    },
  );
});
