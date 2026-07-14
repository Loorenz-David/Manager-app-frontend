import { shopifyDraftsDb } from "./shopify-product-sync-draft-db";
import {
  SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION,
  ShopifyProductSyncDraftRecordSchema,
  type ShopifyProductSyncDraftRecord,
} from "./shopify-product-sync-draft-types";
import type { ShopifyProductSyncFormValues } from "../types";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type ShopifyProductSyncDraftErrorKind =
  | "unavailable"
  | "quota_exceeded"
  | "serialization_failed"
  | "unknown";

export class ShopifyProductSyncDraftError extends Error {
  readonly kind: ShopifyProductSyncDraftErrorKind;

  constructor(
    kind: ShopifyProductSyncDraftErrorKind,
    message: string,
  ) {
    super(message);
    this.kind = kind;
    this.name = "ShopifyProductSyncDraftError";
  }
}

function classifyError(error: unknown): ShopifyProductSyncDraftError {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    if (error.name === "QuotaExceededError") {
      return new ShopifyProductSyncDraftError(
        "quota_exceeded",
        "Storage is full.",
      );
    }
    return new ShopifyProductSyncDraftError(
      "unavailable",
      "Local storage is unavailable.",
    );
  }
  return new ShopifyProductSyncDraftError(
    "unknown",
    error instanceof Error ? error.message : "Unknown storage error.",
  );
}

export async function getShopifyProductSyncDraft(
  taskClientId: string,
): Promise<ShopifyProductSyncFormValues | null> {
  if (!taskClientId) return null;
  try {
    const record = await shopifyDraftsDb.productSyncDrafts.get(taskClientId);
    if (!record) return null;
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      await shopifyDraftsDb.productSyncDrafts.delete(taskClientId).catch(() => {});
      return null;
    }
    if (record.schemaVersion !== SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION) {
      await shopifyDraftsDb.productSyncDrafts.delete(taskClientId).catch(() => {});
      return null;
    }
    const parsed = ShopifyProductSyncDraftRecordSchema.safeParse(record);
    if (!parsed.success) {
      await shopifyDraftsDb.productSyncDrafts.delete(taskClientId).catch(() => {});
      return null;
    }
    return parsed.data.values;
  } catch {
    return null;
  }
}

export async function saveShopifyProductSyncDraft(input: {
  taskClientId: string;
  values: ShopifyProductSyncFormValues;
}): Promise<void> {
  if (!input.taskClientId) return;
  try {
    const existing = await shopifyDraftsDb.productSyncDrafts.get(input.taskClientId);
    const now = new Date();
    const record: ShopifyProductSyncDraftRecord = {
      taskClientId: input.taskClientId,
      schemaVersion: SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION,
      values: input.values,
      createdAt: existing?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + DRAFT_TTL_MS).toISOString(),
    };
    await shopifyDraftsDb.productSyncDrafts.put(record);
    await deleteExpiredShopifyProductSyncDrafts().catch(() => {});
  } catch (error) {
    throw classifyError(error);
  }
}

export async function deleteShopifyProductSyncDraft(
  taskClientId: string,
): Promise<void> {
  if (!taskClientId) return;
  await shopifyDraftsDb.productSyncDrafts.delete(taskClientId).catch(() => {});
}

export async function deleteExpiredShopifyProductSyncDrafts(
  now: Date = new Date(),
): Promise<number> {
  try {
    const expiredKeys = await shopifyDraftsDb.productSyncDrafts
      .where("expiresAt")
      .below(now.toISOString())
      .primaryKeys();
    if (!expiredKeys.length) return 0;
    await shopifyDraftsDb.productSyncDrafts.bulkDelete(expiredKeys);
    return expiredKeys.length;
  } catch {
    return 0;
  }
}
