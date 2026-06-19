import type { SocketEventHandlers } from "@beyo/realtime";
import type { UpholsteryId, UpholsteryInventoryId } from "@/types/common";
import {
  upholsteryInventoryKeys,
  upholsteryKeys,
} from "./api/upholstery-keys";

export const upholsterySocketEvents: SocketEventHandlers = {
  "upholstery:updated": ({ client_id }, { queryClient }) => {
    const id = client_id as UpholsteryId;

    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.detail(id),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.pickerLists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryInventoryKeys.lists(),
      refetchType: "active",
    });
  },

  "upholstery:deleted": ({ client_id }, { queryClient }) => {
    const id = client_id as UpholsteryId;

    queryClient.removeQueries({ queryKey: upholsteryKeys.detail(id) });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.pickerLists(),
      refetchType: "active",
    });
  },

  "upholstery:inventory-updated": ({ client_id }, { queryClient }) => {
    const id = client_id as UpholsteryInventoryId;

    queryClient.invalidateQueries({
      queryKey: upholsteryInventoryKeys.detail(id),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryInventoryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.pickerLists(),
      refetchType: "active",
    });
  },

  "upholstery:inventory-deleted": ({ client_id }, { queryClient }) => {
    const id = client_id as UpholsteryInventoryId;

    queryClient.removeQueries({
      queryKey: upholsteryInventoryKeys.detail(id),
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryInventoryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.lists(),
      refetchType: "active",
    });
  },
};
