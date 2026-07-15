import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shopifyDraftsDb } from "./shopify-product-sync-draft-db";
import {
  deleteExpiredShopifyProductSyncDrafts,
  deleteShopifyProductSyncDraft,
  getShopifyProductSyncDraft,
  saveShopifyProductSyncDraft,
} from "./shopify-product-sync-draft-repository";
import {
  SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION,
  type ShopifyProductSyncDraftRecord,
} from "./shopify-product-sync-draft-types";
import type { ShopifyProductSyncFormValues } from "../types";

const values: ShopifyProductSyncFormValues = {
  shopIntegrationIds: [],
  sku: "SKU-1",
  metafields: [],
  inventoryAdjustments: [],
  title: "Draft product",
  description: "Partial description",
};

describe("shopify product sync draft repository", () => {
  beforeEach(async () => {
    await shopifyDraftsDb.productSyncDrafts.clear();
  });

  afterEach(async () => {
    await shopifyDraftsDb.productSyncDrafts.clear();
  });

  it("saves and reads drafts by task", async () => {
    await saveShopifyProductSyncDraft({ taskClientId: "task-1", values });

    await expect(getShopifyProductSyncDraft("task-1")).resolves.toEqual(values);
    await expect(getShopifyProductSyncDraft("task-2")).resolves.toBeNull();
  });

  it("overwrites a task draft without mixing another task", async () => {
    await saveShopifyProductSyncDraft({ taskClientId: "task-1", values });
    await saveShopifyProductSyncDraft({
      taskClientId: "task-2",
      values: { ...values, sku: "SKU-2" },
    });

    await expect(
      saveShopifyProductSyncDraft({
        taskClientId: "task-1",
        values: { ...values, sku: "SKU-1-updated" },
      }),
    ).resolves.toBeUndefined();
    await expect(getShopifyProductSyncDraft("task-1")).resolves.toMatchObject({
      sku: "SKU-1-updated",
    });
    await expect(getShopifyProductSyncDraft("task-2")).resolves.toMatchObject({
      sku: "SKU-2",
    });
  });

  it("deletes only the requested task and sweeps expired records", async () => {
    await saveShopifyProductSyncDraft({ taskClientId: "task-1", values });
    await saveShopifyProductSyncDraft({ taskClientId: "task-2", values });
    await shopifyDraftsDb.productSyncDrafts.update("task-1", {
      expiresAt: "2020-01-01T00:00:00.000Z",
    });

    await deleteShopifyProductSyncDraft("task-2");
    expect(await getShopifyProductSyncDraft("task-2")).toBeNull();
    expect(await deleteExpiredShopifyProductSyncDrafts()).toBe(1);
    expect(await getShopifyProductSyncDraft("task-1")).toBeNull();
  });

  it("removes malformed records instead of restoring them", async () => {
    await shopifyDraftsDb.productSyncDrafts.put({
      taskClientId: "task-1",
      schemaVersion: SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION,
      values: { ...values, metafields: "not-an-array" } as never,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    } satisfies ShopifyProductSyncDraftRecord);

    await expect(getShopifyProductSyncDraft("task-1")).resolves.toBeNull();
    expect(await shopifyDraftsDb.productSyncDrafts.get("task-1")).toBeUndefined();
  });
});
