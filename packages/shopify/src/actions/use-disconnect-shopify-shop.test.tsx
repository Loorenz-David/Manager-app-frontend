import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { shopifyKeys } from "../api/shopify-keys";
import { useDisconnectShopifyShop } from "./use-disconnect-shopify-shop";

const disconnectShopifyShopMock = vi.fn();

vi.mock("../api/disconnect-shopify-shop", () => ({
  disconnectShopifyShop: (...args: unknown[]) =>
    disconnectShopifyShopMock(...args),
}));

function createTestContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

  const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { Wrapper, invalidateQueriesSpy };
}

describe("useDisconnectShopifyShop", () => {
  afterEach(() => {
    disconnectShopifyShopMock.mockReset();
  });

  it("invalidates the shops list and the shop history after settlement", async () => {
    disconnectShopifyShopMock.mockResolvedValueOnce({
      shop_integration_id: "shop_123",
      shop_domain: "shop.myshopify.com",
      status: "disabled",
      uninstalled_at: "2026-07-10T00:10:00+00:00",
      remove_webhooks_task_id: "task_123",
    });

    const { Wrapper, invalidateQueriesSpy } = createTestContext();
    const { result } = renderHook(() => useDisconnectShopifyShop(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("shop_123");
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: shopifyKeys.shops(),
      });
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: shopifyKeys.webhookHistoryRoot("shop_123"),
    });
  });
});
