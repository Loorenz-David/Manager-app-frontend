import type { ItemId } from "@beyo/lib";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { putItemValuation } from "./put-item-valuation";

const mocks = vi.hoisted(() => ({ put: vi.fn() }));

vi.mock("@beyo/api-client", () => ({
  apiClient: { put: mocks.put },
  ApiRequestError: class ApiRequestError extends Error {},
}));

const ITEM_ID = "itm_ref0001" as ItemId;

describe("putItemValuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes to the item valuation path under the item-economics base", async () => {
    mocks.put.mockImplementation(
      async (_path: string, schema: { parse: (input: unknown) => unknown }) =>
        schema.parse({
          ok: true,
          warnings: [],
          data: {
            item_valuation: { client_id: "ival_new" },
            preview: { status: "item_missing_expected_price" },
          },
        }),
    );

    const result = await putItemValuation(ITEM_ID, {
      purchase_cost_minor: 284994,
      currency: "swedish_krona",
    });

    expect(mocks.put.mock.calls[0]?.[0]).toBe(
      "/api/v1/item-economics/items/itm_ref0001/valuation",
    );
    expect(result.preview.status).toBe("item_missing_expected_price");
  });

  it("ignores the fields this screen does not read, and fails on an unknown status", async () => {
    mocks.put.mockImplementation(
      async (_path: string, schema: { parse: (input: unknown) => unknown }) =>
        schema.parse({
          ok: true,
          warnings: [],
          data: {
            item_valuation: { client_id: "ival_new", superseded_at: null },
            preview: { status: "brand_new_status" },
          },
        }),
    );

    await expect(
      putItemValuation(ITEM_ID, {
        purchase_cost_minor: 1,
        currency: "swedish_krona",
      }),
    ).rejects.toThrow();
  });
});
