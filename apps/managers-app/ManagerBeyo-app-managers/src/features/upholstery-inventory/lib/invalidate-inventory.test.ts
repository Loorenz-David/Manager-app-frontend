import { describe, expect, it, vi } from "vitest";

import type { QueryClient } from "@tanstack/react-query";
import { itemUpholsteryKeys } from "@beyo/tasks";

import { taskKeys } from "@/features/tasks/api/task-keys";
import {
  upholsteryInventoryKeys,
  upholsteryKeys,
} from "@/features/upholstery/api/upholstery-keys";
import { upholsteryOrderingKeys } from "@/features/upholstery-ordering/api/upholstery-ordering-keys";
import type { UpholsteryInventoryId } from "@/types/common";

import { invalidateAfterInventoryMutation } from "./invalidate-inventory";

describe("invalidateAfterInventoryMutation", () => {
  it("invalidates inventory and downstream requirement namespaces", () => {
    const queryClient = {
      invalidateQueries: vi.fn(),
    } as unknown as QueryClient;
    const inventoryId = "inv_123" as UpholsteryInventoryId;

    invalidateAfterInventoryMutation(queryClient, { inventoryId });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: upholsteryInventoryKeys.lists(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: upholsteryInventoryKeys.details(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: upholsteryInventoryKeys.detail(inventoryId),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: upholsteryKeys.pickerLists(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: upholsteryOrderingKeys.all,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: taskKeys.lists(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: taskKeys.details(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: itemUpholsteryKeys.all,
    });
  });
});
