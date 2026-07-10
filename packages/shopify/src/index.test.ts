import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("@beyo/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@beyo/auth", () => ({
  AuthRole: {
    Admin: "admin",
    Manager: "manager",
    Worker: "worker",
    Seller: "seller",
  },
  useRole: () => ({
    role: "admin",
    workspaceRoleName: "admin",
    workspaceSpecialization: null,
    hasRole: () => true,
    hasSpecialization: () => false,
    isWorkspaceRole: () => false,
  }),
}));

import * as shopify from "./index";

describe("@beyo/shopify exports", () => {
  it("exposes the Phase 1 package surface", () => {
    expect(shopify.shopifyKeys).toBeDefined();
    expect(shopify.createShopifyInstallUrl).toBeTypeOf("function");
    expect(shopify.useListShopifyShopsQuery).toBeTypeOf("function");
    expect(shopify.useGetShopifyShopQuery).toBeTypeOf("function");
    expect(shopify.useDisconnectShopifyShop).toBeTypeOf("function");
    expect(shopify.useShopifyIntegrationPermissions).toBeTypeOf("function");
    expect(shopify.loadShopifyIntegrationsSlidePage).toBeTypeOf("function");
    expect(shopify.loadShopifyOAuthResultPage).toBeTypeOf("function");
    expect(shopify.loadShopifyShopActionsSheetPage).toBeTypeOf("function");
    expect(shopify.loadShopifyWebhookSubscriptionsSheetPage).toBeTypeOf(
      "function",
    );
    expect(shopify.ShopifyIntegrationDetailContainer).toBeTypeOf("function");
    expect(shopify.ShopifyShopActionsSheetContent).toBeTypeOf("function");
    expect(shopify.ShopifyWebhookSubscriptionsSheetContent).toBeTypeOf(
      "function",
    );
    expect(shopify.ShopifyWebhookHistorySection).toBeTypeOf("function");
    expect(shopify.ShopifyWebhookHistoryRecordCard).toBeTypeOf("function");
    expect(shopify.ShopifyWebhookMetadataPreview).toBeTypeOf("function");
    expect(shopify.formatShopifyDetailDate).toBeTypeOf("function");
    expect(shopify.resolveShopifyIntegrationEventSourceLabel).toBeTypeOf(
      "function",
    );
    expect(shopify.shopifyScopesStatusLabel).toBeTypeOf("function");
    expect(shopify.shopifyWebhookIntakeStatusLabel).toBeTypeOf("function");
    expect(shopify.shopifyWebhookSubscriptionStatusLabel).toBeTypeOf(
      "function",
    );
    expect(shopify.SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID).toBe(
      "shopify-shop-actions-sheet",
    );
    expect(shopify.SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID).toBe(
      "shopify-webhook-subscriptions-sheet",
    );
    expect(shopify.ShopifyShopIntegrationSchema).toBeDefined();
  });
});
