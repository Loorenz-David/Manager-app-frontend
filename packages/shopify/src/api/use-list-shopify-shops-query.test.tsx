import type { PropsWithChildren } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useListShopifyShopsQuery } from "./use-list-shopify-shops-query";

const listShopifyShopsMock = vi.fn();

vi.mock("./list-shopify-shops", () => ({
  listShopifyShops: (...args: unknown[]) => listShopifyShopsMock(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useListShopifyShopsQuery", () => {
  afterEach(() => {
    listShopifyShopsMock.mockReset();
  });

  it("uses the list key and forwards params to the API function", async () => {
    listShopifyShopsMock.mockResolvedValueOnce({
      shops: [],
      shops_pagination: {
        limit: 20,
        offset: 0,
        has_more: false,
      },
    });

    const { result } = renderHook(
      () => useListShopifyShopsQuery({ limit: 20, offset: 0 }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      shops: [],
      shops_pagination: {
        limit: 20,
        offset: 0,
        has_more: false,
      },
    });
    expect(listShopifyShopsMock).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });
});
