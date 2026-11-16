import type { SocketEventHandlers, SocketHandlerContext } from "@beyo/realtime";
import type { QueryKey } from "@tanstack/react-query";

import { upholsteryOrderingKeys } from "./api/upholstery-ordering-keys";

/**
 * Keeps the ordering screens (shortage list, orders list, both detail pages, the
 * header counts) live on every device. Payloads don't carry enough to patch caches
 * (requirement events don't name the inventory), so each event invalidates the
 * slice it can change; `refetchType: "active"` limits the cost to screens that are open.
 *
 * Which event moves what:
 * - order created / received / amount updated → orders and their items, and the
 *   shortage amounts (the inventory's ordered bucket moved);
 * - `upholstery:inventory-updated` (any need / stock / ordered movement — run_service
 *   sends one per touched inventory) → shortage amounts and counts;
 * - `item:upholstery-requirement-state-changed` (allocation without a movement) →
 *   which items are waiting / covered by an order;
 * - fabric renamed or an inventory removed → every row that shows it.
 */
function invalidate(
  { queryClient }: SocketHandlerContext,
  ...keys: QueryKey[]
): void {
  for (const queryKey of keys) {
    queryClient.invalidateQueries({ queryKey, refetchType: "active" });
  }
}

const everything = (ctx: SocketHandlerContext) =>
  invalidate(ctx, upholsteryOrderingKeys.all);

export const upholsteryOrderingSocketEvents: SocketEventHandlers = {
  "upholstery:order-created": (_payload, ctx) => everything(ctx),
  "upholstery:order-received": (_payload, ctx) => everything(ctx),
  "upholstery:order-updated": (_payload, ctx) => everything(ctx),

  "upholstery:inventory-updated": (_payload, ctx) =>
    invalidate(ctx, upholsteryOrderingKeys.needs()),

  "item:upholstery-requirement-state-changed": (_payload, ctx) =>
    invalidate(
      ctx,
      upholsteryOrderingKeys.needs(),
      upholsteryOrderingKeys.orderItemsLists(),
    ),

  "upholstery:updated": (_payload, ctx) => everything(ctx),
  "upholstery:inventory-deleted": (_payload, ctx) => everything(ctx),
};
