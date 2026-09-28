import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StockMatchStatusRow } from "./StockMatchStatusRow";

afterEach(cleanup);

describe("StockMatchStatusRow", () => {
  it("says nothing at all when there is nothing to say", () => {
    const { container } = render(<StockMatchStatusRow state="idle" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows a spinner status while a check is in flight", () => {
    render(<StockMatchStatusRow state="checking" />);

    const row = screen.getByTestId("stock-match-status-row");
    expect(row).toHaveTextContent("Checking stock need match…");
    expect(row).toHaveAttribute("data-state", "checking");
    expect(row.tagName).toBe("P");
  });

  it("keeps a check in flight neutral — it is progress, not a warning", () => {
    render(<StockMatchStatusRow state="checking" />);

    const row = screen.getByTestId("stock-match-status-row");
    expect(row).not.toHaveClass("text-warning");
    expect(row).not.toHaveClass("text-destructive");
  });
});
