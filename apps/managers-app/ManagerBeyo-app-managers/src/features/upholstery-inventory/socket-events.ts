import type { SocketEventHandlers, SocketHandlerContext } from "@beyo/realtime";
import { upholsteryKeys } from "@beyo/upholstery";
import type { UpholsteryId } from "@/types/common";

import { upholsteryInventoryKeys } from "./api/upholstery-inventory-keys";

/**
 * Requirement state changes and order create/receive/amount edits move inventory totals
 * (and add history entries) without emitting `upholstery:inventory-updated`
 * for each inventory, and their payloads don't name the inventory. Refresh
 * every open inventory detail; history is nested under detail(id).
 */
function invalidateInventoryDetails({ queryClient }: SocketHandlerContext): void {
  queryClient.invalidateQueries({
    queryKey: upholsteryInventoryKeys.details(),
    refetchType: "active",
  });
}

export const upholsterySocketEvents: SocketEventHandlers = {
  "upholstery:updated": ({ client_id }, { queryClient }) => {
    const id = client_id as UpholsteryId;

    queryClient.invalidateQueries({
      queryKey: upholsteryKeys.detail(id),
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
      queryKey: upholsteryKeys.pickerLists(),
      refetchType: "active",
    });
  },

  "upholstery:inventory-updated": ({ client_id }, { queryClient }) => {
    const id = client_id as Parameters<
      typeof upholsteryInventoryKeys.detail
    >[0];

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
    const id = client_id as Parameters<
      typeof upholsteryInventoryKeys.detail
    >[0];

    queryClient.removeQueries({
      queryKey: upholsteryInventoryKeys.detail(id),
    });
    queryClient.invalidateQueries({
      queryKey: upholsteryInventoryKeys.lists(),
      refetchType: "active",
    });
  },

  "item:upholstery-requirement-state-changed": (_payload, ctx) => {
    invalidateInventoryDetails(ctx);
  },

  "upholstery:order-created": (_payload, ctx) => {
    invalidateInventoryDetails(ctx);
  },

  "upholstery:order-received": (_payload, ctx) => {
    invalidateInventoryDetails(ctx);
  },

  "upholstery:order-updated": (_payload, ctx) => {
    invalidateInventoryDetails(ctx);
  },
};
