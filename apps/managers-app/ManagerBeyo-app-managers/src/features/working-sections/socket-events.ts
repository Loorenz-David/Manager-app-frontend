import type { SocketEventHandlers } from "@beyo/realtime";
import { workingSectionKeys } from "./api/working-section-keys";

export const workingSectionSocketEvents: SocketEventHandlers = {
  "working_section:created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: workingSectionKeys.lists(),
      refetchType: "active",
    });
  },

  "working_section:updated": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: workingSectionKeys.lists(),
      refetchType: "active",
    });
  },

  "working_section:deleted": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: workingSectionKeys.lists(),
      refetchType: "active",
    });
  },

  "user:working_sections_updated": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: workingSectionKeys.lists(),
      refetchType: "active",
    });
  },
};
