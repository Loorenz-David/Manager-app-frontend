export const SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID =
  "shopify-integrations-slide";
export const SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID =
  "shopify-shop-actions-sheet";
export const SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID =
  "shopify-webhook-subscriptions-sheet";
export const SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID = "shopify-product-sync-slide";
export const SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID = "shopify-shop-picker-sheet";
import type { ShopifyProductSyncFormMode } from "./types";
export type ShopifyShopPickerSheetSurfaceProps = { selectedShopIntegrationIds: string[]; onConfirm: (selectedShopIntegrationIds: string[]) => void };
export type ShopifyProductSyncSurfaceOpeners = { openShopPicker?: (props: ShopifyShopPickerSheetSurfaceProps) => void };
export type ShopifyProductSyncSlideSurfaceProps = { itemClientId: string; itemArticleNumber?: string | null; itemSku?: string | null; itemCategoryId?: string | null; productCategory?: string | null; defaultTitle?: string | null; taskClientId: string; mode?: ShopifyProductSyncFormMode; surfaceOpeners?: ShopifyProductSyncSurfaceOpeners; onCompleted?: () => void; onSkipped?: () => void; onKept?: () => void };

export type ShopifyShopActionsSheetSurfaceProps = {
  shopIntegrationId: string;
};

export type ShopifyWebhookSubscriptionsSheetSurfaceProps = {
  shopIntegrationId: string;
};

export type ShopifyIntegrationsSurfaceOpeners = {
  closeSurface?: () => void;
  openShopActions?: (props: ShopifyShopActionsSheetSurfaceProps) => void;
  openWebhookSubscriptions?: (
    props: ShopifyWebhookSubscriptionsSheetSurfaceProps,
  ) => void;
};

export type ShopifyIntegrationsSlideSurfaceProps = {
  surfaceOpeners?: ShopifyIntegrationsSurfaceOpeners;
};
