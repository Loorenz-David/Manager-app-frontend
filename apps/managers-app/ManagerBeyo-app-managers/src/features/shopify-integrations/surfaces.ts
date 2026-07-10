import {
  loadShopifyIntegrationsSlidePage,
  SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID,
  loadShopifyShopActionsSheetPage,
  SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID,
  loadShopifyWebhookSubscriptionsSheetPage,
  SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID,
} from "@beyo/shopify";
import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";

const shopifyIntegrationsSlide = lazyWithPreload(
  loadShopifyIntegrationsSlidePage,
);
const shopifyShopActionsSheet = lazyWithPreload(
  loadShopifyShopActionsSheetPage,
);
const shopifyWebhookSubscriptionsSheet = lazyWithPreload(
  loadShopifyWebhookSubscriptionsSheetPage,
);

export const shopifyIntegrationsSurfaces: SurfaceRegistrations = {
  [SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: shopifyIntegrationsSlide.Component,
  },
  [SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: shopifyShopActionsSheet.Component,
  },
  [SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: shopifyWebhookSubscriptionsSheet.Component,
  },
};
