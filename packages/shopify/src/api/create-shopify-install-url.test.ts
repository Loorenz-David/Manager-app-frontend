import { describe, expect, it, vi } from "vitest";

import { apiClient } from "@beyo/api-client";

import { createShopifyInstallUrl } from "./create-shopify-install-url";

vi.mock("@beyo/api-client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe("createShopifyInstallUrl", () => {
  it("posts the contract-accurate body and returns the response data", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      ok: true,
      warnings: [],
      data: {
        install_url: "https://shop.myshopify.com/install",
        shop_domain: "shop.myshopify.com",
        expires_at: "2026-07-10T00:10:00+00:00",
      },
    });

    const result = await createShopifyInstallUrl("Shop.MyShopify.com");

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/v1/integrations/shopify/install-url",
      expect.anything(),
      {
        shop_domain: "Shop.MyShopify.com",
        redirect_after_success: null,
      },
    );
    expect(result).toEqual({
      install_url: "https://shop.myshopify.com/install",
      shop_domain: "shop.myshopify.com",
      expires_at: "2026-07-10T00:10:00+00:00",
    });
  });
});
