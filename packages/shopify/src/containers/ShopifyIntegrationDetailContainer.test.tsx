import type React from "react";

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { shopifyKeys } from "../api/shopify-keys";
import { ShopifyIntegrationDetailContainer } from "./ShopifyIntegrationDetailContainer";

const useGetShopifyShopQueryMock = vi.fn();
const useGetShopifyScopeStatusesQueryMock = vi.fn();

vi.mock("@beyo/ui", async () => {
  const actual = await vi.importActual<typeof import("@beyo/ui")>("@beyo/ui");

  return {
    ...actual,
    PullToRefresh: ({
      children,
      className,
      onRefresh,
    }: {
      children: React.ReactNode;
      className?: string;
      onRefresh?: () => Promise<unknown> | void;
    }) => (
      <div className={className}>
        <button
          type="button"
          aria-label="Refresh detail content"
          onClick={() => {
            void onRefresh?.();
          }}
        >
          Refresh
        </button>
        {children}
      </div>
    ),
    useScrollHide: () => ({
      scrollRef: { current: null },
      isHidden: false,
      hideProgressContainerRef: { current: null },
    }),
  };
});

vi.mock("../api/use-get-shopify-shop-query", () => ({
  useGetShopifyShopQuery: (...args: unknown[]) => useGetShopifyShopQueryMock(...args),
}));

vi.mock("../api/use-get-shopify-scope-statuses-query", () => ({
  useGetShopifyScopeStatusesQuery: (...args: unknown[]) =>
    useGetShopifyScopeStatusesQueryMock(...args),
}));

vi.mock("../components/ShopifyWebhookHistorySection", () => ({
  ShopifyWebhookHistorySection: ({
    selectedShopIntegrationId,
  }: {
    selectedShopIntegrationId: string | null;
  }) => (
    <div data-testid="shopify-webhook-history-section">
      {selectedShopIntegrationId}
    </div>
  ),
}));

const SHOP_DETAIL = {
  shop_integration: {
    client_id: "shop_1",
    workspace_id: "ws_1",
    shop_domain: "alpha.myshopify.com",
    shop_name: "Alpha",
    provider: "shopify" as const,
    status: "active" as const,
    access_token_expires_at: null,
    granted_scopes: ["read_orders"],
    requested_scopes: ["read_orders", "read_products"],
    api_version: "2026-01",
    installed_at: "2026-07-01T10:00:00+00:00",
    uninstalled_at: null,
    last_connected_at: "2026-07-02T10:00:00+00:00",
    last_health_check_at: "2026-07-03T10:00:00+00:00",
    last_health_check_status: "healthy",
    last_error_code: "token_exchange_failed",
    last_error_message: "Token exchange failed.",
    scopes_status: "outdated" as const,
    webhooks_status: "synced" as const,
    created_by: {
      client_id: "user_1",
      username: "Alice",
      profile_picture: null,
    },
    updated_by: {
      client_id: "user_2",
      username: "Bob",
      profile_picture: null,
    },
    created_at: "2026-07-01T10:00:00+00:00",
    updated_at: "2026-07-04T10:00:00+00:00",
    is_deleted: false,
  },
  webhook_subscription_summary: {
    total: 3,
    active: 2,
    failed: 1,
    pending: 0,
    disabled: 0,
    removed: 0,
  },
  webhook_subscriptions: [
    {
      client_id: "sub_1",
      workspace_id: "ws_1",
      shop_integration_id: "shop_1",
      topic: "orders/create",
      callback_url: "https://example.com/webhooks",
      remote_subscription_id: "gid://shopify/WebhookSubscription/1",
      payload_format: "json",
      required_scopes: ["read_orders"],
      status: "active" as const,
      installed_at: "2026-07-01T10:05:00+00:00",
      last_verified_at: null,
      last_install_attempt_at: null,
      last_error_code: null,
      last_error_message: null,
      created_at: "2026-07-01T10:05:00+00:00",
      updated_at: "2026-07-01T10:05:00+00:00",
    },
  ],
};

function buildQueryState(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

function renderWithQueryClient(
  ui: React.ReactElement,
): { invalidateQueriesSpy: ReturnType<typeof vi.spyOn> } {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );

  return { invalidateQueriesSpy };
}

describe("ShopifyIntegrationDetailContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGetShopifyShopQueryMock.mockReturnValue(buildQueryState());
    useGetShopifyScopeStatusesQueryMock.mockReturnValue(buildQueryState());
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a missing selected id state", () => {
    renderWithQueryClient(
      <ShopifyIntegrationDetailContainer
        selectedShopIntegrationId={null}
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Select a shop to view its details."),
    ).toBeInTheDocument();
  });

  it("renders a loading state", () => {
    useGetShopifyShopQueryMock.mockReturnValue(
      buildQueryState({ isPending: true }),
    );

    renderWithQueryClient(
      <ShopifyIntegrationDetailContainer
        selectedShopIntegrationId="shop_1"
        onBack={vi.fn()}
      />,
    );

    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("calls the scopes endpoint query when a shop is selected", () => {
    useGetShopifyShopQueryMock.mockReturnValue(
      buildQueryState({
        data: SHOP_DETAIL,
      }),
    );

    renderWithQueryClient(
      <ShopifyIntegrationDetailContainer
        selectedShopIntegrationId="shop_1"
        onBack={vi.fn()}
      />,
    );

    expect(useGetShopifyScopeStatusesQueryMock).toHaveBeenCalledWith("shop_1");
  });

  it("renders an error state and retries with refetch", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    useGetShopifyShopQueryMock.mockReturnValue(
      buildQueryState({
        isError: true,
        error: new Error("Nope"),
        refetch,
      }),
    );

    renderWithQueryClient(
      <ShopifyIntegrationDetailContainer
        selectedShopIntegrationId="shop_1"
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Shopify shop details could not be loaded."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders populated detail content and keeps phase 5+ UI absent", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const refetch = vi.fn();
    useGetShopifyShopQueryMock.mockReturnValue(
      buildQueryState({
        data: SHOP_DETAIL,
        refetch,
      }),
    );

    const { invalidateQueriesSpy } = renderWithQueryClient(
      <ShopifyIntegrationDetailContainer
        selectedShopIntegrationId="shop_1"
        onBack={onBack}
      />,
    );

    expect(screen.getByRole("heading", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByText("alpha.myshopify.com")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(
      screen.getByTestId("shopify-detail-created-by-pill"),
    ).toHaveTextContent("Alice");
    expect(
      screen.getByTestId("shopify-detail-updated-by-pill"),
    ).toHaveTextContent("Bob");

    const menuButton = screen.getByRole("button", {
      name: "Shopify detail actions",
    });
    expect(menuButton).toBeDisabled();

    expect(
      screen.getByTestId("shopify-webhook-history-section"),
    ).toHaveTextContent("shop_1");

    await user.click(
      screen.getByRole("button", { name: "Refresh detail content" }),
    );
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: shopifyKeys.webhookHistoryRoot("shop_1"),
    });

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("forwards the detail actions callback to the header button", async () => {
    const user = userEvent.setup();
    const onOpenActions = vi.fn();
    useGetShopifyShopQueryMock.mockReturnValue(
      buildQueryState({
        data: SHOP_DETAIL,
      }),
    );

    renderWithQueryClient(
      <ShopifyIntegrationDetailContainer
        selectedShopIntegrationId="shop_1"
        onBack={vi.fn()}
        onOpenActions={onOpenActions}
      />,
    );

    const menuButton = screen.getByRole("button", {
      name: "Shopify detail actions",
    });
    expect(menuButton).toBeEnabled();

    await user.click(menuButton);

    expect(onOpenActions).toHaveBeenCalledTimes(1);
  });

  it("forwards the webhook subscriptions opener to the summary trigger", async () => {
    const user = userEvent.setup();
    const onOpenSubscriptions = vi.fn();
    useGetShopifyShopQueryMock.mockReturnValue(
      buildQueryState({
        data: SHOP_DETAIL,
      }),
    );

    renderWithQueryClient(
      <ShopifyIntegrationDetailContainer
        selectedShopIntegrationId="shop_1"
        onBack={vi.fn()}
        onOpenSubscriptions={onOpenSubscriptions}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Webhook subscriptions/i }),
    );

    expect(onOpenSubscriptions).toHaveBeenCalledTimes(1);
  });
});
