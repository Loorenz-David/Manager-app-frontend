import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestQueryClient,
  createTestWrapper,
} from "@/test-utils/query-client";

import type { ExternalUpholsteryProvider } from "../../../../../../packages/upholstery/src/types";

const { fetchExternalUpholsteryOptionsMock } = vi.hoisted(() => ({
  fetchExternalUpholsteryOptionsMock: vi.fn(),
}));

vi.mock(
  "../../../../../../packages/upholstery/src/api/fetch-external-upholstery-options",
  () => ({
    fetchExternalUpholsteryOptions: fetchExternalUpholsteryOptionsMock,
  }),
);

import { useExternalUpholsteryOptionsByProviderQuery } from "../../../../../../packages/upholstery/src/api/use-external-upholstery-options-by-provider";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

function createExternalResponse(provider: ExternalUpholsteryProvider) {
  return {
    upholsteries: [
      {
        client_id: null,
        name: `${provider} fabric`,
        code: `${provider}-1`,
        image_url: null,
        external_url: null,
        page_link: null,
        favorite: null,
        list_order: null,
        inventory_id: null,
        current_stored_amount_meters: null,
        inventory_condition: null,
        upholstery_category: null,
        supplier_name: provider,
        origin: provider,
      },
    ],
    has_more: false,
    providers: [provider],
  };
}

describe("useExternalUpholsteryOptionsByProviderQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fans out to all providers and appends results in completion order", async () => {
    const deferredByProvider = {
      nevotex: createDeferred<ReturnType<typeof createExternalResponse>>(),
      ohlssons_tyger: createDeferred<ReturnType<typeof createExternalResponse>>(),
      fargotex: createDeferred<ReturnType<typeof createExternalResponse>>(),
      selfmade: createDeferred<ReturnType<typeof createExternalResponse>>(),
    } satisfies Record<
      ExternalUpholsteryProvider,
      Deferred<ReturnType<typeof createExternalResponse>>
    >;

    fetchExternalUpholsteryOptionsMock.mockImplementation(
      ({
        providers,
      }: {
        providers?: ExternalUpholsteryProvider[];
      }) => deferredByProvider[providers?.[0] ?? "nevotex"].promise,
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useExternalUpholsteryOptionsByProviderQuery(
          { q: "linen" },
          { enabled: true },
        ),
      {
        wrapper: createTestWrapper(queryClient),
      },
    );

    await waitFor(() => {
      expect(fetchExternalUpholsteryOptionsMock).toHaveBeenCalledTimes(4);
    });

    expect(fetchExternalUpholsteryOptionsMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ limit: 10, providers: ["nevotex"], q: "linen" }),
    );
    expect(fetchExternalUpholsteryOptionsMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        limit: 10,
        providers: ["ohlssons_tyger"],
        q: "linen",
      }),
    );
    expect(fetchExternalUpholsteryOptionsMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ limit: 10, providers: ["fargotex"], q: "linen" }),
    );
    expect(fetchExternalUpholsteryOptionsMock).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ limit: 10, providers: ["selfmade"], q: "linen" }),
    );

    await act(async () => {
      deferredByProvider.fargotex.resolve(createExternalResponse("fargotex"));
    });

    await waitFor(() => {
      expect(result.current.upholsteries.map((item) => item.origin)).toEqual([
        "fargotex",
      ]);
      expect(result.current.completionOrder).toEqual(["fargotex"]);
      expect(result.current.isFetching).toBe(true);
    });

    await act(async () => {
      deferredByProvider.selfmade.resolve(createExternalResponse("selfmade"));
    });

    await waitFor(() => {
      expect(result.current.upholsteries.map((item) => item.origin)).toEqual([
        "fargotex",
        "selfmade",
      ]);
      expect(result.current.completionOrder).toEqual([
        "fargotex",
        "selfmade",
      ]);
    });

    await act(async () => {
      deferredByProvider.nevotex.resolve(createExternalResponse("nevotex"));
      deferredByProvider.ohlssons_tyger.resolve(
        createExternalResponse("ohlssons_tyger"),
      );
    });

    await waitFor(() => {
      expect(result.current.upholsteries.map((item) => item.origin)).toEqual([
        "fargotex",
        "selfmade",
        "nevotex",
        "ohlssons_tyger",
      ]);
      expect(result.current.isFetching).toBe(false);
    });
  });

  it("limits provider calls to the selected providers and refetches only those", async () => {
    fetchExternalUpholsteryOptionsMock.mockImplementation(
      async ({ providers }: { providers?: ExternalUpholsteryProvider[] }) =>
        createExternalResponse(providers?.[0] ?? "nevotex"),
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useExternalUpholsteryOptionsByProviderQuery(
          { q: "blue", providers: ["nevotex", "selfmade"] },
          { enabled: true },
        ),
      {
        wrapper: createTestWrapper(queryClient),
      },
    );

    await waitFor(() => {
      expect(fetchExternalUpholsteryOptionsMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchExternalUpholsteryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ providers: ["nevotex"] }),
    );
    expect(fetchExternalUpholsteryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ providers: ["selfmade"] }),
    );

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(fetchExternalUpholsteryOptionsMock).toHaveBeenCalledTimes(4);
    });
  });
});
