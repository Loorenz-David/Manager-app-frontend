import { describe, expect, it, vi } from "vitest";

import { apiClient } from "@beyo/api-client";

import { disconnectShopifyShop } from "./disconnect-shopify-shop";

vi.mock("@beyo/api-client", () => ({
  apiClient: {
    delete: vi.fn(),
  },
}));

describe("disconnectShopifyShop", () => {
  it("calls the admin disconnect route without a request body", async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({
      ok: true,
      warnings: [],
      data: {
        shop_integration_id: "shop_123",
        shop_domain: "shop.myshopify.com",
        status: "disabled",
        uninstalled_at: "2026-07-10T00:10:00+00:00",
        remove_webhooks_task_id: "task_123",
      },
    });

    const result = await disconnectShopifyShop("shop_123");

    expect(apiClient.delete).toHaveBeenCalledTimes(1);
    expect(apiClient.delete).toHaveBeenCalledWith(
      "/api/v1/integrations/shopify/shops/shop_123",
      expect.anything(),
    );
    expect(result).toEqual({
      shop_integration_id: "shop_123",
      shop_domain: "shop.myshopify.com",
      status: "disabled",
      uninstalled_at: "2026-07-10T00:10:00+00:00",
      remove_webhooks_task_id: "task_123",
    });
  });
});
