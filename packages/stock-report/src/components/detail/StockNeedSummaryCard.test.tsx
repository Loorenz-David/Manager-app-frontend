import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StockNeedSummaryCard, missingSourceLine } from "./StockNeedSummaryCard";

afterEach(cleanup);

const quantities = { requested: 10, fulfilled: 2, inProgress: 1, inQueue: 1, missing: 3 };
const base = { title: "Dining chair", imageUrl: null, propertyTags: [], quantities };

describe("StockNeedSummaryCard source lines", () => {
  it("shows nothing extra for a board row on Scanner's value", () => {
    render(<StockNeedSummaryCard {...base} requestedSource="scanner" requestedScanner={10} missingSource="own" activeMissing={3} />);
    expect(screen.queryByTestId("stock-report-summary-requested-source")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stock-report-summary-missing-source")).not.toBeInTheDocument();
  });

  /** v8 §6.6: a manual value names Scanner's beside it, on the board and on a draft alike. */
  it("names Scanner's value under a requested count typed by hand", () => {
    render(<StockNeedSummaryCard {...base} requestedSource="manual" requestedScanner={7} />);
    expect(screen.getByTestId("stock-report-summary-requested-source")).toHaveTextContent("requested by hand · Scanner says 7");
  });

  /** v9 §0.1 item 10: on a draft, where the missing count comes from — and, under a typed one, what the board says. */
  it("says where a draft's missing count comes from, and only on a draft", () => {
    render(<StockNeedSummaryCard {...base} isDraft missingSource="active" activeMissing={3} />);
    expect(screen.getByTestId("stock-report-summary-missing-source")).toHaveTextContent("3 missing on the live version");

    cleanup();
    render(<StockNeedSummaryCard {...base} isDraft missingSource="own" activeMissing={5} />);
    expect(screen.getByTestId("stock-report-summary-missing-source")).toHaveTextContent("3 missing in this draft · board says 5");

    cleanup();
    render(<StockNeedSummaryCard {...base} isDraft missingSource="none" activeMissing={null} />);
    expect(screen.queryByTestId("stock-report-summary-missing-source")).not.toBeInTheDocument();

    cleanup();
    render(<StockNeedSummaryCard {...base} missingSource="active" activeMissing={3} />);
    expect(screen.queryByTestId("stock-report-summary-missing-source")).not.toBeInTheDocument();
  });

  it("words the missing source without a board count when the board has none", () => {
    expect(missingSourceLine("own", null)).toBe("missing in this draft");
    expect(missingSourceLine("own", 0)).toBe("missing in this draft · board says 0");
    expect(missingSourceLine("active", 4)).toBe("missing on the live version");
    expect(missingSourceLine("none", null)).toBeNull();
  });
});
