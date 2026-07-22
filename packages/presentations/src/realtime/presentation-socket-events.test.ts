import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { activePresentationKeys } from "../api/active-presentation";
import {
  presentationSocketEvents,
  type PresentationRealtimePayload,
} from "./presentation-socket-events";

const payload: PresentationRealtimePayload = {
  client_id: "aup_01JREALTIME",
  logical_client_id: "aup_01JREALTIME",
  version: 2,
};

describe("presentationSocketEvents", () => {
  it.each([
    "app_update_presentation:published",
    "app_update_presentation:archived",
  ] as const)("%s only invalidates active presentation queries", (eventName) => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    presentationSocketEvents[eventName](payload, { queryClient });

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: activePresentationKeys.all,
    });
  });
});
