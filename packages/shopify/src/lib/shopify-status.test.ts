import { describe, expect, it } from "vitest";

import {
  shopifyIntegrationEventSeverityLabel,
  shopifyIntegrationEventSeverityVariant,
  shopifyIntegrationEventTypeLabel,
  shopifyIntegrationStatusLabel,
  shopifyIntegrationStatusVariant,
  shopifyScopesStatusLabel,
  shopifyScopesStatusVariant,
  shopifyWebhookIntakeStatusLabel,
  shopifyWebhookIntakeStatusVariant,
  shopifyWebhookSubscriptionStatusLabel,
  shopifyWebhookSubscriptionStatusVariant,
} from "./shopify-status";

describe("shopify-status helpers", () => {
  it("maps integration statuses to labels and variants", () => {
    expect(shopifyIntegrationStatusLabel("active")).toBe("Active");
    expect(shopifyIntegrationStatusVariant("error")).toBe("danger");
  });

  it("maps scopes statuses to labels and variants", () => {
    expect(shopifyScopesStatusLabel("up_to_date")).toBe("Up to date");
    expect(shopifyScopesStatusVariant("outdated")).toBe("warning");
  });

  it("maps webhook subscription statuses to labels and variants", () => {
    expect(shopifyWebhookSubscriptionStatusLabel("failed")).toBe("Failed");
    expect(shopifyWebhookSubscriptionStatusVariant("active")).toBe("success");
    expect(shopifyWebhookSubscriptionStatusVariant("removed")).toBe("neutral");
  });

  it("maps webhook intake statuses to labels and variants", () => {
    expect(shopifyWebhookIntakeStatusLabel("received")).toBe("Received");
    expect(shopifyWebhookIntakeStatusVariant("processed")).toBe("success");
    expect(shopifyWebhookIntakeStatusVariant("failed")).toBe("danger");
  });

  it("maps integration event severities and event types", () => {
    expect(shopifyIntegrationEventSeverityLabel("warning")).toBe("Warning");
    expect(shopifyIntegrationEventSeverityVariant("error")).toBe("danger");
    expect(shopifyIntegrationEventTypeLabel("disconnect")).toBe(
      "Disconnected",
    );
  });
});
