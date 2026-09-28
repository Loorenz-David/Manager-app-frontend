import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  props: {} as Record<string, unknown>,
  requestClose: vi.fn(),
  version: vi.fn(),
  activate: { mutate: vi.fn(), isPending: false },
  update: vi.fn(),
}));

vi.mock("@beyo/hooks", () => ({
  useSurfaceHeader: () => ({ setTitle: vi.fn(), setActions: vi.fn(), requestClose: mocks.requestClose, setHeaderHidden: vi.fn() }),
  useSurfaceProps: () => mocks.props,
}));
vi.mock("../api/use-stock-report-queries", () => ({ useStockReportVersionQuery: mocks.version }));
vi.mock("../actions/use-stock-report-actions", () => ({
  useActivateStockReportVersion: () => mocks.activate,
  useUpdateStockReportVersion: () => ({ mutate: mocks.update }),
}));

import { wireDraftStockReportSnapshotVersion } from "../fixtures/stock-report-wire-fixtures";
import { StockReportActivateSheetPage } from "./StockReportActivateSheetPage";

const ready = (data: unknown) => ({ data, isPending: false, isError: false, error: null });
const pressed = (id: string) => screen.getByTestId(id).getAttribute("aria-pressed");

describe("StockReportActivateSheetPage — activate now (from the version actions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activate.isPending = false;
    mocks.props = { mode: "activate", versionId: "srv-draft" };
  });
  afterEach(cleanup);

  /** v9 §5.17: pre-fill the drawer from the stored flag. */
  it("pre-selects the draft's stored choice and names the draft", () => {
    mocks.version.mockReturnValue(ready(wireDraftStockReportSnapshotVersion({ title: "Autumn", scheduled_activation_keeps_active_missing: true })));
    render(<StockReportActivateSheetPage />);
    expect(screen.getByTestId("stock-report-activate-title")).toHaveTextContent("Activate Autumn");
    expect(pressed("stock-keep-missing-keep")).toBe("true");
    expect(pressed("stock-keep-missing-reset")).toBe("false");
    expect(screen.getByTestId("stock-report-activate-note")).toHaveTextContent("The live version closes.");
  });

  it("activates on the second tap with the chosen flag, and never writes the stored flag", () => {
    mocks.version.mockReturnValue(ready(wireDraftStockReportSnapshotVersion({ scheduled_activation_keeps_active_missing: true })));
    render(<StockReportActivateSheetPage />);
    fireEvent.click(screen.getByTestId("stock-keep-missing-reset"));
    fireEvent.click(screen.getByTestId("stock-report-activate-confirm"));
    expect(mocks.activate.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("stock-report-activate-confirm"));

    expect(mocks.activate.mutate).toHaveBeenCalledWith({ keepActiveMissing: false }, expect.anything());
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.requestClose).not.toHaveBeenCalled();
    (mocks.activate.mutate.mock.calls[0]?.[1] as { onSuccess: () => void }).onSuccess();
    expect(mocks.requestClose).toHaveBeenCalled();
  });

  it("waits for the version before offering the choice", () => {
    mocks.version.mockReturnValue({ data: undefined, isPending: true, isError: false, error: null });
    render(<StockReportActivateSheetPage />);
    expect(screen.getByTestId("stock-report-activate-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("stock-report-activate-confirm")).not.toBeInTheDocument();
  });
});

describe("StockReportActivateSheetPage — relay (from the version form)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.version.mockReturnValue({ data: undefined, isPending: false, isError: false, error: null });
  });
  afterEach(cleanup);

  it("words a schedule with its date, confirms on one tap, relays the choice and sends nothing itself", () => {
    const onConfirm = vi.fn();
    mocks.props = { mode: "schedule", title: "Autumn", scheduledAt: new Date(2026, 9, 7, 6, 0).toISOString(), initialKeep: false, onConfirm };
    render(<StockReportActivateSheetPage />);

    expect(screen.getByTestId("stock-report-activate-title")).toHaveTextContent("Schedule Autumn");
    expect(screen.getByTestId("stock-report-activate-note")).toHaveTextContent("On Wed, 7th Oct · 06:00 the live version closes");
    expect(screen.getByTestId("stock-report-activate-note")).toHaveTextContent("You can change this until then.");
    expect(pressed("stock-keep-missing-reset")).toBe("true");

    fireEvent.click(screen.getByTestId("stock-keep-missing-keep"));
    fireEvent.click(screen.getByTestId("stock-report-activate-confirm"));
    expect(onConfirm).toHaveBeenCalledWith(true);
    expect(mocks.requestClose).toHaveBeenCalled();
    expect(mocks.activate.mutate).not.toHaveBeenCalled();
  });

  it("words a promote as activate now, and asks twice before relaying", () => {
    const onConfirm = vi.fn();
    mocks.props = { mode: "activate", title: "Autumn", scheduledAt: null, initialKeep: true, onConfirm };
    render(<StockReportActivateSheetPage />);

    expect(screen.getByTestId("stock-report-activate-title")).toHaveTextContent("Activate Autumn");
    expect(pressed("stock-keep-missing-keep")).toBe("true");
    fireEvent.click(screen.getByTestId("stock-report-activate-confirm"));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("stock-report-activate-confirm"));
    expect(onConfirm).toHaveBeenCalledWith(true);
    expect(mocks.activate.mutate).not.toHaveBeenCalled();
  });
});
