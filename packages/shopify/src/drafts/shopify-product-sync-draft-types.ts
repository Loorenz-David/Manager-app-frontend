import { z } from "zod";
import {
  ShopifyProductSyncFormSchema,
  type ShopifyProductSyncFormValues,
} from "../types";

export const SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION = 1;

const ShopifyProductSyncDraftValuesSchema = z.preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const values = value as Record<string, unknown>;
    if (!("inventoryAdjustments" in values)) {
      return { ...values, inventoryAdjustments: [] };
    }
  }
  return value;
}, ShopifyProductSyncFormSchema);

export const ShopifyProductSyncDraftRecordSchema = z.object({
  taskClientId: z.string().min(1),
  schemaVersion: z.number().int(),
  values: ShopifyProductSyncDraftValuesSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
});

export type ShopifyProductSyncDraftRecord = z.infer<
  typeof ShopifyProductSyncDraftRecordSchema
>;

export type { ShopifyProductSyncFormValues };
