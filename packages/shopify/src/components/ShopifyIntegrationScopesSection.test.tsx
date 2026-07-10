import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShopifyIntegrationScopesSection } from "./ShopifyIntegrationScopesSection";

describe("ShopifyIntegrationScopesSection", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the outdated warning only when scopes are outdated", () => {
    const { rerender } = render(
      <ShopifyIntegrationScopesSection
        grantedScopes={["read_orders"]}
        requestedScopes={["read_orders", "read_products"]}
        scopesStatus="outdated"
      />,
    );

    expect(
      screen.getByText(
        "This shop's Shopify permissions are out of date. Reauthorizing will be available soon.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reauthorize/i }),
    ).not.toBeInTheDocument();

    rerender(
      <ShopifyIntegrationScopesSection
        grantedScopes={["read_orders"]}
        requestedScopes={["read_orders", "read_products"]}
        scopesStatus="up_to_date"
      />,
    );

    expect(
      screen.queryByText(/permissions are out of date/i),
    ).not.toBeInTheDocument();
  });
});
