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

describe("StockMatchWarningSheetContent — property mismatch", () => {
  function renderMismatch(onChangeItem = vi.fn()) {
    render(
      <StockMatchWarningSheetContent
        failures={stockMatchFailuresFixture}
        kind="mismatch"
        onChangeItem={onChangeItem}
      />,
    );
    return screen.getByTestId("stock-match-warning-failures");
  }

  it("names the three columns it is comparing", () => {
    const block = renderMismatch();

    for (const heading of ["Property", "Asked", "Item"]) {
      expect(within(block).getByText(heading)).toBeInTheDocument();
    }
  });

  it("gives every failure one row, and nothing for criteria that matched", () => {
    const block = renderMismatch();

    expect(within(block).getAllByRole("listitem")).toHaveLength(
      stockMatchFailuresFixture.length,
    );
  });

  it("shows what was asked beside what the item has, per criterion", () => {
    renderMismatch();

    for (const row of stockMatchFailuresFixture) {
      expect(
        screen.getByTestId(`stock-match-failure-row-${row.key}`),
      ).toHaveTextContent(row.label);
      expect(
        screen.getByTestId(`stock-match-failure-asked-${row.key}`),
      ).toHaveTextContent(row.asked);
      expect(
        screen.getByTestId(`stock-match-failure-item-${row.key}`),
      ).toHaveTextContent(row.item);
    }
  });

  it("reads an em dash out as an absent value, not as an unlabelled cell", () => {
    renderMismatch();

    expect(
      screen.getByTestId("stock-match-failure-item-upholstery"),
    ).toHaveAccessibleName("No value");
    expect(
      screen.getByTestId("stock-match-failure-asked-wood_group"),
    ).not.toHaveAccessibleName("No value");
  });

  it("does not dress a malformed criterion up as one that accepts nothing", () => {
    renderMismatch();

    const asked = screen.getByTestId("stock-match-failure-asked-finish");
    expect(asked).toHaveTextContent("Invalid criterion");
    expect(
      screen.getByTestId("stock-match-failure-item-wood_type"),
    ).toHaveTextContent("No known group: Teak");
  });

  /** Owner, 2026-09-28: the mismatch is a block, corrected in the purchase app. */
  it("is a block: it says where to fix the properties and offers no Continue", async () => {
    const onChangeItem = vi.fn();
    renderMismatch(onChangeItem);

    const sheet = screen.getByTestId("stock-match-warning-mismatch");
    expect(sheet).toHaveTextContent("This item cannot be added");
    expect(sheet).toHaveTextContent("purchase app");
    expect(screen.queryByTestId("stock-match-continue")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stock-match-warning-banner")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("stock-match-change-item"));

    expect(onChangeItem).toHaveBeenCalledTimes(1);
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
