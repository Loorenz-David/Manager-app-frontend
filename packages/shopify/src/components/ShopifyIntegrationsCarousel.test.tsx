import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShopifyIntegrationsCarousel } from "./ShopifyIntegrationsCarousel";

describe("ShopifyIntegrationsCarousel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the three-pane shell with the expected transform and no horizontal padding on the root", () => {
    render(
      <ShopifyIntegrationsCarousel
        activeIndex={2}
        createPane={<div>Create</div>}
        detailPane={<div>Detail</div>}
        listPane={<div>List</div>}
      />,
    );

    const root = screen.getByTestId("shopify-integrations-carousel");

    expect(root).toHaveClass("h-full", "overflow-hidden");
    expect(root.className).not.toMatch(/\bpx-\d+/);
    expect(root.firstElementChild).toHaveStyle({
      transform: "translateX(-66.666666%)",
    });
  });
});
