import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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

  it("leaves an accepted mismatch visible and tappable", async () => {
    const onPress = vi.fn();
    render(
      <StockMatchStatusRow state="mismatch-accepted" onPress={onPress} />,
    );

    const row = screen.getByTestId("stock-match-status-row");
    expect(row).toHaveTextContent("Mismatch accepted");

    await userEvent.click(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
