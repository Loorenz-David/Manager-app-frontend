import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stockNeedPartiallyFulfilledFixture } from "../../fixtures/stock-report-fixtures";
import { StockNeedCard } from "./StockNeedCard";

afterEach(cleanup);

const CARD = stockNeedPartiallyFulfilledFixture;
const ID = CARD.stockNeedId;

describe("StockNeedCard", () => {
  it("shows the goal quantity, the title and the criteria, and no priority", () => {
    render(<StockNeedCard card={CARD} />);

    expect(screen.getByTestId(`stock-need-card-panel-${ID}-quantity`)).toHaveTextContent(
      "30",
    );
    expect(screen.getByText("Dining chair")).toBeInTheDocument();
    expect(screen.getByText("Oak")).toBeInTheDocument();
    expect(screen.getByText("Spindle back")).toBeInTheDocument();
    expect(screen.getByTestId(`stock-need-card-${ID}`)).not.toHaveTextContent(
      "High",
    );
  });

  it("carries no drag handle outside reorganise mode", () => {
    render(<StockNeedCard card={CARD} onPress={vi.fn()} />);

    expect(
      screen.queryByTestId(`stock-need-card-handle-${ID}`),
    ).not.toBeInTheDocument();
  });

  it("carries a drag handle once reorganise mode asks for one", () => {
    render(<StockNeedCard card={CARD} showDragHandle onPress={vi.fn()} />);

    expect(
      screen.getByTestId(`stock-need-card-handle-${ID}`),
    ).toBeInTheDocument();
  });

  it("offers the priority button only when a handler is given", () => {
    const { rerender } = render(<StockNeedCard card={CARD} />);
    expect(
      screen.queryByTestId(`stock-need-card-set-priority-${ID}`),
    ).not.toBeInTheDocument();

    const onSetPriority = vi.fn();
    rerender(<StockNeedCard card={CARD} onSetPriority={onSetPriority} />);
    expect(
      screen.getByTestId(`stock-need-card-set-priority-${ID}`),
    ).toBeInTheDocument();
  });

  it("opens the detail from the card body", async () => {
    const onPress = vi.fn();
    render(<StockNeedCard card={CARD} onPress={onPress} />);

    await userEvent.click(screen.getByTestId(`stock-need-card-body-${ID}`));

    expect(onPress).toHaveBeenCalledWith(ID);
  });

  it("does not open the detail when the handle itself is tapped", async () => {
    const onPress = vi.fn();
    render(<StockNeedCard card={CARD} showDragHandle onPress={onPress} />);

    await userEvent.click(screen.getByTestId(`stock-need-card-handle-${ID}`));

    expect(onPress).not.toHaveBeenCalled();
  });

  it("hangs the priority button below the card rather than inside it", () => {
    render(<StockNeedCard card={CARD} onSetPriority={vi.fn()} />);

    const button = screen.getByTestId(`stock-need-card-set-priority-${ID}`);
    const row = screen.getByTestId(`stock-need-card-${ID}`);

    // A direct child of the row, so it sits under the card surface rather than
    // sharing its border and background.
    expect(button.parentElement).toBe(row);
    expect(button.closest(".bg-card")).toBeNull();
  });

  it("shapes the priority button as a tab off the card's bottom edge", () => {
    render(<StockNeedCard card={CARD} onSetPriority={vi.fn()} />);

    const button = screen.getByTestId(`stock-need-card-set-priority-${ID}`);

    // Rounded where it leaves the card, square where it meets it — a browser
    // tab upside down. A radius on the top edge would break the join.
    expect(button).toHaveClass("rounded-bl-2xl", "rounded-br-xl");
    for (const className of button.classList) {
      expect(className).not.toMatch(/^rounded-t/);
    }

    // As wide as its label and no wider, starting at the card's left edge —
    // any left margin would detach it from the outline it continues.
    expect(button).toHaveClass("self-start");
    expect(button).not.toHaveClass("w-full");
    for (const className of button.classList) {
      expect(className).not.toMatch(/^-?ml-/);
    }
  });

  it("hands the card's bottom-left corner over to the tab", () => {
    const { rerender } = render(<StockNeedCard card={CARD} />);
    const cardSurface = () =>
      screen.getByTestId(`stock-need-card-${ID}`).querySelector(".bg-card")!;

    // With no tab the card keeps all four of its own corners.
    expect(cardSurface()).not.toHaveClass("rounded-bl-none");

    // With one, the card squares that corner so the tab can carry the curve;
    // the tab's `rounded-bl-2xl` is the other half of this pair.
    rerender(<StockNeedCard card={CARD} onSetPriority={vi.fn()} />);
    expect(cardSurface()).toHaveClass("rounded-bl-none");
  });

  it("leaves no gap between the card and its tab", () => {
    render(<StockNeedCard card={CARD} onSetPriority={vi.fn()} />);

    const row = screen.getByTestId(`stock-need-card-${ID}`);

    // The tab reads as attached only while it touches the card. Any `gap-*` on
    // the row would push it off and turn it back into a detached button.
    for (const className of row.classList) {
      expect(className).not.toMatch(/^gap-/);
    }
  });

  it("marks the card while it is being dragged", () => {
    render(<StockNeedCard card={CARD} isDragging showDragHandle />);

    expect(screen.getByTestId(`stock-need-card-${ID}`)).toHaveAttribute(
      "data-dragging",
      "",
    );
    expect(screen.getByTestId(`stock-need-card-${ID}`)).toHaveClass(
      "opacity-65",
    );
  });
});
