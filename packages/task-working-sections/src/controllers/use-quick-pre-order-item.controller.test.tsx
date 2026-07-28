import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ItemLookupResult } from "@beyo/items";
import type { TaskListItemRaw } from "@beyo/tasks";

import { useQuickPreOrderItemController } from "./use-quick-pre-order-item.controller";

const mutateAsyncMock = vi.fn();

vi.mock("@beyo/tasks", () => ({
  useUpdateItem: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

function buildTask(): TaskListItemRaw {
  return {
    task: { client_id: "task_1" },
    primary_item: {
      client_id: "item_1",
      article_number: "OLD-123",
      sku: "SKU-OLD",
      quantity: 2,
    },
  } as TaskListItemRaw;
}

function buildLookupResult(): ItemLookupResult {
  return {
    article_number: "0000123",
    sku: "SKU-LOOKUP",
    item_category_id: null,
    quantity: 4,
    external_id: "purchase_1",
    external_source: "purchase_api",
    images: [],
  };
}

describe("useQuickPreOrderItemController", () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue({});
  });

  it("prefills from the selected task primary item", async () => {
    const { result } = renderHook(() =>
      useQuickPreOrderItemController({ task: buildTask() }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues()).toEqual({
        item: {
          article_number: "OLD-123",
          quantity: 2,
        },
      });
    });
  });

  it("patches only changed article number and quantity fields", async () => {
    const { result } = renderHook(() =>
      useQuickPreOrderItemController({ task: buildTask() }),
    );

    act(() => {
      result.current.form.setValue("item.article_number", "NEW-456");
      result.current.form.setValue("item.quantity", 3);
    });

    let succeeded = false;
    await act(async () => {
      succeeded = await result.current.submitItemPatch();
    });

    expect(succeeded).toBe(true);
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      id: "item_1",
      article_number: "NEW-456",
      quantity: 3,
    });
    expect(mutateAsyncMock.mock.calls[0]?.[0]).not.toHaveProperty("sku");
  });

  it("skips the request when values are unchanged", async () => {
    const { result } = renderHook(() =>
      useQuickPreOrderItemController({ task: buildTask() }),
    );

    let succeeded = false;
    await act(async () => {
      succeeded = await result.current.submitItemPatch();
    });

    expect(succeeded).toBe(true);
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("preserves values and sets a field error when the patch rejects", async () => {
    mutateAsyncMock.mockRejectedValueOnce(new Error("failed"));
    const { result } = renderHook(() =>
      useQuickPreOrderItemController({ task: buildTask() }),
    );

    act(() => {
      result.current.form.setValue("item.article_number", "FAILED-789");
    });

    let succeeded = true;
    await act(async () => {
      succeeded = await result.current.submitItemPatch();
    });

    expect(succeeded).toBe(false);
    expect(result.current.form.getValues("item.article_number")).toBe(
      "FAILED-789",
    );
    expect(
      result.current.form.getFieldState("item.article_number").error?.message,
    ).toBe("Could not save the item. Try again.");
  });

  it("ignores a lookup fired against the untouched stored article number", async () => {
    const { result } = renderHook(() =>
      useQuickPreOrderItemController({ task: buildTask() }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues("item.article_number")).toBe(
        "OLD-123",
      );
    });

    let lookupResult: boolean | "invalid" = true;
    act(() => {
      lookupResult = result.current.handleLookupResult([buildLookupResult()]);
    });

    expect(lookupResult).toBe(false);
    expect(result.current.form.getValues("item.quantity")).toBe(2);
    expect(result.current.form.getValues("item.article_number")).toBe(
      "OLD-123",
    );
  });

  it("applies a lookup match once and preserves a hand-edited quantity", () => {
    const { result } = renderHook(() =>
      useQuickPreOrderItemController({ task: buildTask() }),
    );
    const match = buildLookupResult();

    // The manager typed a new article number — only then may a match write back.
    act(() => {
      result.current.form.setValue("item.article_number", "123");
    });

    let firstResult: boolean | "invalid" = false;
    act(() => {
      firstResult = result.current.handleLookupResult([match]);
    });
    expect(firstResult).toBe(true);
    expect(result.current.form.getValues("item.article_number")).toBe(
      "0000123",
    );
    expect(result.current.form.getValues("item.quantity")).toBe(4);

    act(() => {
      result.current.form.setValue("item.quantity", 9);
    });

    let secondResult: boolean | "invalid" = true;
    act(() => {
      secondResult = result.current.handleLookupResult([match]);
    });
    expect(secondResult).toBe(false);
    expect(result.current.form.getValues("item.quantity")).toBe(9);
  });

  it("returns invalid for a miss without changing form values", async () => {
    const { result } = renderHook(() =>
      useQuickPreOrderItemController({ task: buildTask() }),
    );

    await waitFor(() => {
      expect(result.current.form.getValues("item.article_number")).toBe(
        "OLD-123",
      );
    });

    act(() => {
      result.current.form.setValue("item.article_number", "MISSING-1");
    });

    let lookupResult: boolean | "invalid" = false;
    act(() => {
      lookupResult = result.current.handleLookupResult([]);
    });

    expect(lookupResult).toBe("invalid");
    expect(result.current.form.getValues()).toEqual({
      item: {
        article_number: "MISSING-1",
        quantity: 2,
      },
    });
  });

  it("reports item changes only once a value differs from the stored item", async () => {
    const { result } = renderHook(() =>
      useQuickPreOrderItemController({ task: buildTask() }),
    );

    await waitFor(() => {
      expect(result.current.hasItemChanges).toBe(false);
    });

    act(() => {
      result.current.form.setValue("item.quantity", 5, { shouldDirty: true });
    });

    await waitFor(() => {
      expect(result.current.hasItemChanges).toBe(true);
    });
  });
});
