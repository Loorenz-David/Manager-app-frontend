import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShopifyWebhookHistoryRecordCard } from "./ShopifyWebhookHistoryRecordCard";

const WEBHOOK_INTAKE_RECORD = {
  record_type: "webhook_intake" as const,
  client_id: "hist_intake_1",
  shop_integration_id: "shop_1",
  shop_domain: "alpha.myshopify.com",
  topic: "orders/create",
  webhook_id: "wh_1",
  status: "failed" as const,
  retryable: true,
  attempts: 2,
  received_at: "2026-07-01T10:00:00+00:00",
  processing_started_at: "2026-07-01T10:00:02+00:00",
  processed_at: null,
  last_error: "Timed out",
  created_at: "2026-07-01T10:00:00+00:00",
  updated_at: "2026-07-01T10:00:03+00:00",
};

const INTEGRATION_EVENT_RECORD = {
  record_type: "integration_event" as const,
  client_id: "hist_evt_1",
  shop_integration_id: "shop_1",
  event_type: "webhook_received" as const,
  severity: "warning" as const,
  message: "Webhook was queued for processing.",
  metadata_json: {
    topic: "orders/create",
    retryable: false,
    nested: { ignored: true },
    array_value: ["ignored"],
    raw_payload: "never render",
  },
  created_by: {
    client_id: "user_1",
    username: "Alice",
    profile_picture: null,
  },
  created_at: "2026-07-01T10:05:00+00:00",
};

describe("ShopifyWebhookHistoryRecordCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a webhook intake record card without raw payload content", () => {
    render(<ShopifyWebhookHistoryRecordCard record={WEBHOOK_INTAKE_RECORD} />);

    expect(
      screen.getByTestId("shopify-webhook-intake-record-card"),
    ).toBeInTheDocument();
    expect(screen.getByText("orders/create")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Webhook ID wh_1")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("Timed out")).toBeInTheDocument();
    expect(screen.queryByText(/raw_payload/i)).not.toBeInTheDocument();
  });

  it("renders an integration event record card with a created-by user pill", () => {
    render(
      <ShopifyWebhookHistoryRecordCard record={INTEGRATION_EVENT_RECORD} />,
    );

    expect(
      screen.getByTestId("shopify-integration-event-record-card"),
    ).toBeInTheDocument();
    expect(screen.getByText("Webhook received")).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText("Webhook was queued for processing.")).toBeInTheDocument();
    expect(
      screen.getByTestId("shopify-integration-event-created-by-pill"),
    ).toHaveTextContent("Alice");
    expect(
      screen.getByTestId("shopify-webhook-metadata-preview"),
    ).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.queryByText("raw_payload")).not.toBeInTheDocument();
    expect(screen.queryByText("never render")).not.toBeInTheDocument();
  });

  it("renders a deterministic system fallback when created_by is null", () => {
    render(
      <ShopifyWebhookHistoryRecordCard
        record={{
          ...INTEGRATION_EVENT_RECORD,
          event_type: "webhook_processed",
          created_by: null,
        }}
      />,
    );

    expect(
      screen.getByTestId("shopify-integration-event-created-by-fallback"),
    ).toHaveTextContent("Background worker");
    expect(screen.queryByText("Unknown user")).not.toBeInTheDocument();
  });
});
