import type React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShopifyShopActionsSheetContent } from "./ShopifyShopActionsSheetContent";

const ADMIN_PERMISSIONS = {
  canViewShopifyIntegrations: true,
  canCreateShopifyInstallUrl: true,
  canCreateShopifyReauthorizeUrl: true,
  canDisconnectShopifyIntegration: true,
  canSyncShopifyWebhooksForShop: true,
  canViewShopifyWebhookHistory: true,
};

const MANAGER_PERMISSIONS = {
  ...ADMIN_PERMISSIONS,
  canDisconnectShopifyIntegration: false,
  canSyncShopifyWebhooksForShop: false,
};

function buildShop(
  overrides: Partial<Parameters<typeof ShopifyShopActionsSheetContent>[0]["shop"]> = {},
) {
  return {
    client_id: "shop_1",
    workspace_id: "ws_1",
    shop_domain: "alpha.myshopify.com",
    shop_name: "Alpha",
    provider: "shopify" as const,
    status: "active" as const,
    access_token_expires_at: null,
    granted_scopes: ["read_orders"],
    requested_scopes: ["read_orders"],
    api_version: "2026-01",
    installed_at: "2026-07-01T10:00:00+00:00",
    uninstalled_at: null,
    last_connected_at: "2026-07-01T10:00:00+00:00",
    last_health_check_at: null,
    last_health_check_status: null,
    last_error_code: null,
    last_error_message: null,
    scopes_status: "outdated" as const,
    webhooks_status: "needs_sync" as const,
    created_by: null,
    updated_by: null,
    created_at: "2026-07-01T10:00:00+00:00",
    updated_at: "2026-07-01T10:00:00+00:00",
    is_deleted: false,
    ...overrides,
  };
}

function renderContent(
  overrides: Partial<React.ComponentProps<typeof ShopifyShopActionsSheetContent>> = {},
) {
  const onReauthorize = vi.fn().mockResolvedValue(undefined);
  const onSyncWebhooks = vi.fn().mockResolvedValue(undefined);
  const onDisconnect = vi.fn().mockResolvedValue(undefined);

  render(
    <ShopifyShopActionsSheetContent
      shop={buildShop()}
      permissions={ADMIN_PERMISSIONS}
      isDisconnecting={false}
      isReauthorizing={false}
      isSyncingWebhooks={false}
      onDisconnect={onDisconnect}
      onReauthorize={onReauthorize}
      onSyncWebhooks={onSyncWebhooks}
      {...overrides}
    />,
  );

  return { onReauthorize, onSyncWebhooks, onDisconnect };
}

describe("ShopifyShopActionsSheetContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows all approved admin actions for an active shop with outdated scopes", () => {
    renderContent();

    expect(
      screen.getByRole("button", {
        name: /Reauthorize Shopify integration/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sync webhooks/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Disconnect Shopify integration/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/workspace-wide/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/scope status/i)).not.toBeInTheDocument();
  });

  it("shows only reauthorize for managers when scopes are outdated", () => {
    renderContent({
      permissions: MANAGER_PERMISSIONS,
    });

    expect(
      screen.getByRole("button", {
        name: /Reauthorize Shopify integration/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Sync webhooks/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Disconnect Shopify integration/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows no available actions when a manager views a healthy shop", () => {
    renderContent({
      permissions: MANAGER_PERMISSIONS,
      shop: buildShop({
        scopes_status: "up_to_date",
        webhooks_status: "synced",
      }),
    });

    expect(
      screen.getByText("No actions are available for this shop right now."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Reauthorize Shopify integration/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("hides disconnect for disabled and uninstalled shops", () => {
    const { rerender } = render(
      <ShopifyShopActionsSheetContent
        shop={buildShop({ status: "disabled" })}
        permissions={ADMIN_PERMISSIONS}
        isDisconnecting={false}
        isReauthorizing={false}
        isSyncingWebhooks={false}
        onDisconnect={vi.fn().mockResolvedValue(undefined)}
        onReauthorize={vi.fn().mockResolvedValue(undefined)}
        onSyncWebhooks={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: /Disconnect Shopify integration/i,
      }),
    ).not.toBeInTheDocument();

    rerender(
      <ShopifyShopActionsSheetContent
        shop={buildShop({ status: "uninstalled" })}
        permissions={ADMIN_PERMISSIONS}
        isDisconnecting={false}
        isReauthorizing={false}
        isSyncingWebhooks={false}
        onDisconnect={vi.fn().mockResolvedValue(undefined)}
        onReauthorize={vi.fn().mockResolvedValue(undefined)}
        onSyncWebhooks={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: /Disconnect Shopify integration/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("uses ConfirmActionButton semantics for disconnect", async () => {
    const user = userEvent.setup();
    const { onDisconnect } = renderContent();

    const disconnectButton = screen.getByRole("button", {
      name: /Disconnect Shopify integration/i,
    });

    await user.click(disconnectButton);

    expect(
      screen.getByRole("button", { name: /Tap again to disconnect/i }),
    ).toBeInTheDocument();
    expect(onDisconnect).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: /Tap again to disconnect/i }),
    );

    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });
});
