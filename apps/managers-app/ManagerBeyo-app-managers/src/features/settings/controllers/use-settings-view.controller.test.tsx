import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestWrapper } from "../../../test-utils/query-client";

import { useSettingsViewController } from "./use-settings-view.controller";

const navigateMock = vi.fn();
const openMock = vi.fn();
const closeMock = vi.fn();
const signOutMutateMock = vi.fn();
const signOutStateMock = vi.fn(() => ({ isPending: false, isError: false }));
const enablePushMock = vi.fn();
const disablePushMock = vi.fn();
const useShopifyIntegrationPermissionsMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@beyo/auth", () => ({
  SIGN_OUT_FAILED_MESSAGE: "Couldn't sign out — try again",
  useSignOutMutation: () => ({
    mutate: signOutMutateMock,
    ...signOutStateMock(),
  }),
}));

vi.mock("@beyo/notifications", () => ({
  usePushSubscription: () => ({
    status: "unregistered",
    enable: enablePushMock,
    disable: disablePushMock,
    isLoading: false,
  }),
}));

vi.mock("@beyo/shopify", () => ({
  SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID: "shopify-integrations-slide",
  SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID: "shopify-shop-actions-sheet",
  SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID:
    "shopify-webhook-subscriptions-sheet",
  useShopifyIntegrationPermissions: () => useShopifyIntegrationPermissionsMock(),
}));

vi.mock("@/hooks/use-surface", () => ({
  useSurface: () => ({
    open: openMock,
    close: closeMock,
  }),
}));

describe("useSettingsViewController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOutStateMock.mockReturnValue({ isPending: false, isError: false });
    useShopifyIntegrationPermissionsMock.mockReturnValue({
      canViewShopifyIntegrations: true,
    });
  });

  it("exposes the Shopify settings entry when the viewer has permission", () => {
    const { result } = renderHook(() => useSettingsViewController(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.canViewShopifyIntegrations).toBe(true);

    result.current.openShopifyIntegrations();

    expect(openMock).toHaveBeenCalledWith("shopify-integrations-slide", {
      surfaceOpeners: {
        closeSurface: expect.any(Function),
        openShopActions: expect.any(Function),
        openWebhookSubscriptions: expect.any(Function),
      },
    });

    const openArgs = openMock.mock.calls[0]?.[1];
    openArgs.surfaceOpeners.closeSurface();

    expect(closeMock).toHaveBeenCalledWith("shopify-integrations-slide");

    openArgs.surfaceOpeners.openShopActions({
      shopIntegrationId: "shop_1",
    });

    expect(openMock).toHaveBeenLastCalledWith("shopify-shop-actions-sheet", {
      shopIntegrationId: "shop_1",
    });

    openArgs.surfaceOpeners.openWebhookSubscriptions({
      shopIntegrationId: "shop_2",
    });

    expect(openMock).toHaveBeenLastCalledWith(
      "shopify-webhook-subscriptions-sheet",
      {
        shopIntegrationId: "shop_2",
      },
    );
  });

  it("hides the Shopify settings entry when the viewer lacks permission", () => {
    useShopifyIntegrationPermissionsMock.mockReturnValue({
      canViewShopifyIntegrations: false,
    });

    const { result } = renderHook(() => useSettingsViewController(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.canViewShopifyIntegrations).toBe(false);
  });

  it("navigates to sign-in only when the sign-out succeeded", () => {
    const { result } = renderHook(() => useSettingsViewController(), {
      wrapper: createTestWrapper(),
    });

    result.current.signOut();

    const callbacks = signOutMutateMock.mock.calls[0]?.[1];
    expect(callbacks).toEqual({ onSuccess: expect.any(Function) });
    expect(navigateMock).not.toHaveBeenCalled();
    callbacks.onSuccess();
    expect(navigateMock).toHaveBeenCalledWith("/sign-in", { replace: true });
  });

  it("surfaces a failed sign-out as an error message", () => {
    const { result, rerender } = renderHook(() => useSettingsViewController(), {
      wrapper: createTestWrapper(),
    });
    expect(result.current.signOutError).toBeNull();

    signOutStateMock.mockReturnValue({ isPending: false, isError: true });
    rerender();

    expect(result.current.signOutError).toBe("Couldn't sign out — try again");
  });
});
