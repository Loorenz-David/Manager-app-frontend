import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { pendingSeatUpholsteryKeys } from "../api/pending-seat-keys";
import { usePendingUpholsterySetAmount } from "./use-pending-upholstery-set-amount";
import type { PendingSeatTasksPage } from "../api/fetch-pending-seat-tasks";
import type { PendingSeatCounts } from "../types";

vi.mock("@beyo/tasks", () => ({
  setItemUpholsteryAmount: vi.fn(async () => ({ ok: true })),
  itemUpholsteryKeys: {
    byItem: (itemId: string) => ["item-upholstery", itemId],
  },
  taskKeys: {
    detail: (taskId: string) => ["tasks", "detail", taskId],
    lists: () => ["tasks", "list"],
  },
}));

vi.mock("@beyo/upholstery", () => ({
  upholsteryKeys: { pickerLists: () => ["upholstery", "picker"] },
}));

vi.mock(
  "@/features/upholstery-inventory/api/upholstery-inventory-keys",
  () => ({
    upholsteryInventoryKeys: { lists: () => ["upholstery-inventory", "list"] },
  }),
);

const QUANTITY_PARAMS = {
  limit: 50,
  offset: 0,
  missing_selection: false,
  missing_quantity: true,
};
const SELECTION_PARAMS = {
  limit: 50,
  offset: 0,
  missing_selection: true,
  missing_quantity: false,
};

function makePage(taskIds: string[]): PendingSeatTasksPage {
  return {
    items: taskIds.map(
      (taskId) =>
        ({
          task: { client_id: taskId },
        }) as PendingSeatTasksPage["items"][number],
    ),
    limit: 50,
    offset: 0,
    hasMore: false,
  };
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("usePendingUpholsterySetAmount", () => {
  it("optimistically drops the saved task from the missing-quantity list only", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });
    queryClient.setQueryData(
      pendingSeatUpholsteryKeys.list(QUANTITY_PARAMS),
      makePage(["tsk_a", "tsk_b"]),
    );
    queryClient.setQueryData(
      pendingSeatUpholsteryKeys.list(SELECTION_PARAMS),
      makePage(["tsk_a", "tsk_c"]),
    );
    queryClient.setQueryData(pendingSeatUpholsteryKeys.counts(), {
      missing_selection_total: 2,
      missing_quantity_total: 2,
    } satisfies PendingSeatCounts);

    const { result } = renderHook(
      () => usePendingUpholsterySetAmount("itm_a"),
      { wrapper: makeWrapper(queryClient) },
    );

    result.current.mutate({
      taskId: "tsk_a",
      itemUpholsteryId: "iup_a",
      amount_meters: 2.5,
    });

    // The row leaves the visible quantity list — this removal is what the
    // AnimatedRemovalGroup on the page animates.
    await waitFor(() => {
      expect(
        queryClient.getQueryData<PendingSeatTasksPage>(
          pendingSeatUpholsteryKeys.list(QUANTITY_PARAMS),
        )?.items,
      ).toHaveLength(1);
    });

    expect(
      queryClient
        .getQueryData<PendingSeatTasksPage>(
          pendingSeatUpholsteryKeys.list(QUANTITY_PARAMS),
        )
        ?.items.map((row) => row.task.client_id),
    ).toEqual(["tsk_b"]);

    // The selection list is a different pending reason — untouched.
    expect(
      queryClient
        .getQueryData<PendingSeatTasksPage>(
          pendingSeatUpholsteryKeys.list(SELECTION_PARAMS),
        )
        ?.items.map((row) => row.task.client_id),
    ).toEqual(["tsk_a", "tsk_c"]);

    expect(
      queryClient.getQueryData<PendingSeatCounts>(
        pendingSeatUpholsteryKeys.counts(),
      ),
    ).toEqual({ missing_selection_total: 2, missing_quantity_total: 1 });
  });
});
