import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthRole } from "@beyo/auth";

import { useShopifyIntegrationPermissions } from "./use-shopify-integration-permissions";

type RoleValue = "admin" | "manager" | "worker" | "seller";

let currentRole: RoleValue = "admin";

vi.mock("@beyo/auth", () => {
  return {
    AuthRole: {
      Admin: "admin",
      Manager: "manager",
      Worker: "worker",
      Seller: "seller",
    },
    useRole: () => ({
      role: currentRole,
      workspaceRoleName: currentRole,
      workspaceSpecialization: null,
      hasRole: (value: RoleValue) => currentRole === value,
      hasSpecialization: () => false,
      isWorkspaceRole: () => false,
    }),
  };
});

describe("useShopifyIntegrationPermissions", () => {
  it.each([
    [
      AuthRole.Admin,
      {
        canViewShopifyIntegrations: true,
        canCreateShopifyInstallUrl: true,
        canCreateShopifyReauthorizeUrl: true,
        canDisconnectShopifyIntegration: true,
        canSyncShopifyWebhooksForShop: true,
        canViewShopifyWebhookHistory: true,
      },
    ],
    [
      AuthRole.Manager,
      {
        canViewShopifyIntegrations: true,
        canCreateShopifyInstallUrl: true,
        canCreateShopifyReauthorizeUrl: true,
        canDisconnectShopifyIntegration: false,
        canSyncShopifyWebhooksForShop: false,
        canViewShopifyWebhookHistory: true,
      },
    ],
    [
      AuthRole.Worker,
      {
        canViewShopifyIntegrations: false,
        canCreateShopifyInstallUrl: false,
        canCreateShopifyReauthorizeUrl: false,
        canDisconnectShopifyIntegration: false,
        canSyncShopifyWebhooksForShop: false,
        canViewShopifyWebhookHistory: false,
      },
    ],
    [
      AuthRole.Seller,
      {
        canViewShopifyIntegrations: false,
        canCreateShopifyInstallUrl: false,
        canCreateShopifyReauthorizeUrl: false,
        canDisconnectShopifyIntegration: false,
        canSyncShopifyWebhooksForShop: false,
        canViewShopifyWebhookHistory: false,
      },
    ],
  ])("returns the expected permission matrix for %s", (role, expected) => {
    currentRole = role;

    const { result } = renderHook(() => useShopifyIntegrationPermissions());

    expect(result.current).toEqual(expected);
  });
});
