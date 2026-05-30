import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestQueryClient,
  createTestWrapper,
} from "@/test-utils/query-client";
import { taskKeys } from "@/features/tasks/api/task-keys";

const { updateItemUpholsteryMock } = vi.hoisted(() => ({
  updateItemUpholsteryMock: vi.fn(),
}));

vi.mock("../api/update-item-upholstery", () => ({
  updateItemUpholstery: updateItemUpholsteryMock,
}));

import { useUpdateItemUpholstery } from "./use-update-item-upholstery";

describe("useUpdateItemUpholstery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates the task detail query after the mutation settles", async () => {
    updateItemUpholsteryMock.mockResolvedValue({
      ok: true,
      warnings: [],
      data: {},
    });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateItemUpholstery("task_123"), {
      wrapper: createTestWrapper(queryClient),
    });

    await result.current.mutateAsync({
      itemUpholsteryId: "item_upholstery_123",
      upholstery_id: "upholstery_456",
    });

    await waitFor(() => {
      expect(updateItemUpholsteryMock).toHaveBeenCalledTimes(1);
      expect(updateItemUpholsteryMock.mock.calls[0]?.[0]).toEqual({
        itemUpholsteryId: "item_upholstery_123",
        upholstery_id: "upholstery_456",
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: taskKeys.detail("task_123" as never),
      });
    });
  });
});
