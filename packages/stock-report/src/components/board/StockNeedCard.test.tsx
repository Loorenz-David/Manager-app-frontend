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
