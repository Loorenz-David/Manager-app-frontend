import { z } from "zod";
import {
  ShopifyProductSyncFormSchema,
  type ShopifyProductSyncFormValues,
} from "../types";

export const SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION = 2;

const ShopifyProductSyncDraftValuesSchema = z.preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const values = value as Record<string, unknown>;
    if ("inventoryAdjustments" in values && !("inventoryQuantities" in values)) {
      const legacyAdjustments = Array.isArray(values.inventoryAdjustments)
        ? values.inventoryAdjustments
        : [];
      return {
        ...values,
        inventoryQuantities: legacyAdjustments.map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return entry;
          }
          const adjustment = entry as Record<string, unknown>;
          return {
            shopIntegrationId: adjustment.shopIntegrationId,
            locationId: adjustment.locationId,
            quantity: adjustment.quantityToAdd,
          };
        }),
      };
    }
    if (!("inventoryQuantities" in values)) {
      return { ...values, inventoryQuantities: [] };
    }
  }
  return value;
}, ShopifyProductSyncFormSchema);

export const ShopifyProductSyncDraftRecordSchema = z.preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (record.schemaVersion === 1) {
      return {
        ...record,
        schemaVersion: SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION,
      };
    }
  }
  return value;
}, z.object({
  taskClientId: z.string().min(1),
  schemaVersion: z.literal(SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION),
  values: ShopifyProductSyncDraftValuesSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
}));

export type ShopifyProductSyncDraftRecord = z.infer<
  typeof ShopifyProductSyncDraftRecordSchema
>;

export type { ShopifyProductSyncFormValues };
