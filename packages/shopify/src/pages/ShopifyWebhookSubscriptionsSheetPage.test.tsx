import type { PropsWithChildren } from "react";

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShopifyWebhookSubscriptionsSheetPage } from "./ShopifyWebhookSubscriptionsSheetPage";

const { setTitleMock, setActionsMock, useSurfacePropsMock, useGetShopifyShopQueryMock } =
  vi.hoisted(() => ({
    setTitleMock: vi.fn(),
    setActionsMock: vi.fn(),
    useSurfacePropsMock: vi.fn(),
    useGetShopifyShopQueryMock: vi.fn(),
  }));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({
    setTitle: setTitleMock,
    setActions: setActionsMock,
  }),
  useSurfaceProps: () => useSurfacePropsMock(),
}));

vi.mock("../api/use-get-shopify-shop-query", () => ({
  useGetShopifyShopQuery: (...args: unknown[]) =>
    useGetShopifyShopQueryMock(...args),
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
    scopes_status: "up_to_date" as const,
    webhooks_status: "synced" as const,
    created_by: null,
    updated_by: null,
    created_at: "2026-07-01T10:00:00+00:00",
    updated_at: "2026-07-01T10:00:00+00:00",
    is_deleted: false,
  },
  webhook_subscription_summary: {
    total: 1,
    active: 1,
    failed: 0,
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

  function Wrapper({ children }: PropsWithChildren): React.JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  render(
    <Wrapper>
      <ShopifyWebhookSubscriptionsSheetPage />
    </Wrapper>,
  );
}

describe("ShopifyWebhookSubscriptionsSheetPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSurfacePropsMock.mockReturnValue({ shopIntegrationId: "shop_1" });
    useGetShopifyShopQueryMock.mockReturnValue(buildQueryState());
  });

  afterEach(() => {
    cleanup();
  });

  it("renders missing, loading, and retry states", async () => {
    const user = userEvent.setup();
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
        <ShopifyWebhookSubscriptionsSheetPage />
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
        <ShopifyWebhookSubscriptionsSheetPage />
      </QueryClientProvider>,
    );

    expect(document.querySelectorAll(".animate-pulse")).toHaveLength(3);

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
        <ShopifyWebhookSubscriptionsSheetPage />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders the full subscriptions sheet content once data resolves", () => {
    renderPage();

    expect(setTitleMock).toHaveBeenCalledWith("Webhook subscriptions");
    expect(setActionsMock).toHaveBeenCalledWith(null);
    expect(
      screen.getByTestId("shopify-webhook-subscriptions-sheet"),
    ).toBeInTheDocument();
    expect(screen.getByText("orders/create")).toBeInTheDocument();
  });
});
