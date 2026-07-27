import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ShopifyCustomerStatusPill } from "./ShopifyCustomerStatusPill";

describe("ShopifyCustomerStatusPill", () => {
  it("renders nothing while idle", () => {
    const { container } = render(
      <ShopifyCustomerStatusPill onRetry={vi.fn()} status="idle" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["loading", "Looking up Shopify customer"],
    ["found", "Shopify customer"],
  ] as const)("keeps the %s state passive", (status, label) => {
    render(<ShopifyCustomerStatusPill onRetry={vi.fn()} status={status} />);

    expect(screen.getByText(label)).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders an accessible retry action with the RotateCcw icon", () => {
    const onRetry = vi.fn();
    render(
      <ShopifyCustomerStatusPill
        onRetry={onRetry}
        status="not_found"
      />,
    );

    const retryButton = screen.getByRole("button", {
      name: "Retry Shopify customer lookup",
    });
    expect(retryButton).toHaveAttribute("type", "button");
    expect(retryButton).toHaveAttribute(
      "data-testid",
      "shopify-customer-retry-button",
    );
    expect(screen.getByTestId("state-pill-icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
