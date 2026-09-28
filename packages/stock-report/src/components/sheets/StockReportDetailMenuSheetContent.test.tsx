import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StockReportDetailMenuSheetContent } from "./StockReportDetailMenuSheetContent";

afterEach(cleanup);

describe("StockReportDetailMenuSheetContent", () => {
  it("offers both halves of the switch with their quantities, and reports the tap", () => {
    const onMarkMissing = vi.fn();
    const onUnmarkMissing = vi.fn();
    render(<StockReportDetailMenuSheetContent markable={3} missing={1} onMarkMissing={onMarkMissing} onUnmarkMissing={onUnmarkMissing} />);

    fireEvent.click(screen.getByTestId("stock-report-mark-missing"));
    fireEvent.click(screen.getByTestId("stock-report-unmark-missing"));

    expect(screen.getByTestId("stock-report-mark-missing")).toHaveTextContent("Mark 3 missing");
    expect(screen.getByTestId("stock-report-unmark-missing")).toHaveTextContent("Unmark 1 missing");
    expect(onMarkMissing).toHaveBeenCalledTimes(1);
    expect(onUnmarkMissing).toHaveBeenCalledTimes(1);
  });

  it("hides a half that has nothing to do", () => {
    render(<StockReportDetailMenuSheetContent markable={0} missing={4} onMarkMissing={vi.fn()} onUnmarkMissing={vi.fn()} />);
    expect(screen.queryByTestId("stock-report-mark-missing")).not.toBeInTheDocument();
    expect(screen.getByTestId("stock-report-unmark-missing")).toBeInTheDocument();
  });

  it("explains itself when every unit is already covered", () => {
    render(<StockReportDetailMenuSheetContent markable={0} missing={0} onMarkMissing={vi.fn()} onUnmarkMissing={vi.fn()} />);
    expect(screen.getByTestId("stock-report-detail-menu-empty")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  /** Projection R3 / OC-10: a seller reaches the sheet for the requested row alone — no missing rows, no empty line. */
  it("shows a seller the requested row only, and a worker the missing switch only", () => {
    const onSetRequested = vi.fn();
    render(<StockReportDetailMenuSheetContent canMarkMissing={false} markable={0} missing={0} onMarkMissing={vi.fn()} onSetRequested={onSetRequested} onUnmarkMissing={vi.fn()} onFollowLive={vi.fn()} />);
    fireEvent.click(screen.getByTestId("stock-report-set-requested"));
    expect(onSetRequested).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("stock-report-detail-menu-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stock-report-follow-live")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);

    cleanup();
    render(<StockReportDetailMenuSheetContent markable={3} missing={1} onMarkMissing={vi.fn()} onUnmarkMissing={vi.fn()} />);
    expect(screen.queryByTestId("stock-report-set-requested")).not.toBeInTheDocument();
    expect(screen.getByTestId("stock-report-mark-missing")).toBeInTheDocument();
    expect(screen.getByTestId("stock-report-unmark-missing")).toBeInTheDocument();
  });

  /** OC-14: on a draft with its own count, the way back to the board's — after Unmark. */
  it("offers the way back to the live version's count when supplied, after the switch", () => {
    const onFollowLive = vi.fn();
    render(<StockReportDetailMenuSheetContent markable={2} missing={4} onFollowLive={onFollowLive} onMarkMissing={vi.fn()} onSetRequested={vi.fn()} onUnmarkMissing={vi.fn()} />);

    const rows = screen.getAllByRole("button").map((button) => button.getAttribute("data-testid"));
    expect(rows).toEqual(["stock-report-set-requested", "stock-report-mark-missing", "stock-report-unmark-missing", "stock-report-follow-live"]);
    fireEvent.click(screen.getByTestId("stock-report-follow-live"));
    expect(onFollowLive).toHaveBeenCalledTimes(1);
  });
});
