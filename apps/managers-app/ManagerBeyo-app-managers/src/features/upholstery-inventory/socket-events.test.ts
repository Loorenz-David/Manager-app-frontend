import { QueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import type { SocketHandlerContext } from "@beyo/realtime";
import { describe, expect, it, vi } from "vitest";

import type { UpholsteryInventoryId } from "@/types/common";

import { upholsteryInventoryKeys } from "./api/upholstery-inventory-keys";
import { upholsterySocketEvents } from "./socket-events";

function setup() {
  const queryClient = new QueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  return { queryClient, invalidateQueries };
}

describe("upholstery inventory socket events", () => {
  it.each([
    [
      "item:upholstery-requirement-state-changed",
      { client_id: "", new_state: "available" },
    ],
    ["upholstery:order-created", { client_id: "uor_1", state: "ordered" }],
    ["upholstery:order-received", { client_id: "uor_1", state: "received" }],
  ] as const)(
    "%s invalidates every inventory detail (and its history)",
    (eventName, payload) => {
      const { queryClient, invalidateQueries } = setup();
      const handler = upholsterySocketEvents[eventName] as
        | ((payload: unknown, ctx: SocketHandlerContext) => void)
        | undefined;

      expect(handler).toBeTypeOf("function");
      handler?.(payload, { queryClient, notify });

      expect(invalidateQueries).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: upholsteryInventoryKeys.details(),
        refetchType: "active",
      });
    },
  );

  it("the details() invalidation reaches an active history query", async () => {
    const { queryClient } = setup();
    const inventoryId = "uin_1" as UpholsteryInventoryId;
    queryClient.setQueryData(upholsteryInventoryKeys.history(inventoryId), {
      pages: [],
      pageParams: [],
    });

    upholsterySocketEvents["upholstery:order-received"]?.(
      { client_id: "uor_1", state: "received" },
      { queryClient, notify },
    );

    expect(
      queryClient.getQueryState(upholsteryInventoryKeys.history(inventoryId))
        ?.isInvalidated,
    ).toBe(true);
  });

  it("inventory-updated still invalidates the detail prefix", () => {
    const { queryClient, invalidateQueries } = setup();

    upholsterySocketEvents["upholstery:inventory-updated"]?.(
      { client_id: "uin_1" },
      { queryClient, notify },
    );

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: upholsteryInventoryKeys.detail("uin_1" as UpholsteryInventoryId),
      refetchType: "active",
    });
  });
});
