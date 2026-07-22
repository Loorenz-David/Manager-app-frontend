import { QueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import { describe, expect, it, vi } from "vitest";
import { pauseReasonKeys } from "./api/pause-reason-keys";
import { pauseReasonSocketEvents } from "./socket-events";

describe("pause reason socket events", () => {
  it("invalidates list and detail data for an update", () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    pauseReasonSocketEvents["pause_reason:updated"]?.(
      { client_id: "par_01J3N6K2P6Z0X3Y9V7Q8W5R4T1" },
      { queryClient, notify },
    );

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: pauseReasonKeys.detail(
        "par_01J3N6K2P6Z0X3Y9V7Q8W5R4T1" as never,
      ),
      refetchType: "active",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: pauseReasonKeys.lists(),
      refetchType: "active",
    });
  });
});
