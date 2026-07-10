// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PreOrderFormValues } from "../types";
import { useShopifyCustomerLookupQuery } from "../api/use-shopify-customer-lookup-query";
import { useShopifyCustomerLookupPrefill } from "./use-shopify-customer-lookup-prefill";

vi.mock("../api/use-shopify-customer-lookup-query", () => ({
  useShopifyCustomerLookupQuery: vi.fn(),
}));

type QueryState = {
  data?: {
    customer_matches: Array<Record<string, unknown>>;
    failed_shops: Array<Record<string, unknown>>;
  };
  isPending?: boolean;
  isFetching?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
};

function createDefaultValues(): PreOrderFormValues {
  return {
    item: {
      article_number: "",
      sku: "",
      designer: "",
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

function buildQueryState(overrides: QueryState = {}) {
  return {
    data: {
      customer_matches: [],
      failed_shops: [],
    },
    isPending: false,
    isFetching: false,
    isSuccess: false,
    isError: false,
    ...overrides,
  };
}

describe("useShopifyCustomerLookupPrefill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends both eligible fields and injects the selected best match", async () => {
    vi.mocked(useShopifyCustomerLookupQuery).mockReturnValue(
      buildQueryState({
        data: {
          customer_matches: [
            {
              match_type: "barcode",
              matched_value: "BAR-1234567",
              display_name: "Barcode Customer",
              primary_email: "barcode@example.com",
            },
            {
              match_type: "sku",
              matched_value: "SKU-123456",
              display_name: "Sku Customer",
              primary_email: "sku@example.com",
              primary_phone_number: "+46701234567",
              address: {
                street_address: "Ship Street 1",
                city: "Stockholm",
                post_code: "12345",
                coordinates: {
                  latitude: 59.4131733,
                  longitude: 17.922306,
                },
              },
            },
          ],
          failed_shops: [],
        },
        isSuccess: true,
      }) as never,
    );

    const { result } = renderHook(() => {
      const form = useForm<PreOrderFormValues>({
        defaultValues: createDefaultValues(),
      });
      const prefill = useShopifyCustomerLookupPrefill({
        form,
        articleNumber: "BAR-1234567",
        sku: "SKU-123456",
        enabled: true,
      });

      return { form, prefill };
    });

    expect(useShopifyCustomerLookupQuery).toHaveBeenCalledWith(
      {
        article_number: "BAR-1234567",
        sku: "SKU-123456",
      },
      { enabled: true },
    );

    await waitFor(() =>
      expect(result.current.form.getValues("customer.display_name")).toBe(
        "Sku Customer",
      ),
    );

    expect(result.current.form.getValues("customer.customer_type")).toBe(
      "private",
    );
    expect(result.current.form.getValues("customer.primary_email")).toBe(
      "sku@example.com",
    );
    expect(result.current.form.getValues("customer.primary_phone_number")).toBe(
      "+46701234567",
    );
    expect(result.current.form.getValues("customer.address.street")).toBe(
      "Ship Street 1",
    );
    expect(
      result.current.form.getValues("customer.address.coordinates.latitude"),
    ).toBe(59.4131733);
    expect(
      result.current.form.getValues("customer.address.coordinates.longitude"),
    ).toBe(17.922306);
    expect(result.current.prefill.status).toBe("found");
  });

  it("falls back to the remaining eligible field and preserves manual edits", async () => {
    let queryState = buildQueryState({
      data: {
        customer_matches: [
          {
            match_type: "sku",
            matched_value: "SKU-123456",
            display_name: "Initial Customer",
            primary_email: "initial@example.com",
          },
        ],
        failed_shops: [],
      },
      isSuccess: true,
    });

    vi.mocked(useShopifyCustomerLookupQuery).mockImplementation(
      (() => queryState) as typeof useShopifyCustomerLookupQuery,
    );

    const { result, rerender } = renderHook(
      ({
        articleNumber,
        sku,
      }: {
        articleNumber: string;
        sku: string;
      }) => {
        const form = useForm<PreOrderFormValues>({
          defaultValues: createDefaultValues(),
        });
        const prefill = useShopifyCustomerLookupPrefill({
          form,
          articleNumber,
          sku,
          enabled: true,
        });

        return { form, prefill };
      },
      {
        initialProps: {
          articleNumber: "BAR-1234567",
          sku: "SKU-123456",
        },
      },
    );

    await waitFor(() =>
      expect(result.current.form.getValues("customer.display_name")).toBe(
        "Initial Customer",
      ),
    );

    expect(result.current.form.getValues("customer.customer_type")).toBe(
      "private",
    );

    act(() => {
      result.current.form.setValue("customer.display_name", "Manual Name", {
        shouldDirty: true,
      });
    });

    queryState = buildQueryState({
      data: {
        customer_matches: [
          {
            match_type: "barcode",
            matched_value: "BAR-7654321",
            display_name: "Fallback Customer",
            primary_email: "fallback@example.com",
          },
        ],
        failed_shops: [],
      },
      isSuccess: true,
    });

    rerender({
      articleNumber: "BAR-7654321",
      sku: "SKU",
    });

    expect(useShopifyCustomerLookupQuery).toHaveBeenLastCalledWith(
      {
        article_number: "BAR-7654321",
        sku: undefined,
      },
      { enabled: true },
    );

    await waitFor(() =>
      expect(result.current.form.getValues("customer.primary_email")).toBe(
        "fallback@example.com",
      ),
    );

    expect(result.current.form.getValues("customer.display_name")).toBe(
      "Manual Name",
    );
  });

  it("treats query errors as a non-blocking not-found state", () => {
    vi.mocked(useShopifyCustomerLookupQuery).mockReturnValue(
      buildQueryState({
        isError: true,
      }) as never,
    );

    const { result } = renderHook(() => {
      const form = useForm<PreOrderFormValues>({
        defaultValues: createDefaultValues(),
      });

      return useShopifyCustomerLookupPrefill({
        form,
        articleNumber: "BAR-1234567",
        sku: "SKU-123456",
        enabled: true,
      });
    });

    expect(result.current.status).toBe("not_found");
  });
});
