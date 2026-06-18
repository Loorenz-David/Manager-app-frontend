import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import {
  OrderNeedRowSchema,
  OrderNeedsCountSchema,
  OrderingItemRowSchema,
  OrderRowSchema,
  OrdersCountSchema,
  UpholsteryOrderStateSchema,
} from "../types";
import type {
  CreateUpholsteryOrderResponse,
  ReceiveUpholsteryOrderResponse,
  CreateUpholsteryOrderInput,
  ListOrderItemsParams,
  ListOrderNeedItemsParams,
  ListOrderNeedsParams,
  ListOrdersParams,
  OrderNeedRow,
  OrderNeedsCount,
  OrderingItemRow,
  OrderRow,
  OrdersCount,
  PaginatedRows,
  ReceiveUpholsteryOrderInput,
  UpholsteryOrderState,
} from "../types";

const DEFAULT_LIMIT = 50;

const OrderNeedsCountResponseSchema = ApiEnvelopeSchema(OrderNeedsCountSchema).extend({
  ok: z.literal(true),
});

const OrdersCountResponseSchema = ApiEnvelopeSchema(OrdersCountSchema).extend({
  ok: z.literal(true),
});

const OrderNeedsListResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery_needs_pagination: z.object({
      items: z.array(OrderNeedRowSchema),
      limit: z.number(),
      offset: z.number(),
      has_more: z.boolean(),
    }),
  }),
).extend({ ok: z.literal(true) });

const OrdersListResponseSchema = ApiEnvelopeSchema(
  z.object({
    orders_pagination: z.object({
      items: z.array(OrderRowSchema),
      limit: z.number(),
      offset: z.number(),
      has_more: z.boolean(),
    }),
  }),
).extend({ ok: z.literal(true) });

const OrderingItemsResponseSchema = ApiEnvelopeSchema(
  z.object({
    tasks_pagination: z.object({
      items: z.array(OrderingItemRowSchema),
      limit: z.number(),
      offset: z.number(),
      has_more: z.boolean(),
    }),
  }),
).extend({ ok: z.literal(true) });

const CreateUpholsteryOrderResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() }),
).extend({ ok: z.literal(true) });

const ReceiveUpholsteryOrderResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
    state: UpholsteryOrderStateSchema,
  }),
).extend({ ok: z.literal(true) });

function csv(values: readonly string[] | undefined): string | undefined {
  return values && values.length > 0 ? values.join(",") : undefined;
}

function paginationParams(params: ListOrderNeedsParams) {
  const trimmedQ = params.q?.trim();
  return {
    limit: params.limit ?? DEFAULT_LIMIT,
    offset: params.offset ?? 0,
    ...(trimmedQ ? { q: trimmedQ } : {}),
  };
}

function mapPagination<T>(pagination: {
  items: T[];
  limit: number;
  offset: number;
  has_more: boolean;
}): PaginatedRows<T> {
  return {
    items: pagination.items,
    limit: pagination.limit,
    offset: pagination.offset,
    hasMore: pagination.has_more,
  };
}

export async function fetchOrderNeedsCount(): Promise<OrderNeedsCount> {
  const response = await apiClient.get(
    "/api/v1/upholstery-order-needs/count",
    OrderNeedsCountResponseSchema,
  );
  return response.data;
}

export async function fetchOrdersCount(
  states: readonly UpholsteryOrderState[],
): Promise<OrdersCount> {
  const response = await apiClient.get(
    "/api/v1/upholstery-orders/count",
    OrdersCountResponseSchema,
    { states: csv(states) },
  );
  return response.data;
}

export async function fetchOrderNeeds(
  params: ListOrderNeedsParams,
): Promise<PaginatedRows<OrderNeedRow>> {
  const response = await apiClient.get(
    "/api/v1/upholstery-order-needs",
    OrderNeedsListResponseSchema,
    paginationParams(params),
  );
  return mapPagination(response.data.upholstery_needs_pagination);
}

export async function fetchOrders(
  params: ListOrdersParams,
): Promise<PaginatedRows<OrderRow>> {
  const response = await apiClient.get(
    "/api/v1/upholstery-orders",
    OrdersListResponseSchema,
    {
      ...paginationParams(params),
      states: csv(params.states),
    },
  );
  return mapPagination(response.data.orders_pagination);
}

export async function fetchOrderNeedItems(
  params: ListOrderNeedItemsParams,
): Promise<PaginatedRows<OrderingItemRow>> {
  const response = await apiClient.get(
    `/api/v1/upholstery-order-needs/${params.upholsteryId}/items`,
    OrderingItemsResponseSchema,
    paginationParams(params),
  );
  return mapPagination(response.data.tasks_pagination);
}

export async function fetchOrderItems(
  params: ListOrderItemsParams,
): Promise<PaginatedRows<OrderingItemRow>> {
  const response = await apiClient.get(
    "/api/v1/upholstery-orders/items",
    OrderingItemsResponseSchema,
    {
      ...paginationParams(params),
      upholstery_ids: csv(params.upholsteryIds),
      requirement_states: csv(params.requirementStates),
    },
  );
  return mapPagination(response.data.tasks_pagination);
}

export async function createUpholsteryOrder(
  input: CreateUpholsteryOrderInput,
): Promise<CreateUpholsteryOrderResponse> {
  const response = await apiClient.put(
    "/api/v1/upholstery-orders",
    CreateUpholsteryOrderResponseSchema,
    input,
  );
  return response.data;
}

export async function receiveUpholsteryOrder(
  input: ReceiveUpholsteryOrderInput,
): Promise<ReceiveUpholsteryOrderResponse> {
  const response = await apiClient.post(
    "/api/v1/upholstery-orders/receive",
    ReceiveUpholsteryOrderResponseSchema,
    input,
  );
  return response.data;
}
