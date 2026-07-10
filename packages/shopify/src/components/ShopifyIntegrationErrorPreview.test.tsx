import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShopifyIntegrationErrorPreview } from "./ShopifyIntegrationErrorPreview";

describe("ShopifyIntegrationErrorPreview", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders current error details and a calm no-error state", () => {
    const { rerender } = render(
      <ShopifyIntegrationErrorPreview
        lastErrorCode="token_exchange_failed"
        lastErrorMessage="Token exchange failed."
      />,
    );

    expect(screen.getByText("token_exchange_failed")).toBeInTheDocument();
    expect(screen.getByText("Token exchange failed.")).toBeInTheDocument();

    rerender(
      <ShopifyIntegrationErrorPreview
        lastErrorCode={null}
        lastErrorMessage={null}
      />,
    );

    expect(screen.getByText("No current errors.")).toBeInTheDocument();
  });
});
