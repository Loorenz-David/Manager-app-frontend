import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  ACTIVE_ORDER_STATES,
  type ListOrderItemsParams,
  type ListOrderNeedItemsParams,
  type ListOrderNeedsParams,
  type ListOrdersParams,
  type UpholsteryOrderState,
} from "../types";
import {
  fetchOrderItems,
  fetchOrderNeedItems,
  fetchOrderNeeds,
  fetchOrderNeedsCount,
  fetchOrders,
  fetchOrdersCount,
} from "./fetch-upholstery-ordering";
import { upholsteryOrderingKeys } from "./upholstery-ordering-keys";

export function useOrderNeedsCountQuery() {
  return useQuery({
    queryKey: upholsteryOrderingKeys.needsCount(),
    queryFn: fetchOrderNeedsCount,
  });
}

export function useOrdersCountQuery(
  states: readonly UpholsteryOrderState[] = ACTIVE_ORDER_STATES,
) {
  return useQuery({
    queryKey: upholsteryOrderingKeys.ordersCount(states),
    queryFn: () => fetchOrdersCount(states),
  });
}

export function useOrderNeedsQuery(params: ListOrderNeedsParams, enabled = true) {
  return useQuery({
    queryKey: upholsteryOrderingKeys.needsList(params),
    queryFn: () => fetchOrderNeeds(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useOrdersQuery(params: ListOrdersParams, enabled = true) {
  return useQuery({
    queryKey: upholsteryOrderingKeys.ordersList(params),
    queryFn: () => fetchOrders(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useOrderNeedItemsQuery(
  params: ListOrderNeedItemsParams,
  enabled = true,
) {
  return useQuery({
    queryKey: upholsteryOrderingKeys.needsItemsList(params),
    queryFn: () => fetchOrderNeedItems(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useOrderItemsQuery(params: ListOrderItemsParams, enabled = true) {
  return useQuery({
    queryKey: upholsteryOrderingKeys.orderItemsList(params),
    queryFn: () => fetchOrderItems(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}
