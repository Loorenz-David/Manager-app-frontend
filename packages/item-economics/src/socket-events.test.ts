import { notify } from "@beyo/lib";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { itemEconomicsKeys } from "./api/item-economics-keys";
import { itemEconomicsSocketEvents } from "./socket-events";

describe("itemEconomicsSocketEvents", () => {
  it("invalidates the broad task branch for step state changes", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    itemEconomicsSocketEvents["task:step-state-changed"]?.(
      [{ client_id: "tsp_step", new_state: "working" }],
      { queryClient, notify },
    );

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: itemEconomicsKeys.tasks(),
      refetchType: "active",
    });
  });

  it("invalidates one task production-time key after evaluation commit", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    itemEconomicsSocketEvents["item_economics:evaluation-committed"]?.(
      { client_id: "tsk_task", evaluation_id: "ice_evaluation" },
      { queryClient, notify },
    );

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["item-economics", "task", "tsk_task", "production-time"],
      refetchType: "active",
    });
  });
});
