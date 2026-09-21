import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  stockMatchBlockedReasonFixture,
  stockMatchFailuresFixture,
} from "../../fixtures/stock-report-fixtures";
import { StockMatchWarningSheetContent } from "./StockMatchWarningSheetContent";

afterEach(cleanup);

describe("StockMatchWarningSheetContent — blocked", () => {
  it("shows the reason it was given and the single way out", () => {
    const onChangeItem = vi.fn();
    render(
      <StockMatchWarningSheetContent
        kind="blocked"
        reasonText={stockMatchBlockedReasonFixture}
        onChangeItem={onChangeItem}
      />,
    );

    expect(screen.getByTestId("stock-match-warning-blocked")).toHaveTextContent(
      stockMatchBlockedReasonFixture,
    );
    expect(screen.getByTestId("stock-match-change-item")).toBeInTheDocument();
    expect(
      screen.queryByTestId("stock-match-continue"),
    ).not.toBeInTheDocument();
  });

  it("reports the way out", async () => {
    const onChangeItem = vi.fn();
    render(
      <StockMatchWarningSheetContent
        kind="blocked"
        reasonText={stockMatchBlockedReasonFixture}
        onChangeItem={onChangeItem}
      />,
    );

    await userEvent.click(screen.getByTestId("stock-match-change-item"));

    expect(onChangeItem).toHaveBeenCalledTimes(1);
  });
});

describe("StockMatchWarningSheetContent — soft warning", () => {
  it("lists every failure it was handed, with both its lines", () => {
    render(
      <StockMatchWarningSheetContent
        failures={stockMatchFailuresFixture}
        kind="warning"
        onChangeItem={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    const list = screen.getByTestId("stock-match-warning-failures");
    expect(within(list).getAllByRole("listitem")).toHaveLength(
      stockMatchFailuresFixture.length,
    );

    for (const failure of stockMatchFailuresFixture) {
      expect(within(list).getByText(failure.label)).toBeInTheDocument();
      expect(within(list).getByText(failure.explanation)).toBeInTheDocument();
    }
  });

  it("offers both ways out and never overrides on its own", async () => {
    const onContinue = vi.fn();
    const onChangeItem = vi.fn();
    render(
      <StockMatchWarningSheetContent
        failures={stockMatchFailuresFixture}
        kind="warning"
        onChangeItem={onChangeItem}
        onContinue={onContinue}
      />,
    );

    expect(onContinue).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("stock-match-continue"));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onChangeItem).not.toHaveBeenCalled();
  });
});

describe("StockMatchWarningSheetContent — the stored-item note", () => {
  it("says so when the backend judged the item already registered", () => {
    render(
      <StockMatchWarningSheetContent
        checkedAgainstStoredItem
        kind="blocked"
        reasonText={stockMatchBlockedReasonFixture}
        onChangeItem={vi.fn()}
      />,
    );

    expect(screen.getByTestId("stock-match-stored-note")).toHaveTextContent(
      "Checked against the item already registered.",
    );
  });

  it("says nothing when the check ran on what the form sent", () => {
    render(
      <StockMatchWarningSheetContent
        kind="blocked"
        reasonText={stockMatchBlockedReasonFixture}
        onChangeItem={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId("stock-match-stored-note"),
    ).not.toBeInTheDocument();
  });
});
