import "@testing-library/jest-dom/vitest";

import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const previewCheck = vi.fn();
const previewClear = vi.fn();

vi.mock("../actions/use-stock-match-preview", () => ({
  useStockMatchPreview: () => ({
    check: previewCheck,
    clear: previewClear,
    isPending: false,
  }),
}));

vi.mock("../surface-ids", () => ({
  preloadStockMatchWarningSurface: vi.fn(),
}));

import { useStockAssignmentGate } from "./use-stock-assignment-gate";

const candidate = {
  articleNumber: "ABC-1",
  itemCategoryId: "cat-1",
  properties: { wood_group: "teak" },
  quantity: 1,
};

const propertyFailure = {
  key: "upholstery",
  reason: "value_not_accepted",
  accepted_values: ["foam", "synthetic"],
  item_values: ["down"],
};

const expectedRow = {
  key: "upholstery",
  label: "Upholstery",
  asked: "Foam / Synthetic",
  item: "Down",
  reason: "value_not_accepted",
};

describe("useStockAssignmentGate", () => {
  beforeEach(() => {
    previewCheck.mockReset();
    previewClear.mockReset();
  });

  /** Owner, 2026-09-28: a property mismatch blocks like a category mismatch. */
  it("refuses a property mismatch outright — no override is offered or armed", async () => {
    previewCheck.mockResolvedValue({
      can_proceed: true,
      override_required: true,
      refusal_reason: null,
      property_failures: [propertyFailure],
      values_source: "supplied",
    });
    const openWarning = vi.fn();
    const { result } = renderHook(() =>
      useStockAssignmentGate("sri-1", openWarning),
    );

    let decision!: Promise<boolean>;
    act(() => {
      decision = result.current.check(candidate);
    });
    await waitFor(() => expect(openWarning).toHaveBeenCalledTimes(1));

    expect(await decision).toBe(false);
    const warning = openWarning.mock.calls[0]?.[0];
    expect(warning).toMatchObject({ kind: "mismatch", failures: [expectedRow] });
    expect(warning).not.toHaveProperty("onContinue");
    expect(result.current).not.toHaveProperty("getAcceptedOverride");

    // Nothing was accepted, so the same candidate is checked afresh.
    await act(async () => {
      await expect(result.current.check(candidate)).resolves.toBe(false);
    });
    expect(previewCheck).toHaveBeenCalledTimes(2);
  });

  it("lets Change item clear only through the form-provided callback", async () => {
    previewCheck.mockResolvedValue({
      can_proceed: false,
      override_required: false,
      refusal_reason: "category_mismatch",
      property_failures: [],
      values_source: "stored",
    });
    const openWarning = vi.fn();
    const onChangeItem = vi.fn();
    const { result } = renderHook(() =>
      useStockAssignmentGate("sri-1", openWarning),
    );

    await act(async () => {
      await result.current.check(candidate, { onChangeItem });
    });
    const warning = openWarning.mock.calls[0]?.[0];
    expect(warning).toMatchObject({
      kind: "blocked",
      checkedAgainstStoredItem: true,
    });
    act(() => warning.onChangeItem());
    expect(onChangeItem).toHaveBeenCalledOnce();
    expect(previewClear).toHaveBeenCalledOnce();
  });

  it("shows the spinner row only while a check is in flight", async () => {
    let resolveCheck!: (value: unknown) => void;
    previewCheck.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCheck = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useStockAssignmentGate("sri-1", vi.fn()),
    );
    const StatusSlot = result.current.statusSlot;
    render(<StatusSlot />);
    expect(screen.queryByTestId("stock-match-status-row")).toBeNull();

    let decision!: Promise<boolean>;
    act(() => {
      decision = result.current.check(candidate);
    });
    await waitFor(() =>
      expect(screen.getByTestId("stock-match-status-row")).toHaveAttribute(
        "data-state",
        "checking",
      ),
    );

    await act(async () => {
      resolveCheck({
        can_proceed: true,
        override_required: false,
        refusal_reason: null,
        property_failures: [],
        values_source: "supplied",
      });
      await decision;
    });
    expect(await decision).toBe(true);
    expect(screen.queryByTestId("stock-match-status-row")).toBeNull();
  });

  it("never lets a stale preview decide", async () => {
    let firstResolve!: (value: unknown) => void;
    let secondResolve!: (value: unknown) => void;
    previewCheck
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            firstResolve = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            secondResolve = resolve;
          }),
      );
    const { result } = renderHook(() =>
      useStockAssignmentGate("sri-1", vi.fn()),
    );

    let firstDecision!: Promise<boolean>;
    let secondDecision!: Promise<boolean>;
    act(() => {
      firstDecision = result.current.check(candidate);
      secondDecision = result.current.check({ ...candidate, quantity: 2 });
    });
    await act(async () => {
      secondResolve({
        can_proceed: true,
        override_required: false,
        refusal_reason: null,
        property_failures: [],
        values_source: "supplied",
      });
      await secondDecision;
    });
    await act(async () => {
      firstResolve(null);
      await firstDecision;
    });

    expect(await secondDecision).toBe(true);
    expect(await firstDecision).toBe(false);
  });

  it("treats a preview transport failure as advisory", async () => {
    previewCheck.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useStockAssignmentGate("sri-1", vi.fn()),
    );

    await expect(result.current.check(candidate)).resolves.toBe(true);
  });

  it("hands the sheet the preview's own values to compare, not a sentence about them", async () => {
    previewCheck.mockResolvedValue({
      can_proceed: true,
      override_required: true,
      refusal_reason: null,
      property_failures: [propertyFailure],
      values_source: "supplied",
    });
    const openWarning = vi.fn();
    const { result } = renderHook(() =>
      useStockAssignmentGate("sri-1", openWarning),
    );

    act(() => {
      void result.current.check(candidate);
    });
    await waitFor(() => expect(openWarning).toHaveBeenCalledTimes(1));

    expect(openWarning.mock.calls[0]?.[0].failures).toEqual([expectedRow]);
  });

  it("compares the same way on a create-time refusal as it did on the preview", async () => {
    const openWarning = vi.fn();
    const onChangeItem = vi.fn();
    const { result } = renderHook(() =>
      useStockAssignmentGate("sri-1", openWarning),
    );
    previewCheck.mockResolvedValue({
      can_proceed: true,
      override_required: false,
      refusal_reason: null,
      property_failures: [],
      values_source: "supplied",
    });
    await act(async () => {
      await result.current.check(candidate, { onChangeItem });
    });

    act(() => {
      result.current.reportMismatch([propertyFailure]);
    });
    await waitFor(() => expect(openWarning).toHaveBeenCalledTimes(1));

    // One renderer, one mapper: the sheet a user reaches by being refused must
    // read exactly like the one the preview would have shown, with the same
    // single way out.
    const warning = openWarning.mock.calls[0]?.[0];
    expect(warning).toMatchObject({ kind: "mismatch", failures: [expectedRow] });
    act(() => warning.onChangeItem());
    expect(onChangeItem).toHaveBeenCalledOnce();
    expect(previewClear).toHaveBeenCalledOnce();
  });
});
