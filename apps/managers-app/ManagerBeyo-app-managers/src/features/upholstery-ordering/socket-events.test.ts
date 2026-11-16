import { QueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import type { SocketEventHandlers, SocketHandlerContext } from "@beyo/realtime";
import { describe, expect, it, vi } from "vitest";

import { upholsteryOrderingKeys } from "./api/upholstery-ordering-keys";
import { upholsteryOrderingSocketEvents } from "./socket-events";

function fire(eventName: keyof SocketEventHandlers, payload: unknown) {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const handler = upholsteryOrderingSocketEvents[eventName] as
    | ((payload: unknown, ctx: SocketHandlerContext) => void)
    | undefined;
  expect(handler).toBeTypeOf("function");
  handler?.(payload, { queryClient, notify });
  return invalidateQueries.mock.calls.map(([filters]) => filters);
}

const active = (queryKey: readonly unknown[]) => ({ queryKey, refetchType: "active" });

describe("upholstery ordering socket events", () => {
  it.each([
    ["upholstery:order-created", { client_id: "uor_1", state: "ordered" }],
    ["upholstery:order-received", { client_id: "uor_1", state: "received" }],
    [
      "upholstery:order-updated",
      { client_id: "uor_1", state: "ordered", order_amount_meters: 3 },
    ],
    ["upholstery:updated", { client_id: "uph_1" }],
    ["upholstery:inventory-deleted", { client_id: "uin_1" }],
  ] as const)("%s refreshes every ordering screen", (eventName, payload) => {
    expect(fire(eventName, payload)).toEqual([active(upholsteryOrderingKeys.all)]);
  });

  it("an inventory movement refreshes the shortage side", () => {
    expect(fire("upholstery:inventory-updated", { client_id: "uin_1" })).toEqual([
      active(upholsteryOrderingKeys.needs()),
    ]);
  });

  it("a requirement state change refreshes shortages and order items", () => {
    expect(
      fire("item:upholstery-requirement-state-changed", {
        client_id: "",
        ids: ["iup_1"],
        new_state: "needs_ordering",
      }),
    ).toEqual([
      active(upholsteryOrderingKeys.needs()),
      active(upholsteryOrderingKeys.orderItemsLists()),
    ]);
  });

  it("an order event marks an open orders list stale (what the detail header reads)", () => {
    const queryClient = new QueryClient();
    const key = upholsteryOrderingKeys.ordersList({ states: ["ordered"] } as never);
    queryClient.setQueryData(key, { items: [], limit: 50, offset: 0, hasMore: false });

    upholsteryOrderingSocketEvents["upholstery:order-updated"]?.(
      { client_id: "uor_1", state: "ordered", order_amount_meters: 3 },
      { queryClient, notify },
    );

    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });
});
