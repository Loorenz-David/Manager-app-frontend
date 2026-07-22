import type { PauseReasonId } from "@beyo/lib";
import type { SocketEventHandlers } from "@beyo/realtime";
import { pauseReasonKeys } from "./api/pause-reason-keys";

export const pauseReasonSocketEvents: SocketEventHandlers = {
  "pause_reason:created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: pauseReasonKeys.lists(),
      refetchType: "active",
    });
  },

  "pause_reason:updated": ({ client_id }, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: pauseReasonKeys.detail(client_id as PauseReasonId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: pauseReasonKeys.lists(),
      refetchType: "active",
    });
  },

  "pause_reason:deleted": ({ client_id }, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: pauseReasonKeys.detail(client_id as PauseReasonId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: pauseReasonKeys.lists(),
      refetchType: "active",
    });
  },
};
