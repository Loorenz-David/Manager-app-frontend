import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MATCH_WARNING_BANNER_CLASS } from "../../lib/stock-report-theme";
import { StockMatchStatusRow } from "./StockMatchStatusRow";

const BANNER_CLASSES = MATCH_WARNING_BANNER_CLASS.split(" ");

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

  it("wears the same amber banner as the sheet that armed the override", () => {
    render(<StockMatchStatusRow state="mismatch-accepted" onPress={vi.fn()} />);

    const row = screen.getByTestId("stock-match-status-row");
    for (const className of [...BANNER_CLASSES, "rounded-xl", "border"]) {
      expect(row).toHaveClass(className);
    }
  });

  it("keeps a check in flight neutral — it is progress, not a warning", () => {
    render(<StockMatchStatusRow state="checking" />);

    const row = screen.getByTestId("stock-match-status-row");
    for (const className of BANNER_CLASSES) {
      expect(row).not.toHaveClass(className);
    }
  });
});
