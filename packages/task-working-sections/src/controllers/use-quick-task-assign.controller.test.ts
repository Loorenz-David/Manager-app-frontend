import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useQuickTaskAssignController } from "./use-quick-task-assign.controller";

const queryClientMock = {
  invalidateQueries: vi.fn(),
};
const listRefetchMock = vi.fn();
const countsRefetchMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => queryClientMock,
}));

vi.mock("@beyo/tasks", () => ({
  addTaskStep: vi.fn(),
}));

vi.mock("../api/use-quick-task-list-query", () => ({
  useQuickTaskListQuery: () => ({
    data: {
      items: [
        { task: { client_id: "task_1" } },
        { task: { client_id: "task_2" } },
      ],
    },
    isPending: false,
    isFetching: false,
    isError: false,
    refetch: listRefetchMock,
  }),
}));

vi.mock("../api/use-task-counts-query", () => ({
  useTaskCountsQuery: () => ({
    data: { total: 2 },
    isFetching: false,
    isError: false,
    refetch: countsRefetchMock,
  }),
}));

describe("useQuickTaskAssignController selection modes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replaces and clears selections in single mode", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useQuickTaskAssignController({
        taskType: "pre_order",
        selectionMode: "single",
        onSelect,
      }),
    );

    act(() => result.current.handleToggleTask("task_1"));
    expect(result.current.selectedTaskIds).toEqual(["task_1"]);
    expect(result.current.isSelectionValidForSubmit).toBe(true);

    act(() => result.current.handleToggleTask("task_2"));
    expect(result.current.selectedTaskIds).toEqual(["task_2"]);

    act(() => result.current.handleToggleTask("task_2"));
    expect(result.current.selectedTaskIds).toEqual([]);
    expect(result.current.isSelectionValidForSubmit).toBe(false);
    expect(onSelect).toHaveBeenNthCalledWith(1, "task_1");
    expect(onSelect).toHaveBeenNthCalledWith(2, "task_2");
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("keeps the existing additive selection behavior in multi mode", () => {
    const { result } = renderHook(() =>
      useQuickTaskAssignController({
        taskType: "return",
      }),
    );

    act(() => result.current.handleToggleTask("task_1"));
    act(() => result.current.handleToggleTask("task_2"));
    expect(result.current.selectedTaskIds).toEqual(["task_1", "task_2"]);

    act(() => result.current.handleToggleTask("task_1"));
    expect(result.current.selectedTaskIds).toEqual(["task_2"]);
    expect(result.current.isSelectionValidForSubmit).toBe(true);
  });
});
