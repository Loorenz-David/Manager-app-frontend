import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useShopifyIntegrationsPageController } from "./use-shopify-integrations-page.controller";

const { refetchMock, mutateAsyncMock, notifyErrorMock } = vi.hoisted(() => ({
  refetchMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  notifyErrorMock: vi.fn(),
}));

vi.mock("../api/use-list-shopify-shops-query", () => ({
  useListShopifyShopsQuery: () => ({
    data: {
      shops: [
        {
          client_id: "shop_1",
          workspace_id: "ws_1",
          shop_domain: "alpha.myshopify.com",
          shop_name: "Alpha",
          provider: "shopify",
          status: "active",
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
          scopes_status: "up_to_date",
          webhooks_status: "synced",
          created_by: null,
          updated_by: null,
          created_at: "2026-07-10T00:00:00+00:00",
          updated_at: "2026-07-10T00:00:00+00:00",
          is_deleted: false,
        },
      ],
    },
    isPending: false,
    error: null,
    refetch: refetchMock,
  }),
}));

vi.mock("../actions/use-create-shopify-install-url", () => ({
  useCreateShopifyInstallUrl: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
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

vi.mock("@beyo/lib", async () => {
  const actual = await vi.importActual<typeof import("@beyo/lib")>("@beyo/lib");

  return {
    ...actual,
    notify: {
      ...actual.notify,
      error: notifyErrorMock,
    },
  };
});

describe("useShopifyIntegrationsPageController", () => {
  beforeEach(() => {
    refetchMock.mockReset();
    mutateAsyncMock.mockReset();
    notifyErrorMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("opens the create pane, opens a shop placeholder, and can go back to the list", () => {
    const { result } = renderHook(() =>
      useShopifyIntegrationsPageController({}),
    );

    expect(result.current.activeIndex).toBe(0);
    expect(result.current.selectedShopIntegrationId).toBeNull();

    act(() => {
      result.current.openCreate();
    });

    expect(result.current.activeIndex).toBe(2);

    act(() => {
      result.current.openShop(result.current.shops[0]);
    });

    expect(result.current.activeIndex).toBe(1);
    expect(result.current.selectedShopIntegrationId).toBe("shop_1");

    act(() => {
      result.current.goBackToList();
    });

    expect(result.current.activeIndex).toBe(0);
    expect(result.current.selectedShopIntegrationId).toBeNull();
  });

  it("refreshes the list and notifies on refresh failure", async () => {
    const error = new Error("Refresh failed.");
    refetchMock.mockRejectedValueOnce(error);

    const { result } = renderHook(() =>
      useShopifyIntegrationsPageController({}),
    );

    await expect(result.current.refreshList()).rejects.toThrow(error);
    expect(notifyErrorMock).toHaveBeenCalledWith("Refresh failed.");
  });

  it("submits the bare shop domain and redirects to the install url", async () => {
    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      assign: assignMock,
    });
    mutateAsyncMock.mockResolvedValueOnce({
      install_url: "https://install.example",
      shop_domain: "alpha.myshopify.com",
      expires_at: "2026-07-10T00:10:00+00:00",
    });

    const { result } = renderHook(() =>
      useShopifyIntegrationsPageController({}),
    );

    await act(async () => {
      await result.current.submitShopDomain("alpha.myshopify.com");
    });

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith("alpha.myshopify.com");
    });
    expect(assignMock).toHaveBeenCalledWith("https://install.example");
  });
});
