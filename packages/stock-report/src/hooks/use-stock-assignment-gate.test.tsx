import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
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

describe("useStockAssignmentGate", () => {
  beforeEach(() => {
    previewCheck.mockReset();
    previewClear.mockReset();
  });

  it("waits for a locked warning decision and sends no stale accepted override after a change", async () => {
    previewCheck
      .mockResolvedValueOnce({
        can_proceed: true,
        override_required: true,
        refusal_reason: null,
        property_failures: [
          {
            key: "wood_group",
            reason: "value_not_accepted",
            accepted_values: ["light"],
            item_values: ["teak"],
          },
        ],
        values_source: "supplied",
      })
      .mockResolvedValueOnce({
        can_proceed: true,
        override_required: false,
        refusal_reason: null,
        property_failures: [],
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
    expect(result.current.acceptedOverride).toBe(false);

    await act(async () => {
      openWarning.mock.calls[0]?.[0].onContinue?.();
      await decision;
    });
    expect(await decision).toBe(true);
    expect(result.current.acceptedOverride).toBe(true);
    expect(result.current.getAcceptedOverride()).toBe(true);
    const StatusSlot = result.current.statusSlot;
    render(<StatusSlot />);
    fireEvent.click(screen.getByTestId("stock-match-status-row"));
    expect(openWarning).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.check({ ...candidate, quantity: 2 });
    });
    expect(result.current.acceptedOverride).toBe(false);
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
      property_failures: [
        {
          key: "upholstery",
          reason: "value_not_accepted",
          accepted_values: ["foam", "synthetic"],
          item_values: ["down"],
        },
      ],
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

    expect(openWarning.mock.calls[0]?.[0].failures).toEqual([
      {
        key: "upholstery",
        label: "Upholstery",
        asked: "Foam / Synthetic",
        item: "Down",
        reason: "value_not_accepted",
      },
    ]);
  });

  it("compares the same way on the 409 retry as it did on the preview", async () => {
    const openWarning = vi.fn();
    const { result } = renderHook(() =>
      useStockAssignmentGate("sri-1", openWarning),
    );

    act(() => {
      void result.current.requestOverride([
        {
          key: "upholstery",
          reason: "value_not_accepted",
          accepted_values: ["foam", "synthetic"],
          item_values: ["down"],
        },
      ]);
    });
    await waitFor(() => expect(openWarning).toHaveBeenCalledTimes(1));

    // One renderer, one mapper: the sheet a user reaches by being refused must
    // read exactly like the one the preview would have shown.
    expect(openWarning.mock.calls[0]?.[0].failures).toEqual([
      {
        key: "upholstery",
        label: "Upholstery",
        asked: "Foam / Synthetic",
        item: "Down",
        reason: "value_not_accepted",
      },
    ]);
  });
});
