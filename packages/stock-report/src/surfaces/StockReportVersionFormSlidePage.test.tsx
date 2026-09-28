import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Mutation = { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean };
const mocks = vi.hoisted(() => ({
  props: {} as { versionId?: string },
  open: vi.fn(),
  isOpen: vi.fn(() => false),
  requestClose: vi.fn(),
  setCloseInterceptor: vi.fn(),
  version: vi.fn(),
  create: { mutateAsync: vi.fn(), isPending: false } as Mutation,
  update: { mutateAsync: vi.fn(), isPending: false } as Mutation,
  activate: { mutateAsync: vi.fn(), isPending: false } as Mutation,
}));

vi.mock("@beyo/hooks", () => ({
  useSurface: () => ({ open: mocks.open, isOpen: mocks.isOpen }),
  useSurfaceHeader: () => ({
    setTitle: vi.fn(),
    setActions: vi.fn(),
    setHeaderHidden: vi.fn(),
    requestClose: mocks.requestClose,
    setCloseInterceptor: mocks.setCloseInterceptor,
  }),
  useSurfaceProps: () => mocks.props,
}));
vi.mock("../api/use-stock-report-queries", () => ({ useStockReportVersionQuery: mocks.version }));
vi.mock("../actions/use-stock-report-actions", () => ({
  useCreateStockReportVersion: () => mocks.create,
  useUpdateStockReportVersion: () => mocks.update,
  useActivateStockReportVersion: () => mocks.activate,
}));

import { wireDraftStockReportSnapshotVersion, wireStockReportSnapshotVersion } from "../fixtures/stock-report-wire-fixtures";
import { StockReportVersionFormSlidePage } from "./StockReportVersionFormSlidePage";

// Only `Date` is faked: the form's async submit and `waitFor` keep real timers.
const NOW = new Date(2026, 9, 1, 12, 0);
const LATER = new Date(2026, 9, 7, 6, 0).toISOString();

const loaded = (data: unknown) => ({ data, isPending: false, isError: false, error: null, refetch: vi.fn() });
const idle = { data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() };

/** The props the page opened a surface with, by id. */
function openedWith<T>(id: string): T {
  const call = mocks.open.mock.calls.find(([opened]) => opened === id);
  if (!call) throw new Error(`${id} was not opened`);
  return call[1] as T;
}

function submitForm(): void {
  fireEvent.submit(screen.getByTestId("stock-version-form"));
}

describe("StockReportVersionFormSlidePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    mocks.props = {};
    mocks.isOpen.mockReturnValue(false);
    mocks.version.mockReturnValue(idle);
    for (const mutation of [mocks.create, mocks.update, mocks.activate]) {
      mutation.isPending = false;
      mutation.mutateAsync.mockResolvedValue({});
    }
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("creates an unscheduled draft at once, opens the drafts page, then leaves", async () => {
    render(<StockReportVersionFormSlidePage />);
    fireEvent.change(screen.getByTestId("stock-version-form-title"), { target: { value: " Autumn " } });
    submitForm();

    await waitFor(() => expect(mocks.requestClose).toHaveBeenCalled());
    expect(mocks.create.mutateAsync).toHaveBeenCalledWith({ draft: true, title: "Autumn" });
    expect(mocks.open).toHaveBeenCalledWith("stock-report-drafts-slide", {});
    // The destination first, the form beneath it (projection R19's order).
    expect(mocks.open.mock.invocationCallOrder[0]).toBeLessThan(mocks.requestClose.mock.invocationCallOrder[0] ?? 0);
  });

  it("does not open the drafts page twice", async () => {
    mocks.isOpen.mockReturnValue(true);
    render(<StockReportVersionFormSlidePage />);
    submitForm();
    await waitFor(() => expect(mocks.requestClose).toHaveBeenCalled());
    expect(mocks.open).not.toHaveBeenCalled();
  });

  /** OC-16: a scheduled draft waits for the activation sheet; the request carries its choice. */
  it("asks when it activates before storing a scheduled draft, and sends nothing until then", async () => {
    render(<StockReportVersionFormSlidePage />);
    fireEvent.click(screen.getByTestId("stock-version-form-schedule"));
    act(() => openedWith<{ onSelect: (iso: string) => void }>("stock-report-schedule-sheet").onSelect(LATER));
    submitForm();

    await waitFor(() => expect(mocks.open).toHaveBeenCalledWith("stock-report-activate-sheet", expect.anything()));
    const sheet = openedWith<{ mode: string; title: string; scheduledAt: string; initialKeep: boolean; onConfirm: (keep: boolean) => void }>("stock-report-activate-sheet");
    expect(sheet).toMatchObject({ mode: "schedule", title: "Thu, 1st October", scheduledAt: LATER, initialKeep: false });
    expect(mocks.create.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.requestClose).not.toHaveBeenCalled();

    act(() => sheet.onConfirm(true));
    await waitFor(() => expect(mocks.requestClose).toHaveBeenCalled());
    expect(mocks.create.mutateAsync).toHaveBeenCalledWith({ draft: true, title: "Thu, 1st October", scheduledAt: LATER, keepActiveMissing: true });
  });

  it("creates an active version on the second tap and opens the board", async () => {
    render(<StockReportVersionFormSlidePage />);
    fireEvent.click(screen.getByTestId("stock-version-form-state-active"));
    fireEvent.click(screen.getByTestId("stock-version-form-submit"));
    fireEvent.click(screen.getByTestId("stock-version-form-submit"));

    await waitFor(() => expect(mocks.requestClose).toHaveBeenCalled());
    expect(mocks.create.mutateAsync).toHaveBeenCalledWith({ draft: false, title: "Thu, 1st October" });
    expect(mocks.open).toHaveBeenCalledWith("stock-report-board-slide", {});
    expect(mocks.open).not.toHaveBeenCalledWith("stock-report-activate-sheet", expect.anything());
  });

  it("keeps the form open and says why when the create fails", async () => {
    mocks.create.mutateAsync.mockRejectedValue(new Error("STOCK_REPORT_VERSION_ALREADY_ACTIVE: nope"));
    render(<StockReportVersionFormSlidePage />);
    submitForm();
    expect(await screen.findByTestId("stock-version-form-error")).toBeInTheDocument();
    expect(mocks.requestClose).not.toHaveBeenCalled();
  });

  it("patches an unscheduled draft's title and nothing else", async () => {
    mocks.props = { versionId: "srv-draft" };
    mocks.version.mockReturnValue(loaded(wireDraftStockReportSnapshotVersion({ title: "Old", scheduled_activation_at: null })));
    render(<StockReportVersionFormSlidePage />);
    fireEvent.change(screen.getByTestId("stock-version-form-title"), { target: { value: "New" } });
    submitForm();

    await waitFor(() => expect(mocks.requestClose).toHaveBeenCalled());
    expect(mocks.update.mutateAsync).toHaveBeenCalledWith({ title: "New" });
    expect(mocks.activate.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.open).not.toHaveBeenCalled();
  });

  /** OC-17 + projection R1: a retitle of a scheduled draft asks again, pre-filled, and never resends the "+00:00" schedule. */
  it("asks again on a retitle of a scheduled draft, from the stored choice, and sends the title and the flag", async () => {
    mocks.props = { versionId: "srv-draft" };
    mocks.version.mockReturnValue(loaded(wireDraftStockReportSnapshotVersion({ title: "Old", scheduled_activation_keeps_active_missing: true })));
    render(<StockReportVersionFormSlidePage />);
    fireEvent.change(screen.getByTestId("stock-version-form-title"), { target: { value: "New" } });
    submitForm();

    await waitFor(() => expect(mocks.open).toHaveBeenCalled());
    const sheet = openedWith<{ mode: string; initialKeep: boolean; onConfirm: (keep: boolean) => void }>("stock-report-activate-sheet");
    expect(sheet).toMatchObject({ mode: "schedule", initialKeep: true });
    act(() => sheet.onConfirm(false));
    await waitFor(() => expect(mocks.requestClose).toHaveBeenCalled());
    expect(mocks.update.mutateAsync).toHaveBeenCalledWith({ title: "New", keepActiveMissing: false });
  });

  /** Projection R14: a promote with an unchanged title is the activation alone, with the sheet's choice in the body. */
  it("promotes a scheduled draft through the activate sheet: no patch, then activate", async () => {
    mocks.props = { versionId: "srv-draft" };
    mocks.version.mockReturnValue(loaded(wireDraftStockReportSnapshotVersion({ title: "Autumn" })));
    render(<StockReportVersionFormSlidePage />);
    fireEvent.click(screen.getByTestId("stock-version-form-state-active"));
    submitForm();

    await waitFor(() => expect(mocks.open).toHaveBeenCalled());
    const sheet = openedWith<{ mode: string; title: string; onConfirm: (keep: boolean) => void }>("stock-report-activate-sheet");
    expect(sheet).toMatchObject({ mode: "activate", title: "Autumn" });
    act(() => sheet.onConfirm(true));

    await waitFor(() => expect(mocks.requestClose).toHaveBeenCalled());
    expect(mocks.update.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.activate.mutateAsync).toHaveBeenCalledWith({ keepActiveMissing: true });
  });

  it("promotes with a changed title: the title patch first, then the activation", async () => {
    mocks.props = { versionId: "srv-draft" };
    mocks.version.mockReturnValue(loaded(wireDraftStockReportSnapshotVersion({ title: "Autumn" })));
    render(<StockReportVersionFormSlidePage />);
    fireEvent.change(screen.getByTestId("stock-version-form-title"), { target: { value: "Winter" } });
    fireEvent.click(screen.getByTestId("stock-version-form-state-active"));
    submitForm();

    await waitFor(() => expect(mocks.open).toHaveBeenCalled());
    act(() => openedWith<{ onConfirm: (keep: boolean) => void }>("stock-report-activate-sheet").onConfirm(false));
    await waitFor(() => expect(mocks.activate.mutateAsync).toHaveBeenCalledWith({ keepActiveMissing: false }));
    expect(mocks.update.mutateAsync).toHaveBeenCalledWith({ title: "Winter" });
    expect(mocks.update.mutateAsync.mock.invocationCallOrder[0]).toBeLessThan(mocks.activate.mutateAsync.mock.invocationCallOrder[0] ?? 0);
  });

  it("edits an active version's title with no sheet and no schedule key", async () => {
    mocks.props = { versionId: "srv-1" };
    mocks.version.mockReturnValue(loaded(wireStockReportSnapshotVersion({ title: "Live" })));
    render(<StockReportVersionFormSlidePage />);
    fireEvent.change(screen.getByTestId("stock-version-form-title"), { target: { value: "Still live" } });
    submitForm();

    await waitFor(() => expect(mocks.requestClose).toHaveBeenCalled());
    expect(mocks.update.mutateAsync).toHaveBeenCalledWith({ title: "Still live" });
    expect(mocks.open).not.toHaveBeenCalled();
  });

  /** Projection R13: the back row bypasses the interceptor, so both are locked while a request is in flight. */
  it("locks the back row and intercepts the swipe while a request is pending", () => {
    mocks.create.isPending = true;
    render(<StockReportVersionFormSlidePage />);
    expect(screen.getByTestId("stock-report-version-form-back")).toBeDisabled();
    expect(screen.getByTestId("stock-version-form-submit")).toBeDisabled();
    expect(mocks.setCloseInterceptor).toHaveBeenCalledWith(expect.any(Function));

    cleanup();
    mocks.setCloseInterceptor.mockClear();
    mocks.create.isPending = false;
    render(<StockReportVersionFormSlidePage />);
    expect(screen.getByTestId("stock-report-version-form-back")).toBeEnabled();
    expect(mocks.setCloseInterceptor).not.toHaveBeenCalledWith(expect.any(Function));
  });
});
