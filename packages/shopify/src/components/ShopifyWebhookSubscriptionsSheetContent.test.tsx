import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShopifyWebhookSubscriptionsSheetContent } from "./ShopifyWebhookSubscriptionsSheetContent";

describe("ShopifyWebhookSubscriptionsSheetContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the summary grid and full uncapped subscription list", () => {
    render(
      <ShopifyWebhookSubscriptionsSheetContent
        summary={{
          total: 6,
          active: 4,
          failed: 1,
          pending: 0,
          disabled: 1,
          removed: 0,
        }}
        subscriptions={[
          {
            client_id: "sub_1",
            workspace_id: "ws_1",
            shop_integration_id: "shop_1",
            topic: "orders/create",
            callback_url: "https://example.com/webhooks",
            remote_subscription_id: "gid://shopify/WebhookSubscription/1",
            payload_format: "json",
            required_scopes: ["read_orders"],
            status: "failed",
            installed_at: "2026-07-01T10:05:00+00:00",
            last_verified_at: null,
            last_install_attempt_at: null,
            last_error_code: "webhook_failed",
            last_error_message: null,
            created_at: "2026-07-01T10:05:00+00:00",
            updated_at: "2026-07-01T10:05:00+00:00",
          },
          {
            client_id: "sub_2",
            workspace_id: "ws_1",
            shop_integration_id: "shop_1",
            topic: "orders/updated",
            callback_url: "https://example.com/webhooks",
            remote_subscription_id: "gid://shopify/WebhookSubscription/2",
            payload_format: "json",
            required_scopes: ["read_orders"],
            status: "active",
            installed_at: "2026-07-02T10:05:00+00:00",
            last_verified_at: null,
            last_install_attempt_at: null,
            last_error_code: null,
            last_error_message: null,
            created_at: "2026-07-02T10:05:00+00:00",
            updated_at: "2026-07-02T10:05:00+00:00",
          },
        ]}
      />,
    );

    expect(
      screen.getByTestId("shopify-webhook-subscriptions-sheet"),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("shopify-webhook-subscription-item")).toHaveLength(
      2,
    );
    expect(screen.getByText("orders/create")).toBeInTheDocument();
    expect(screen.getByText("orders/updated")).toBeInTheDocument();
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.getByText("Error: webhook_failed")).toBeInTheDocument();
  });

  it("renders an empty state when there are no subscriptions", () => {
    render(
      <ShopifyWebhookSubscriptionsSheetContent
        summary={{
          total: 0,
          active: 0,
          failed: 0,
          pending: 0,
          disabled: 0,
          removed: 0,
        }}
        subscriptions={[]}
      />,
    );

    expect(
      screen.getByText("No webhook subscriptions yet."),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("shopify-webhook-subscription-item"),
    ).not.toBeInTheDocument();
  });
});
