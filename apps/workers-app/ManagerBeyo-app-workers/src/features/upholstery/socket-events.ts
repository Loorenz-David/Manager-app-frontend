import type { SocketEventHandlers } from "@beyo/realtime";
import { upholsteryKeys } from "./api/upholstery-keys";

export const upholsterySocketEvents: SocketEventHandlers = {
  "upholstery:updated": ({ client_id }, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.detail(client_id),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.missing(),
      refetchType: "active",
    });
  },

  "upholstery:deleted": ({ client_id }, { queryClient }) => {
    queryClient.removeQueries({ queryKey: upholsteryKeys.detail(client_id) });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.missing(),
      refetchType: "active",
    });
  },

  "upholstery:inventory-updated": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.missing(),
      refetchType: "active",
    });
  },

  "upholstery:inventory-deleted": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.missing(),
      refetchType: "active",
    });
  },
};
