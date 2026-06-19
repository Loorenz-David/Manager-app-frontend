import type { SocketEventHandlers } from "@beyo/realtime";
import { itemUpholsteryKeys as tasksItemUpholsteryKeys } from "@beyo/tasks";
import { pendingSeatUpholsteryKeys } from "@/features/pending-upholstery/api/pending-seat-keys";
import { upholsteryOrderingKeys } from "@/features/upholstery-ordering/api/upholstery-ordering-keys";
import { itemUpholsteryKeys } from "@/features/upholstery_requirements/api/upholstery-requirement-keys";
import type { ItemId, ItemUpholsteryId } from "@/types/common";
import { itemKeys } from "./api/item-keys";

export const itemSocketEvents: SocketEventHandlers = {
  "item:created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: itemKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: itemKeys.all,
      refetchType: "active",
    });
  },

  "item:updated": ({ client_id }, { queryClient }) => {
    const itemId = client_id as ItemId;

    queryClient.invalidateQueries({
      queryKey: itemKeys.detail(itemId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: itemKeys.lists(),
      refetchType: "active",
    });
  },

  "item:deleted": ({ client_id }, { queryClient }) => {
    const itemId = client_id as ItemId;

    queryClient.removeQueries({ queryKey: itemKeys.detail(itemId) });
    queryClient.invalidateQueries({
      queryKey: itemKeys.lists(),
      refetchType: "active",
    });
  },

  "item:upholstery-created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: tasksItemUpholsteryKeys.all,
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: itemUpholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: pendingSeatUpholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: pendingSeatUpholsteryKeys.counts(),
      refetchType: "active",
    });
  },

  "item:upholstery-updated": ({ client_id }, { queryClient }) => {
    const id = client_id as ItemUpholsteryId;

    queryClient.invalidateQueries({
      queryKey: tasksItemUpholsteryKeys.all,
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: itemUpholsteryKeys.detail(id),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: itemUpholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: pendingSeatUpholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: pendingSeatUpholsteryKeys.counts(),
      refetchType: "active",
    });
  },

  "item:upholstery-deleted": ({ client_id }, { queryClient }) => {
    const id = client_id as ItemUpholsteryId;

    queryClient.invalidateQueries({
      queryKey: tasksItemUpholsteryKeys.all,
      refetchType: "active",
    });
    queryClient.removeQueries({ queryKey: itemUpholsteryKeys.detail(id) });
    queryClient.invalidateQueries({
      queryKey: itemUpholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: pendingSeatUpholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: pendingSeatUpholsteryKeys.counts(),
      refetchType: "active",
    });
  },

  "item:upholstery-requirement-state-changed": ({ client_id }, { queryClient }) => {
    const id = client_id as ItemUpholsteryId;

    queryClient.invalidateQueries({
      queryKey: tasksItemUpholsteryKeys.all,
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: itemUpholsteryKeys.detail(id),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: pendingSeatUpholsteryKeys.lists(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: pendingSeatUpholsteryKeys.counts(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryOrderingKeys.needs(),
      refetchType: "active",
    });
  },
};
