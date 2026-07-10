import type React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShopifyIntegrationsListContainer } from "./ShopifyIntegrationsListContainer";

vi.mock("@beyo/ui", async () => {
  const actual = await vi.importActual<typeof import("@beyo/ui")>("@beyo/ui");

  return {
    ...actual,
    PullToRefresh: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    useScrollHide: () => ({
      scrollRef: { current: null },
      isHidden: false,
      hideProgressContainerRef: { current: null },
    }),
  };
});

const SHOP = {
  client_id: "shop_1",
  workspace_id: "ws_1",
  shop_domain: "alpha.myshopify.com",
  shop_name: "Alpha",
  provider: "shopify" as const,
  status: "active" as const,
  access_token_expires_at: null,
  granted_scopes: [],
  requested_scopes: [],
  api_version: "2026-01",
  installed_at: null,
  uninstalled_at: null,
  last_connected_at: null,
  last_health_check_at: null,
  last_health_check_status: null,
  last_error_code: null,
  last_error_message: null,
  scopes_status: "up_to_date" as const,
  webhooks_status: "synced" as const,
  created_by: null,
  updated_by: null,
  created_at: "2026-07-10T00:00:00+00:00",
  updated_at: "2026-07-10T00:00:00+00:00",
  is_deleted: false,
};

function renderList(
  overrides: Partial<React.ComponentProps<typeof ShopifyIntegrationsListContainer>> = {},
) {
  return render(
    <ShopifyIntegrationsListContainer
      canCreate
      canView
      error={null}
      isLoading={false}
      shops={[]}
      onClose={vi.fn()}
      onOpenCreate={vi.fn()}
      onOpenShop={vi.fn()}
      onRefresh={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ShopifyIntegrationsListContainer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders loading, error, and empty states", () => {
    const { rerender } = renderList({ isLoading: true });

    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(4);

    rerender(
      <ShopifyIntegrationsListContainer
        canCreate
        canView
        error={new Error("Nope")}
        isLoading={false}
        shops={[]}
        onClose={vi.fn()}
        onOpenCreate={vi.fn()}
        onOpenShop={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Shopify integrations could not be loaded."),
    ).toBeVisible();

    rerender(
      <ShopifyIntegrationsListContainer
        canCreate
        canView
        error={null}
        isLoading={false}
        shops={[]}
        onClose={vi.fn()}
        onOpenCreate={vi.fn()}
        onOpenShop={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No Shopify shops are connected yet."),
    ).toBeVisible();
  });

  it("opens a shop card and hides the FAB when create permission is false", async () => {
    const user = userEvent.setup();
    const onOpenShop = vi.fn();

    renderList({
      canCreate: false,
      shops: [SHOP],
      onOpenShop,
    });

    await user.click(screen.getByRole("button", { name: /alpha/i }));

    expect(onOpenShop).toHaveBeenCalledWith(SHOP);
    expect(
      screen.queryByRole("button", { name: "Connect Shopify shop" }),
    ).not.toBeInTheDocument();
  });
});
