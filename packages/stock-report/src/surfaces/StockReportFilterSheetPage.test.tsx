import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const surface = vi.hoisted(() => ({
  requestClose: vi.fn(),
  props: {} as Record<string, unknown>,
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({ requestClose: surface.requestClose }),
  useSurfaceProps: () => surface.props,
}));

import { StockReportFilterSheetPage } from "./StockReportFilterSheetPage";

afterEach(cleanup);

describe("StockReportFilterSheetPage", () => {
  const onApply = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    surface.props = { current: "wood", initial: "wood", onApply };
  });

  it("commits nothing until Apply, then hands the draft over and closes", async () => {
    render(<StockReportFilterSheetPage />);

    await userEvent.click(screen.getByTestId("stock-report-filter-major-seat"));
    expect(onApply).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("stock-report-filter-apply"));
    expect(onApply).toHaveBeenCalledWith("seat");
    expect(surface.requestClose).toHaveBeenCalledTimes(1);
  });

  it("turns a tap on the selected category into no filter — tap again to see all", async () => {
    render(<StockReportFilterSheetPage />);

    await userEvent.click(screen.getByTestId("stock-report-filter-major-wood"));
    expect(screen.getByTestId("stock-report-filter-major-wood")).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(screen.getByTestId("stock-report-filter-apply"));
    expect(onApply).toHaveBeenCalledWith(null);
  });

  it("Clear returns the draft to the role default, not to no filter", async () => {
    surface.props = { current: null, initial: "seat", onApply };
    render(<StockReportFilterSheetPage />);

    await userEvent.click(screen.getByTestId("stock-report-filter-major-wood"));
    await userEvent.click(screen.getByTestId("stock-report-filter-clear"));
    expect(screen.getByTestId("stock-report-filter-major-seat")).toHaveAttribute("aria-pressed", "true");
    expect(onApply).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("stock-report-filter-apply"));
    expect(onApply).toHaveBeenCalledWith("seat");
  });
});
