import { describe, expect, it } from "vitest";

import {
  InternalFormSchema,
  PreOrderFormSchema,
  type InternalFormValues,
  type PreOrderFormValues,
} from "../types";
import {
  buildShopifyPreorderSection,
  normalizeInternalFormPayload,
  normalizeReturnFormPayload,
} from "./normalize-task-form-payload";
import { buildPreOrderFormDefaultValues } from "./pre-order-form-default-values";

const ids = {
  taskClientId: "tsk_1",
  itemClientId: "itm_1",
  customerClientId: "cus_1",
  noteClientId: "note_1",
  currentUserClientId: "usr_1",
};

function buildInternalValues(
  pricing: InternalFormValues["item_pricing"],
  quantity = 2,
  articleNumber = "ARTICLE-1",
): InternalFormValues {
  return {
    item: {
      designer: "",
      article_number: articleNumber,
      sku: "",
      quantity,
      item_position: "",
      item_zone: "",
      item_category_id: "cat_1",
      major_category: "wood",
    },
    item_pricing: pricing,
    item_upholstery: {
      upholstery_client_id: null,
      upholstery_amount_meters: null,
    },
    item_issues: [],
    working_section_assignments: [],
    ready_by_at: null,
    note_content: null,
  };
}

type PreOrderOverrides = Omit<
  Partial<PreOrderFormValues>,
  "item" | "item_pricing" | "customer"
> & {
  item?: Partial<PreOrderFormValues["item"]>;
  item_pricing?: Partial<PreOrderFormValues["item_pricing"]>;
  customer?: Partial<PreOrderFormValues["customer"]>;
};

function buildPreOrderValues(
  overrides: PreOrderOverrides = {},
): PreOrderFormValues {
  const defaults = buildPreOrderFormDefaultValues(true);

  return {
    ...defaults,
    ...overrides,
    item: {
      ...defaults.item,
      item_category_id: "cat_1",
      major_category: "wood",
      ...overrides.item,
    },
    item_pricing: {
      ...defaults.item_pricing,
      ...overrides.item_pricing,
    },
    customer: {
      ...defaults.customer,
      display_name: "Ada",
      customer_type: "private",
      primary_email: "ada@example.com",
      primary_phone_number: "+46700000000",
      ...overrides.customer,
    },
    shopIntegrationIds: overrides.shopIntegrationIds ?? ["shop-1"],
    inventoryQuantities: overrides.inventoryQuantities ?? [
      { shopIntegrationId: "shop-1", locationId: "loc-1", quantity: 3 },
    ],
  };
}

describe("inline item pricing schemas", () => {
  it("keeps both Internal prices optional", () => {
    expect(
      InternalFormSchema.safeParse(
        buildInternalValues({
          purchase_cost_per_piece: null,
          expected_sale_price_per_piece: null,
        }),
      ).success,
    ).toBe(true);
  });

  it("keeps both Pre-order prices optional", () => {
    expect(PreOrderFormSchema.safeParse(buildPreOrderValues()).success).toBe(
      true,
    );
  });

  it.each([
    [
      "category type",
      { major_category: undefined, item_category_id: undefined },
      ["item", "major_category"],
      "Select a category type.",
    ],
    [
      "category",
      { major_category: "wood" as const, item_category_id: undefined },
      ["item", "item_category_id"],
      "Select a category.",
    ],
  ])("requires a Pre-order %s", (_case, item, expectedPath, message) => {
    const result = PreOrderFormSchema.safeParse(
      buildPreOrderValues({ item }),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: expectedPath, message }),
      ]),
    );
  });

  it("cannot normalize a hidden looked-up purchase cost without a category", () => {
    const values = buildPreOrderValues({
      item: {
        major_category: undefined,
        item_category_id: undefined,
        quantity: 4,
      },
      item_pricing: {
        purchase_cost_per_piece: 1250.5,
        expected_sale_price_per_piece: null,
      },
    });
    const parsed = PreOrderFormSchema.safeParse(values);
    const payload = parsed.success
      ? normalizeReturnFormPayload(
          parsed.data,
          ids,
          "pre_order",
          { forceItemInclusion: true },
        )
      : null;

    expect(parsed.success).toBe(false);
    expect(payload).toBeNull();
    expect(
      Boolean(
        payload &&
          "purchase_cost_minor" in (payload.item as Record<string, unknown>),
      ),
    ).toBe(false);
  });

  it("still rejects a negative price on the pricing field path", () => {
    const result = InternalFormSchema.safeParse(
      buildInternalValues({
        purchase_cost_per_piece: -1,
        expected_sale_price_per_piece: null,
      }),
    );

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) =>
          issue.path.join(".") === "item_pricing.purchase_cost_per_piece",
      ),
    ).toBe(true);
  });
});

describe("inline item pricing payload", () => {
  it("keeps wood prices per piece and multiplies the looked-up quantity", () => {
    const payload = normalizeInternalFormPayload(
      buildInternalValues({
        purchase_cost_per_piece: 19.995,
        expected_sale_price_per_piece: 12.345,
      }),
      ids,
    );

    expect(payload.item).toMatchObject({
      purchase_cost_minor: 4000,
      expected_sale_price_minor: 2470,
      currency: "swedish_krona",
    });
    const purchaseCostMinor = (payload.item as Record<string, unknown>)
      .purchase_cost_minor;
    expect(
      typeof purchaseCostMinor === "number" &&
        Number.isInteger(purchaseCostMinor),
    ).toBe(true);
  });

  it("omits both amounts and currency when neither was entered", () => {
    const payload = normalizeInternalFormPayload(
      buildInternalValues({
        purchase_cost_per_piece: null,
        expected_sale_price_per_piece: null,
      }),
      ids,
    );
    const item = payload.item as Record<string, unknown>;

    expect(item).not.toHaveProperty("purchase_cost_minor");
    expect(item).not.toHaveProperty("expected_sale_price_minor");
    expect(item).not.toHaveProperty("currency");
  });

  it("keeps an explicit zero and includes an item carried only by pricing", () => {
    const payload = normalizeInternalFormPayload(
      buildInternalValues(
        {
          purchase_cost_per_piece: 0,
          expected_sale_price_per_piece: null,
        },
        1,
        "",
      ),
      ids,
    );

    expect(payload.item).toMatchObject({
      purchase_cost_minor: 0,
      currency: "swedish_krona",
    });
    expect(payload.item).not.toHaveProperty("expected_sale_price_minor");
  });
});

describe("Shopify pre-order pricing", () => {
  it("derives product.price from the same expected-sale minor total", () => {
    const values = buildPreOrderValues({
      item: { quantity: 3 },
      item_pricing: {
        purchase_cost_per_piece: null,
        expected_sale_price_per_piece: 19.99,
      },
    });
    const payload = normalizeReturnFormPayload(
      values,
      ids,
      "pre_order",
      { forceItemInclusion: true },
    );
    const section = buildShopifyPreorderSection(values);

    expect(payload.item).toMatchObject({ expected_sale_price_minor: 5997 });
    expect(section?.product).toMatchObject({ price: "59.97" });
  });

  it("still builds the section without a price and omits product.price", () => {
    const section = buildShopifyPreorderSection(buildPreOrderValues());

    expect(section).toBeDefined();
    expect(section?.product).not.toHaveProperty("price");
  });

  it("keeps the shop and inventory guards", () => {
    expect(
      buildShopifyPreorderSection(
        buildPreOrderValues({ shopIntegrationIds: [] }),
      ),
    ).toBeUndefined();
    expect(
      buildShopifyPreorderSection(
        buildPreOrderValues({ inventoryQuantities: [] }),
      ),
    ).toBeUndefined();
  });
});
