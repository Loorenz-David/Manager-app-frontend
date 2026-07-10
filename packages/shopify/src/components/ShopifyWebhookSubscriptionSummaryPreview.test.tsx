import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShopifyWebhookSubscriptionSummaryPreview } from "./ShopifyWebhookSubscriptionSummaryPreview";

describe("ShopifyWebhookSubscriptionSummaryPreview", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the summary grid trigger without inline subscription rows", () => {
    render(
      <ShopifyWebhookSubscriptionSummaryPreview
        summary={{
          total: 6,
          active: 3,
          failed: 1,
          pending: 1,
          disabled: 1,
          removed: 0,
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Webhook subscriptions/i }),
    ).toBeDisabled();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.queryByTestId("shopify-webhook-preview-item"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("orders/create")).not.toBeInTheDocument();
    expect(screen.queryByText(/\+\d+ more subscription/i)).not.toBeInTheDocument();
  });

  it("opens the subscriptions sheet when tapped", async () => {
    const user = userEvent.setup();
    const onOpenSubscriptions = vi.fn();

    render(
      <ShopifyWebhookSubscriptionSummaryPreview
        summary={{
          total: 1,
          active: 0,
          failed: 1,
          pending: 0,
          disabled: 0,
          removed: 0,
        }}
        onOpenSubscriptions={onOpenSubscriptions}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /Webhook subscriptions/i,
    });
    expect(trigger).toBeEnabled();

    await user.click(trigger);

    expect(onOpenSubscriptions).toHaveBeenCalledTimes(1);
  });
});
