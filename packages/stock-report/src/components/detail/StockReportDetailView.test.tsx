import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  stockNeedPartiallyFulfilledFixture,
  stockReportAssignmentsFixture,
  stockReportNoAssignmentsFixture,
  stockReportSingleAssignmentFixture,
} from "../../fixtures/stock-report-fixtures";
import { StockReportDetailView } from "./StockReportDetailView";
import type { StockReportDetailViewProps } from "./StockReportDetailView";

afterEach(cleanup);

/** See `StockReportBoardView.test.tsx` — `PullToRefresh` filters synthetic taps. */
function tapInsidePullContainer(element: HTMLElement): void {
  fireEvent.click(element);
}

const NEED = stockNeedPartiallyFulfilledFixture;

function renderDetail(overrides: Partial<StockReportDetailViewProps> = {}) {
  const props: StockReportDetailViewProps = {
    title: NEED.title,
    imageUrl: NEED.imageUrl,
    propertyTags: NEED.propertyTags,
    quantities: NEED.quantities,
    assignments: stockReportAssignmentsFixture,
    status: "ready",
    onRefresh: vi.fn(),
    canAssign: true,
    onAddItem: vi.fn(),
    ...overrides,
  };

  render(
    <LazyMotion features={domAnimation}>
      <StockReportDetailView {...props} />
    </LazyMotion>,
  );

  return props;
}

describe("StockReportDetailView — header", () => {
  it("supplies no back-arrow bar of its own — the slide surface owns the header", () => {
    renderDetail();

    expect(
      screen.queryByRole("button", { name: /back/i }),
    ).not.toBeInTheDocument();
  });

  it("does not repeat the category name inside the summary card", () => {
    renderDetail();

    expect(screen.getByTestId("stock-report-summary-card")).not.toHaveTextContent(
      NEED.title,
    );
  });

  it("shows the goal, the criteria, the bar and the legend", () => {
    renderDetail();

    expect(
      screen.getByTestId("stock-report-summary-panel-quantity"),
    ).toHaveTextContent("30");
    expect(screen.getByText("Oak")).toBeInTheDocument();
    expect(screen.getByTestId("stock-report-summary-bar")).toBeInTheDocument();
    expect(screen.getByText("Fulfilled")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
  });
});

describe("StockReportDetailView — Add item", () => {
  it("offers Add item to a role that may assign", () => {
    renderDetail({ canAssign: true });

    expect(screen.getByTestId("stock-report-add-item")).toBeInTheDocument();
  });

  it("hides Add item entirely from a role that may not", () => {
    renderDetail({ canAssign: false });

    expect(
      screen.queryByTestId("stock-report-add-item"),
    ).not.toBeInTheDocument();
  });

  it("reports the press", () => {
    const props = renderDetail();

    tapInsidePullContainer(screen.getByTestId("stock-report-add-item"));

    expect(props.onAddItem).toHaveBeenCalledTimes(1);
  });
});

describe("StockReportDetailView — selected items", () => {
  it("counts several items in the plural", () => {
    renderDetail();

    expect(
      screen.getByTestId("stock-report-assignment-count"),
    ).toHaveTextContent("4 items");
  });

  it("counts a single item in the singular", () => {
    renderDetail({ assignments: stockReportSingleAssignmentFixture });

    expect(
      screen.getByTestId("stock-report-assignment-count"),
    ).toHaveTextContent("1 item");
  });

  it("keeps the summary and Add item while the list is empty", () => {
    renderDetail({ assignments: stockReportNoAssignmentsFixture });

    expect(
      screen.getByTestId("stock-report-assignments-empty"),
    ).toHaveTextContent("No items selected for this stock need yet.");
    expect(
      screen.getByTestId("stock-report-assignment-count"),
    ).toHaveTextContent("0 items");
    expect(screen.getByTestId("stock-report-summary-card")).toBeInTheDocument();
    expect(screen.getByTestId("stock-report-add-item")).toBeInTheDocument();
  });

  it("renders one task card per assignment", () => {
    renderDetail();

    for (const assignment of stockReportAssignmentsFixture) {
      expect(
        screen.getByTestId(`tasks-card-${assignment.taskId}`),
      ).toBeInTheDocument();
    }
  });
});

describe("StockReportDetailView — the ⋮ menu", () => {
  it("shows no ⋮ when no actions handler is given", () => {
    renderDetail();

    const [first] = stockReportAssignmentsFixture;
    expect(
      screen.queryByTestId(`tasks-card-actions-${first.taskId}`),
    ).not.toBeInTheDocument();
  });

  it("shows the ⋮ and reports the task and item ids when one is", () => {
    const onTapActions = vi.fn();
    renderDetail({ onTapActions });

    const [first] = stockReportAssignmentsFixture;
    tapInsidePullContainer(
      screen.getByTestId(`tasks-card-actions-${first.taskId}`),
    );

    expect(onTapActions).toHaveBeenCalledWith(
      first.taskId,
      first.item?.itemId ?? null,
    );
  });
});

describe("StockReportDetailView — states", () => {
  it("reflects the assignment section while it loads, keeping the summary", () => {
    renderDetail({ status: "loading" });

    expect(
      screen.getByTestId("stock-report-assignments-skeleton"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("stock-report-summary-card")).toBeInTheDocument();
    expect(
      screen.queryByTestId("stock-report-assignment-count"),
    ).not.toBeInTheDocument();
  });

  it("offers a retry from the error state", () => {
    const onRetry = vi.fn();
    renderDetail({ status: "error", onRetry });

    tapInsidePullContainer(
      screen.getByTestId("stock-report-detail-error-retry"),
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("says the stock need is gone and shows nothing else", () => {
    renderDetail({ isMissing: true });

    expect(
      screen.getByTestId("stock-report-missing-notice"),
    ).toHaveTextContent("This stock need no longer exists.");
    expect(
      screen.queryByTestId("stock-report-summary-card"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("stock-report-add-item"),
    ).not.toBeInTheDocument();
  });
});
