import type { PropsWithChildren } from "react";

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { shopifyKeys } from "../api/shopify-keys";
import { ShopifyShopActionsSheetPage } from "./ShopifyShopActionsSheetPage";

const {
  setTitleMock,
  setActionsMock,
  requestCloseMock,
  useSurfacePropsMock,
  useGetShopifyShopQueryMock,
  reauthorizeMutateAsyncMock,
  syncMutateAsyncMock,
  disconnectMutateAsyncMock,
  notifySuccessMock,
  notifyErrorMock,
} = vi.hoisted(() => ({
  setTitleMock: vi.fn(),
  setActionsMock: vi.fn(),
  requestCloseMock: vi.fn(),
  useSurfacePropsMock: vi.fn(),
  useGetShopifyShopQueryMock: vi.fn(),
  reauthorizeMutateAsyncMock: vi.fn(),
  syncMutateAsyncMock: vi.fn(),
  disconnectMutateAsyncMock: vi.fn(),
  notifySuccessMock: vi.fn(),
  notifyErrorMock: vi.fn(),
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({
    setTitle: setTitleMock,
    setActions: setActionsMock,
    requestClose: requestCloseMock,
  }),
  useSurfaceProps: () => useSurfacePropsMock(),
}));

vi.mock("@beyo/lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/lib")>();

  return {
    ...actual,
    notify: {
      success: notifySuccessMock,
      error: notifyErrorMock,
    },
  };
});

vi.mock("../api/use-get-shopify-shop-query", () => ({
  useGetShopifyShopQuery: (...args: unknown[]) => useGetShopifyShopQueryMock(...args),
}));

vi.mock("../actions/use-create-shopify-reauthorize-url", () => ({
  useCreateShopifyReauthorizeUrl: () => ({
    mutateAsync: reauthorizeMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock("../actions/use-sync-shopify-webhooks-for-shop", () => ({
  useSyncShopifyWebhooksForShop: () => ({
    mutateAsync: syncMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock("../actions/use-disconnect-shopify-shop", () => ({
  useDisconnectShopifyShop: () => ({
    mutateAsync: disconnectMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock("../lib/use-shopify-integration-permissions", () => ({
  useShopifyIntegrationPermissions: () => ({
    canViewShopifyIntegrations: true,
    canCreateShopifyInstallUrl: true,
    canCreateShopifyReauthorizeUrl: true,
    canDisconnectShopifyIntegration: true,
    canSyncShopifyWebhooksForShop: true,
    canViewShopifyWebhookHistory: true,
  }),
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

function buildQueryState(overrides: Record<string, unknown> = {}) {
  return {
    data: SHOP_DETAIL,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

  function Wrapper({ children }: PropsWithChildren): React.JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  render(
    <Wrapper>
      <ShopifyShopActionsSheetPage />
    </Wrapper>,
  );

  return { invalidateQueriesSpy };
}

describe("ShopifyShopActionsSheetPage", () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSurfacePropsMock.mockReturnValue({ shopIntegrationId: "shop_1" });
    useGetShopifyShopQueryMock.mockReturnValue(buildQueryState());
    reauthorizeMutateAsyncMock.mockResolvedValue({
      install_url: "https://alpha.myshopify.com/install",
    });
    syncMutateAsyncMock.mockResolvedValue(undefined);
    disconnectMutateAsyncMock.mockResolvedValue(undefined);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        assign: assignMock,
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders missing, loading, and retry states", async () => {
    useSurfacePropsMock.mockReturnValue({});
    const { rerender } = render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <ShopifyShopActionsSheetPage />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText(/could not be opened because the shop id is missing/i),
    ).toBeInTheDocument();

    useSurfacePropsMock.mockReturnValue({ shopIntegrationId: "shop_1" });
    useGetShopifyShopQueryMock.mockReturnValue(buildQueryState({ isPending: true }));
    rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <ShopifyShopActionsSheetPage />
      </QueryClientProvider>,
    );

    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(4);

    const refetch = vi.fn();
    useGetShopifyShopQueryMock.mockReturnValue(
      buildQueryState({
        isError: true,
        data: undefined,
        refetch,
      }),
    );
    rerender(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <ShopifyShopActionsSheetPage />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("reauthorizes with a bare shop id and redirects to install_url", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: /Reauthorize Shopify integration/i }),
    );

    expect(reauthorizeMutateAsyncMock).toHaveBeenCalledWith("shop_1");
    expect(assignMock).toHaveBeenCalledWith(
      "https://alpha.myshopify.com/install",
    );
    expect(notifySuccessMock).not.toHaveBeenCalled();
  });

  it("syncs webhooks, invalidates the shops list, and notifies success", async () => {
    const user = userEvent.setup();
    const { invalidateQueriesSpy } = renderPage();

    await user.click(screen.getByRole("button", { name: /Sync webhooks/i }));

    expect(syncMutateAsyncMock).toHaveBeenCalledWith("shop_1");

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: shopifyKeys.shops(),
      });
    });

    expect(notifySuccessMock).toHaveBeenCalledWith("Webhook sync started.");
  });

  it("disconnects through ConfirmActionButton and closes the sheet", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", {
        name: /Disconnect Shopify integration/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: /Tap again to disconnect/i }),
    );

    expect(disconnectMutateAsyncMock).toHaveBeenCalledWith("shop_1");
    expect(notifySuccessMock).toHaveBeenCalledWith(
      "Shopify integration disconnected.",
    );
    expect(requestCloseMock).toHaveBeenCalledTimes(1);
  });
});
