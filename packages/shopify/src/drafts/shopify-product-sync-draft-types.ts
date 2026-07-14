import { z } from "zod";
import {
  ShopifyProductSyncFormSchema,
  type ShopifyProductSyncFormValues,
} from "../types";

export const SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION = 1;

export const ShopifyProductSyncDraftRecordSchema = z.object({
  taskClientId: z.string().min(1),
  schemaVersion: z.number().int(),
  values: ShopifyProductSyncFormSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
});

export type ShopifyProductSyncDraftRecord = z.infer<
  typeof ShopifyProductSyncDraftRecordSchema
>;

export type { ShopifyProductSyncFormValues };
