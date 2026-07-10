import { useNavigate } from "react-router-dom";
import { usePushSubscription } from "@beyo/notifications";
import {
  SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID,
  SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID,
  type ShopifyShopActionsSheetSurfaceProps,
  SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID,
  type ShopifyWebhookSubscriptionsSheetSurfaceProps,
  useShopifyIntegrationPermissions,
} from "@beyo/shopify";

import { useSignOutMutation } from "@beyo/auth";
import { useSurface } from "@/hooks/use-surface";
import { ROUTES } from "@/lib/routes";

import type { SettingsState } from "../types";

export type SettingsViewController = SettingsState;

export function useSettingsViewController(): SettingsViewController {
  const navigate = useNavigate();
  const surface = useSurface();
  const { mutate: signOutMutate, isPending } = useSignOutMutation();
  const {
    status: pushStatus,
    enable: enablePush,
    disable: disablePush,
    isLoading: isPushLoading,
  } = usePushSubscription();
  const permissions = useShopifyIntegrationPermissions();

  function signOut() {
    signOutMutate(undefined, {
      onSuccess: () => navigate(ROUTES.signIn, { replace: true }),
    });
  }

  function openShopifyIntegrations() {
    surface.open(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID, {
      surfaceOpeners: {
        closeSurface: () => surface.close(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID),
        openShopActions: (props: ShopifyShopActionsSheetSurfaceProps) =>
          surface.open(SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID, props),
        openWebhookSubscriptions: (
          props: ShopifyWebhookSubscriptionsSheetSurfaceProps,
        ) =>
          surface.open(SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID, props),
      },
    });
  }

  return {
    signOut,
    isSigningOut: isPending,
    pushStatus,
    isPushLoading,
    enablePush,
    disablePush,
    canViewShopifyIntegrations: permissions.canViewShopifyIntegrations,
    openShopifyIntegrations,
  };
}
