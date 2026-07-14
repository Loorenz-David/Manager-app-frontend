import type React from "react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShopifyIntegrationsSlidePage } from "./ShopifyIntegrationsSlidePage";

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const setHeaderHiddenMock = vi.fn();
const requestCloseMock = vi.fn();
const useSurfacePropsMock = vi.fn();
const useControllerMock = vi.fn();
const useGetShopifyShopQueryMock = vi.fn();
const useShopifyWebhookHistoryInfiniteQueryMock = vi.fn();

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({
    setHeaderHidden: setHeaderHiddenMock,
    requestClose: requestCloseMock,
  }),
  useSurfaceProps: () => useSurfacePropsMock(),
}));

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

vi.mock("../controllers/use-shopify-integrations-page.controller", () => ({
  useShopifyIntegrationsPageController: () => useControllerMock(),
}));

vi.mock("../api/use-get-shopify-shop-query", () => ({
  useGetShopifyShopQuery: (...args: unknown[]) => useGetShopifyShopQueryMock(...args),
}));

vi.mock("../api/use-shopify-webhook-history-infinite-query", () => ({
  useShopifyWebhookHistoryInfiniteQuery: (...args: unknown[]) =>
    useShopifyWebhookHistoryInfiniteQueryMock(...args),
}));

function buildController(overrides: Record<string, unknown> = {}) {
  return {
    activeIndex: 0 as const,
    selectedShopIntegrationId: null,
    shops: [],
    isListLoading: false,
    listError: null,
    permissions: {
      canViewShopifyIntegrations: true,
      canCreateShopifyInstallUrl: true,
      canCreateShopifyReauthorizeUrl: true,
      canDisconnectShopifyIntegration: true,
      canSyncShopifyWebhooksForShop: true,
      canViewShopifyWebhookHistory: true,
    },
    closeSurface: undefined,
    openShop: vi.fn(),
    openCreate: vi.fn(),
    goBackToList: vi.fn(),
    refreshList: vi.fn(),
    submitShopDomain: vi.fn(),
    isSubmittingShopDomain: false,
    ...overrides,
  };
}

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
  },
  webhook_subscription_summary: {
    total: 0,
    active: 0,
    failed: 0,
    pending: 0,
    disabled: 0,
    removed: 0,
  },
  webhook_subscriptions: [],
};

function buildDetailQueryState(overrides: Record<string, unknown> = {}) {
  return {
    data: SHOP_DETAIL,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe("ShopifyIntegrationsSlidePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSurfacePropsMock.mockReturnValue({});
    useControllerMock.mockReturnValue(buildController());
    useGetShopifyShopQueryMock.mockReturnValue(buildDetailQueryState());
    useShopifyWebhookHistoryInfiniteQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("hides the host surface header and falls back to requestClose from the list pane", async () => {
    const user = userEvent.setup();

    const { unmount } = renderWithQueryClient(<ShopifyIntegrationsSlidePage />);

    expect(setHeaderHiddenMock).toHaveBeenCalledWith(true);
    expect(
      screen.getByTestId("shopify-integrations-slide-page").className,
    ).not.toMatch(/\bpx-\d+/);

    await user.click(
      screen.getByRole("button", { name: "Close & Back" }),
    );

    expect(requestCloseMock).toHaveBeenCalledTimes(1);

    unmount();

    expect(setHeaderHiddenMock).toHaveBeenLastCalledWith(false);
  });

  it("uses the injected closeSurface when available", async () => {
    const user = userEvent.setup();
    const closeSurface = vi.fn();
    useControllerMock.mockReturnValue(buildController({ closeSurface }));

    renderWithQueryClient(<ShopifyIntegrationsSlidePage />);

    await user.click(
      screen.getByRole("button", { name: "Close & Back" }),
    );

    expect(closeSurface).toHaveBeenCalledTimes(1);
    expect(requestCloseMock).not.toHaveBeenCalled();
  });

  it("opens the Shopify actions sheet from the detail header via the injected opener", async () => {
    const user = userEvent.setup();
    const openShopActions = vi.fn();
    useSurfacePropsMock.mockReturnValue({
      surfaceOpeners: {
        openShopActions,
      },
    });
    useControllerMock.mockReturnValue(
      buildController({
        activeIndex: 1,
        selectedShopIntegrationId: "shop_1",
      }),
    );

    renderWithQueryClient(<ShopifyIntegrationsSlidePage />);

    const menuButton = screen.getByRole("button", {
      name: "Shopify detail actions",
    });
    expect(menuButton).toBeEnabled();

    await user.click(menuButton);

    expect(openShopActions).toHaveBeenCalledWith({
      shopIntegrationId: "shop_1",
    });
  });

  it("opens the webhook subscriptions sheet from the detail trigger via the injected opener", async () => {
    const user = userEvent.setup();
    const openWebhookSubscriptions = vi.fn();
    useSurfacePropsMock.mockReturnValue({
      surfaceOpeners: {
        openWebhookSubscriptions,
      },
    });
    useControllerMock.mockReturnValue(
      buildController({
        activeIndex: 1,
        selectedShopIntegrationId: "shop_1",
      }),
    );

    renderWithQueryClient(<ShopifyIntegrationsSlidePage />);

    const trigger = screen.getByRole("button", {
      name: /Webhook subscriptions/i,
    });
    expect(trigger).toBeEnabled();

    await user.click(trigger);

    expect(openWebhookSubscriptions).toHaveBeenCalledWith({
      shopIntegrationId: "shop_1",
    });
  });
});
