import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShopifyIntegrationCreateContainer } from "./ShopifyIntegrationCreateContainer";

describe("ShopifyIntegrationCreateContainer", () => {
  afterEach(() => {
    cleanup();
  });

  it("validates a blank shop domain before submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ShopifyIntegrationCreateContainer
        canCreate
        isSubmitting={false}
        onBack={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByTestId("shopify-create-submit"));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Shop domain is required.",
    );
  });

  it("submits the trimmed bare shop domain string", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ShopifyIntegrationCreateContainer
        canCreate
        isSubmitting={false}
        onBack={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(
      screen.getByTestId("shopify-shop-domain-input"),
      " alpha.myshopify.com ",
    );
    await user.click(screen.getByTestId("shopify-create-submit"));

    expect(onSubmit).toHaveBeenCalledWith("alpha.myshopify.com");
  });
});
