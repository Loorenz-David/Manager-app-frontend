import { describe, expect, it } from "vitest";

import {
  getShopifyMetadataPreviewEntries,
  resolveShopifyIntegrationEventSourceLabel,
} from "./shopify-history";

describe("shopify-history helpers", () => {
  it("maps integration event types to deterministic source labels", () => {
    expect(resolveShopifyIntegrationEventSourceLabel("webhook_received")).toBe(
      "Shopify webhook",
    );
    expect(resolveShopifyIntegrationEventSourceLabel("webhook_processed")).toBe(
      "Background worker",
    );
    expect(resolveShopifyIntegrationEventSourceLabel("webhook_sync")).toBe(
      "System",
    );
    expect(resolveShopifyIntegrationEventSourceLabel("disconnect")).toBe(
      "System",
    );
  });

  it("filters metadata to scalar preview rows and formats booleans", () => {
    expect(
      getShopifyMetadataPreviewEntries({
        topic: "orders/create",
        attempts: 3,
        retryable: true,
        nested: { ignored: true },
        list: ["ignored"],
        nullable: null,
        optional: undefined,
        raw_payload: "never render",
      }),
    ).toEqual([
      ["topic", "orders/create"],
      ["attempts", "3"],
      ["retryable", "Yes"],
    ]);
  });

  it("limits metadata preview rows to four items", () => {
    expect(
      getShopifyMetadataPreviewEntries({
        one: "1",
        two: "2",
        three: "3",
        four: "4",
        five: "5",
      }),
    ).toEqual([
      ["one", "1"],
      ["two", "2"],
      ["three", "3"],
      ["four", "4"],
    ]);
  });
});
