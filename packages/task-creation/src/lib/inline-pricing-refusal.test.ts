import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import {
  isInlinePricingRefusal,
  useInlinePricingRefusal,
} from "./inline-pricing-refusal";

describe("isInlinePricingRefusal", () => {
  it("recognizes the priced-item refusal by its message identity", () => {
    expect(
      isInlinePricingRefusal(
        new Error(
          "ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM: item itm_1 already has a current valuation",
        ),
      ),
    ).toBe(true);
  });

  it("leaves unrelated create failures on the generic path", () => {
    expect(isInlinePricingRefusal(new Error("network_error"))).toBe(false);
    expect(isInlinePricingRefusal(null)).toBe(false);
  });
});

describe("useInlinePricingRefusal", () => {
  it("shows the inline state for the refusal and clears it when either price changes", () => {
    const { result } = renderHook(() => {
      const form = useForm<{
        item_pricing: {
          purchase_cost_per_piece: number | null;
          expected_sale_price_per_piece: number | null;
        };
      }>({
        defaultValues: {
          item_pricing: {
            purchase_cost_per_piece: 1200,
            expected_sale_price_per_piece: 4000,
          },
        },
      });

      return { form, ...useInlinePricingRefusal(form.watch) };
    });

    act(() => {
      expect(
        result.current.handleInlinePricingError(
          new Error("ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM: refused"),
        ),
      ).toBe(true);
    });
    expect(result.current.showPricedItemRefusal).toBe(true);

    act(() => {
      result.current.form.setValue(
        "item_pricing.purchase_cost_per_piece",
        null,
      );
    });
    expect(result.current.showPricedItemRefusal).toBe(false);
  });
});
