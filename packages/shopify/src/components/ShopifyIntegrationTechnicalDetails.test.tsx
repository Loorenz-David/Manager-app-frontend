import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShopifyIntegrationTechnicalDetails } from "./ShopifyIntegrationTechnicalDetails";

const SHOP = {
  client_id: "shop_1",
  workspace_id: "ws_1",
  shop_domain: "alpha.myshopify.com",
  shop_name: "Alpha",
  provider: "shopify" as const,
  status: "active" as const,
  access_token_expires_at: null,
  granted_scopes: [],
  requested_scopes: [],
  api_version: "2026-01",
  installed_at: "2026-07-01T10:00:00+00:00",
  uninstalled_at: null,
  last_connected_at: null,
  last_health_check_at: null,
  last_health_check_status: null,
  last_error_code: null,
  last_error_message: null,
  scopes_status: "up_to_date" as const,
  webhooks_status: "synced" as const,
  created_by: null,
  updated_by: null,
  created_at: "2026-07-01T10:00:00+00:00",
  updated_at: "2026-07-04T10:00:00+00:00",
  is_deleted: false,
};

describe("ShopifyIntegrationTechnicalDetails", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders known fields and uses fallbacks for null values", () => {
    render(<ShopifyIntegrationTechnicalDetails shop={SHOP} />);

    expect(screen.getByText("2026-01")).toBeInTheDocument();
    expect(screen.getByText("Unknown user")).toBeInTheDocument();
    expect(
      screen.getByTestId("shopify-detail-updated-by-fallback"),
    ).toBeInTheDocument();

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
