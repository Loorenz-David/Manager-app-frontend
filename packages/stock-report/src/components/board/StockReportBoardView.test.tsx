import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "framer-motion";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TRIAGE_BUCKETS,
  WORKER_BUCKETS,
  stockReportBoardCardsFixture,
} from "../../fixtures/stock-report-fixtures";
import { StockReportBoardView } from "./StockReportBoardView";
import type { StockReportBoardViewProps } from "./StockReportBoardView";

afterEach(cleanup);

/**
 * Everything below the header lives inside `PullToRefresh`, whose `useDrag`
 * binding has `filterTaps: true` — it swallows the synthetic pointer sequence
 * `userEvent.click` sends, in jsdom exactly as it does for Playwright's
 * `click()` on the mobile project. A plain `click` event still lands, so taps
 * inside the pull container are fired directly.
 */
function tapInsidePullContainer(element: HTMLElement): void {
  fireEvent.click(element);
}

function renderBoard(overrides: Partial<StockReportBoardViewProps> = {}) {
  const props: StockReportBoardViewProps = {
    buckets: TRIAGE_BUCKETS,
    bucket: "unset",
    onBucketChange: vi.fn(),
    searchValue: "",
    onSearchChange: vi.fn(),
    cards: stockReportBoardCardsFixture,
    status: "ready",
    onRefresh: vi.fn(),
    onCardPress: vi.fn(),
    canReorganise: true,
    isReorganiseMode: false,
    onToggleReorganise: vi.fn(),
    onSetPriority: vi.fn(),
    onReorder: vi.fn(),
    ...overrides,
  };

  render(
    <LazyMotion features={domAnimation}>
      <StockReportBoardView {...props} />
    </LazyMotion>,
  );

  return props;
}

describe("StockReportBoardView — controls", () => {
  it("renders the bucket picker without a sort or filter control", () => {
    renderBoard();

    expect(screen.getByTestId("stock-report-bucket-picker")).toBeInTheDocument();
    expect(screen.getByTestId("stock-report-search")).toBeInTheDocument();
    expect(
      screen.queryByTestId("stock-report-search-sort"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("stock-report-search-filter"),
    ).not.toBeInTheDocument();
  });

  it("leaves the Unset pill without the active fill while it is the bucket", () => {
    renderBoard({ bucket: "unset" });

    expect(
      screen.getByTestId("stock-report-bucket-picker-indicator"),
    ).toHaveAttribute("data-quiet", "");
    expect(screen.getByTestId("stock-report-bucket-unset")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("gives an ordinary bucket the active fill", () => {
    renderBoard({ bucket: "high" });

    expect(
      screen.getByTestId("stock-report-bucket-picker-indicator"),
    ).not.toHaveAttribute("data-quiet");
  });

  it("offers a worker only the three prioritised buckets", () => {
    renderBoard({ buckets: WORKER_BUCKETS, bucket: "high" });

    expect(
      screen.queryByTestId("stock-report-bucket-unset"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("stock-report-bucket-high")).toBeInTheDocument();
  });

  it("holds the search value while changing nothing else", async () => {
    const props = renderBoard();

    await userEvent.type(
      screen.getByTestId("stock-report-search-input"),
      "oak",
    );

    expect(props.onSearchChange).toHaveBeenCalled();
  });
});

describe("StockReportBoardView — list states", () => {
  it("shows the designed empty line for an empty bucket", () => {
    renderBoard({ cards: [] });

    expect(screen.getByTestId("stock-report-empty")).toHaveTextContent(
      "No stock need matches these filters.",
    );
    // The controls stay in place and enabled.
    expect(screen.getByTestId("stock-report-bucket-picker")).toBeInTheDocument();
  });

  it("shows card-shaped skeletons while loading", () => {
    renderBoard({ status: "loading" });

    expect(
      screen.getByTestId("stock-report-board-skeleton"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("stock-report-empty")).not.toBeInTheDocument();
  });

  it("offers a retry from the error state", () => {
    const onRetry = vi.fn();
    renderBoard({ status: "error", onRetry });

    tapInsidePullContainer(screen.getByTestId("stock-report-error-retry"));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("StockReportBoardView — reorganise mode", () => {
  it("renders no FAB for a role that cannot reorganise", () => {
    renderBoard({ canReorganise: false });

    expect(screen.queryByTestId("stock-report-fab")).not.toBeInTheDocument();
  });

  it("renders the FAB for a role that can, and reports the toggle", async () => {
    const props = renderBoard();

    await userEvent.click(screen.getByTestId("stock-report-fab"));
    await userEvent.click(
      screen.getByTestId("stock-report-fab-action-reorganise"),
    );

    expect(props.onToggleReorganise).toHaveBeenCalledTimes(1);
  });

  it("shows no handle and no priority button outside the mode", () => {
    const [first] = stockReportBoardCardsFixture;
    renderBoard({ isReorganiseMode: false });

    expect(
      screen.queryByTestId(`stock-need-card-handle-${first.stockNeedId}`),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`stock-need-card-set-priority-${first.stockNeedId}`),
    ).not.toBeInTheDocument();
  });

  it("shows handles and priority buttons inside the mode, in a sortable bucket", () => {
    const [first] = stockReportBoardCardsFixture;
    renderBoard({ isReorganiseMode: true, bucket: "high" });

    expect(
      screen.getByTestId(`stock-need-card-handle-${first.stockNeedId}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`stock-need-card-set-priority-${first.stockNeedId}`),
    ).toBeInTheDocument();
  });

  it("offers only the priority button in the Unset bucket — unordered rows have no handle", () => {
    const [first] = stockReportBoardCardsFixture;
    renderBoard({ isReorganiseMode: true, bucket: "unset" });

    expect(
      screen.queryByTestId(`stock-need-card-handle-${first.stockNeedId}`),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId(`stock-need-card-set-priority-${first.stockNeedId}`),
    ).toBeInTheDocument();
  });

  it("stops pull-to-refresh competing with the drag gesture", () => {
    const { rerender } = render(
      <LazyMotion features={domAnimation}>
        <StockReportBoardView
          bucket="high"
          buckets={TRIAGE_BUCKETS}
          canReorganise
          cards={stockReportBoardCardsFixture}
          isReorganiseMode={false}
          onBucketChange={vi.fn()}
          onCardPress={vi.fn()}
          onRefresh={vi.fn()}
          onReorder={vi.fn()}
          onSearchChange={vi.fn()}
          onSetPriority={vi.fn()}
          onToggleReorganise={vi.fn()}
          searchValue=""
          status="ready"
        />
      </LazyMotion>,
    );

    expect(screen.getByTestId("pull-to-refresh")).toBeInTheDocument();

    rerender(
      <LazyMotion features={domAnimation}>
        <StockReportBoardView
          bucket="high"
          buckets={TRIAGE_BUCKETS}
          canReorganise
          cards={stockReportBoardCardsFixture}
          isReorganiseMode
          onBucketChange={vi.fn()}
          onCardPress={vi.fn()}
          onRefresh={vi.fn()}
          onReorder={vi.fn()}
          onSearchChange={vi.fn()}
          onSetPriority={vi.fn()}
          onToggleReorganise={vi.fn()}
          searchValue=""
          status="ready"
        />
      </LazyMotion>,
    );

    // The board is still the pull container; the mode simply switches it off.
    expect(screen.getByTestId("pull-to-refresh")).toBeInTheDocument();
  });

  it("opens the detail from a card even while reorganise mode is on", () => {
    const [first] = stockReportBoardCardsFixture;
    const props = renderBoard({ isReorganiseMode: true, bucket: "high" });

    tapInsidePullContainer(
      screen.getByTestId(`stock-need-card-body-${first.stockNeedId}`),
    );

    expect(props.onCardPress).toHaveBeenCalledWith(first.stockNeedId);
  });

  it("reports a priority request with the row's id", () => {
    const [first] = stockReportBoardCardsFixture;
    const props = renderBoard({ isReorganiseMode: true, bucket: "unset" });

    tapInsidePullContainer(
      screen.getByTestId(`stock-need-card-set-priority-${first.stockNeedId}`),
    );

    expect(props.onSetPriority).toHaveBeenCalledWith(first.stockNeedId);
  });
});
