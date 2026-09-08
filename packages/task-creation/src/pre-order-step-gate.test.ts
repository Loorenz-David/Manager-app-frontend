import { act, renderHook } from "@testing-library/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { PRE_ORDER_STEP_FIELDS_MAP } from "./components/PreOrderFormContent";
import { buildPreOrderFormDefaultValues } from "./lib/pre-order-form-default-values";
import { PreOrderFormSchema, type PreOrderFormValues } from "./types";

/**
 * The schema's `superRefine` only runs once the base object parses, so an
 * empty customer used to mask the cross-field rules. The Shopify customer
 * prefill fills `display_name` + `customer_type` from a SKU lookup, which
 * unmasks them mid-form — every step gate has to keep holding only the fields
 * its own step can actually show.
 */
function buildValues(
  overrides: Partial<PreOrderFormValues> = {},
): PreOrderFormValues {
  const defaults = buildPreOrderFormDefaultValues(true);

  return {
    ...defaults,
    ...overrides,
    item: {
      ...defaults.item,
      sku: "Ch3-270426",
      item_category_id: "cat_1",
      major_category: "wood",
      ...overrides.item,
    },
    customer: { ...defaults.customer, ...overrides.customer },
  };
}

async function triggerStep(
  values: PreOrderFormValues,
  step: keyof typeof PRE_ORDER_STEP_FIELDS_MAP,
): Promise<boolean> {
  const { result } = renderHook(() =>
    useForm<PreOrderFormValues>({
      resolver: zodResolver(PreOrderFormSchema),
      defaultValues: values,
    }),
  );

  let isValid = false;
  await act(async () => {
    isValid = await result.current.trigger(PRE_ORDER_STEP_FIELDS_MAP[step]);
  });

  return isValid;
}

describe("PRE_ORDER_STEP_FIELDS_MAP", () => {
  const shopifyPrefilledCustomer = {
    display_name: "Shopify Customer",
    customer_type: "private",
  } as PreOrderFormValues["customer"];

  it("advances the task step once a Shopify customer prefill lands", async () => {
    await expect(
      triggerStep(buildValues({ customer: shopifyPrefilledCustomer }), "task"),
    ).resolves.toBe(true);
  });

  it("holds the details step until a Shopify shop is selected", async () => {
    await expect(
      triggerStep(
        buildValues({ customer: shopifyPrefilledCustomer }),
        "details",
      ),
    ).resolves.toBe(false);
  });

  it("releases the details step once shop and inventory are selected", async () => {
    await expect(
      triggerStep(
        buildValues({
          customer: shopifyPrefilledCustomer,
          shopIntegrationIds: ["shpint_1"],
          inventoryQuantities: [
            { shopIntegrationId: "shpint_1", locationId: "loc_1", quantity: 1 },
          ],
        }),
        "details",
      ),
    ).resolves.toBe(true);
  });
});
