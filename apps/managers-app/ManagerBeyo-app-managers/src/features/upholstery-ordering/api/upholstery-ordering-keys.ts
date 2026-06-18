import type {
  ListOrderItemsParams,
  ListOrderNeedItemsParams,
  ListOrderNeedsParams,
  ListOrdersParams,
  UpholsteryOrderState,
} from "../types";

export const upholsteryOrderingKeys = {
  all: ["upholstery-ordering"] as const,
  needs: () => [...upholsteryOrderingKeys.all, "needs"] as const,
  needsCount: () => [...upholsteryOrderingKeys.needs(), "count"] as const,
  needsLists: () => [...upholsteryOrderingKeys.needs(), "list"] as const,
  needsList: (params: ListOrderNeedsParams) =>
    [...upholsteryOrderingKeys.needsLists(), params] as const,
  needsItems: (upholsteryId: string) =>
    [...upholsteryOrderingKeys.needs(), "items", upholsteryId] as const,
  needsItemsList: (params: ListOrderNeedItemsParams) =>
    [
      ...upholsteryOrderingKeys.needsItems(params.upholsteryId),
      {
        limit: params.limit,
        offset: params.offset,
        q: params.q,
      },
    ] as const,
  orders: () => [...upholsteryOrderingKeys.all, "orders"] as const,
  ordersCount: (states: readonly UpholsteryOrderState[]) =>
    [...upholsteryOrderingKeys.orders(), "count", states.join(",")] as const,
  ordersLists: () => [...upholsteryOrderingKeys.orders(), "list"] as const,
  ordersList: (params: ListOrdersParams) =>
    [...upholsteryOrderingKeys.ordersLists(), params] as const,
  orderItemsLists: () =>
    [...upholsteryOrderingKeys.orders(), "items"] as const,
  orderItemsList: (params: ListOrderItemsParams) =>
    [...upholsteryOrderingKeys.orderItemsLists(), params] as const,
};
