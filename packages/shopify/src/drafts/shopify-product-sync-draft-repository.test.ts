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
  inventoryQuantities: [],
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
      updatedAt: "2020-01-01T00:00:00.000Z",
      expiresAt: "2020-01-01T00:00:00.000Z",
    });

    await deleteShopifyProductSyncDraft("task-2");
    expect(await getShopifyProductSyncDraft("task-2")).toBeNull();
    expect(await deleteExpiredShopifyProductSyncDrafts()).toBe(1);
    expect(await getShopifyProductSyncDraft("task-1")).toBeNull();
  });

  it("keeps drafts for two days after their last save", async () => {
    await saveShopifyProductSyncDraft({ taskClientId: "task-1", values });
    const record = await shopifyDraftsDb.productSyncDrafts.get("task-1");
    const lifetime =
      new Date(record!.expiresAt).getTime() -
      new Date(record!.updatedAt).getTime();
    expect(lifetime).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it("extends drafts saved with the old one-day expiry", async () => {
    const hour = 60 * 60 * 1000;
    const now = Date.now();
    const oldDraft = (taskClientId: string, savedHoursAgo: number) =>
      ({
        taskClientId,
        schemaVersion: SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION,
        values,
        createdAt: new Date(now - savedHoursAgo * hour).toISOString(),
        updatedAt: new Date(now - savedHoursAgo * hour).toISOString(),
        expiresAt: new Date(now - (savedHoursAgo - 24) * hour).toISOString(),
      }) satisfies ShopifyProductSyncDraftRecord;
    // Saved 30h ago: past its stored 1-day expiry, within the 2-day lifetime.
    await shopifyDraftsDb.productSyncDrafts.put(oldDraft("task-recent", 30));
    // Saved 50h ago: past both.
    await shopifyDraftsDb.productSyncDrafts.put(oldDraft("task-old", 50));

    expect(await deleteExpiredShopifyProductSyncDrafts()).toBe(1);
    await expect(getShopifyProductSyncDraft("task-recent")).resolves.toEqual(
      values,
    );
    await expect(getShopifyProductSyncDraft("task-old")).resolves.toBeNull();
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

  it("migrates version-one additive field names as absolute quantities", async () => {
    const now = new Date();
    await shopifyDraftsDb.productSyncDrafts.put({
      taskClientId: "task-legacy",
      schemaVersion: 1,
      values: {
        shopIntegrationIds: [],
        sku: "SKU-1",
        metafields: [],
        inventoryAdjustments: [
          {
            shopIntegrationId: "shop-1",
            locationId: "gid://shopify/Location/1",
            quantityToAdd: 0,
          },
        ],
        title: "Draft product",
        description: "Partial description",
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60_000).toISOString(),
    } as never);

    await expect(getShopifyProductSyncDraft("task-legacy")).resolves.toMatchObject({
      inventoryQuantities: [
        {
          shopIntegrationId: "shop-1",
          locationId: "gid://shopify/Location/1",
          quantity: 0,
        },
      ],
    });
    await expect(
      shopifyDraftsDb.productSyncDrafts.get("task-legacy"),
    ).resolves.toMatchObject({
      schemaVersion: SHOPIFY_PRODUCT_SYNC_DRAFT_SCHEMA_VERSION,
      values: {
        inventoryQuantities: [
          {
            shopIntegrationId: "shop-1",
            locationId: "gid://shopify/Location/1",
            quantity: 0,
          },
        ],
      },
    });
  });
});
