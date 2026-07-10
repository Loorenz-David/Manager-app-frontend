import { AuthRole, useRole } from "@beyo/auth";

export function useShopifyIntegrationPermissions() {
  const { hasRole } = useRole();
  const isAdmin = hasRole(AuthRole.Admin);
  const isManager = hasRole(AuthRole.Manager);
  const canManage = isAdmin || isManager;

  return {
    canViewShopifyIntegrations: canManage,
    canCreateShopifyInstallUrl: canManage,
    canCreateShopifyReauthorizeUrl: canManage,
    canDisconnectShopifyIntegration: isAdmin,
    canSyncShopifyWebhooksForShop: isAdmin,
    canViewShopifyWebhookHistory: canManage,
  };
}
