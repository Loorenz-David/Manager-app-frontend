import { z } from "zod";

import type { ImageViewModel } from "@beyo/images";
import type { Item } from "@/features/items/types";
import {
  PendingSeatImageSchema,
  PendingSeatRawItemSchema,
  PendingSeatRawTaskSchema,
  type PendingSeatImage,
} from "@/features/pending-upholstery";
import type { TaskViewModel } from "@/features/tasks/types";

export const UPHOLSTERY_ORDER_STATE = [
  "draft",
  "pending",
  "approved",
  "ordered",
  "failed",
  "cancelled",
  "partially_received",
  "received",
] as const;
export type UpholsteryOrderState = (typeof UPHOLSTERY_ORDER_STATE)[number];
export const UpholsteryOrderStateSchema = z.enum(UPHOLSTERY_ORDER_STATE);

export const ITEM_UPHOLSTERY_REQUIREMENT_STATE = [
  "missing_quantity",
  "available",
  "needs_ordering",
  "ordered",
  "in_use",
  "completed",
  "failed",
] as const;
export type ItemUpholsteryRequirementState =
  (typeof ITEM_UPHOLSTERY_REQUIREMENT_STATE)[number];
export const ItemUpholsteryRequirementStateSchema = z.enum(
  ITEM_UPHOLSTERY_REQUIREMENT_STATE,
);

export const ACTIVE_ORDER_STATES = [
  "ordered",
  "partially_received",
] as const satisfies readonly UpholsteryOrderState[];

export const OrderNeedRowSchema = z.object({
  upholstery_id: z.string(),
  upholstery_name: z.string().nullable(),
  upholstery_code: z.string().nullable(),
  upholstery_image_url: z.string().nullable(),
  item_count: z.number().int(),
  amount_to_order_meters: z.number(),
  earliest_due_date: z.string().nullable(),
});
export type OrderNeedRow = z.infer<typeof OrderNeedRowSchema>;

export const OrderRowSchema = z.object({
  client_id: z.string(),
  upholstery_id: z.string().nullable(),
  upholstery_name: z.string().nullable(),
  upholstery_code: z.string().nullable(),
  upholstery_image_url: z.string().nullable(),
  order_amount_meters: z.number(),
  received_amount_meters: z.number().nullable(),
  expected_receive_at: z.string().nullable(),
  received_at: z.string().nullable(),
  state: UpholsteryOrderStateSchema,
  supplier_id: z.string().nullable(),
});
export type OrderRow = z.infer<typeof OrderRowSchema>;

export const OrderingItemRowSchema = z.object({
  task: PendingSeatRawTaskSchema,
  primary_item: PendingSeatRawItemSchema.nullable(),
  item_images: z.array(PendingSeatImageSchema),
  item_upholstery: z
    .object({
      client_id: z.string(),
      amount_meters: z.number().nullable(),
    })
    .nullable(),
});
export type OrderingItemRow = z.infer<typeof OrderingItemRowSchema>;

export const OrderNeedsCountSchema = z.object({
  needs_ordering_count: z.number().int(),
  upholstery_count: z.number().int(),
});
export type OrderNeedsCount = z.infer<typeof OrderNeedsCountSchema>;

export const OrdersCountSchema = z.object({
  total: z.number().int(),
  by_state: z.record(z.string(), z.number().int()),
});
export type OrdersCount = z.infer<typeof OrdersCountSchema>;

export type ListOrderNeedsParams = {
  limit?: number;
  offset?: number;
  q?: string;
};

export type ListOrderNeedItemsParams = ListOrderNeedsParams & {
  upholsteryId: string;
};

export type ListOrdersParams = ListOrderNeedsParams & {
  states?: readonly UpholsteryOrderState[];
};

export type ListOrderItemsParams = ListOrderNeedsParams & {
  upholsteryIds: readonly string[];
  requirementStates?: readonly ItemUpholsteryRequirementState[];
};

export type PaginatedRows<T> = {
  items: T[];
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type CreateUpholsteryOrderInput = {
  client_id: string;
  upholstery_id: string;
  order_amount_meters: number;
  priority_item_upholstery_ids: string[];
};

export type CreateUpholsteryOrderResponse = {
  client_id: string;
};

export type ReceiveUpholsteryOrderInput = {
  client_id: string;
  received_amount_meters: number;
  priority_item_upholstery_ids: string[];
};

export type ReceiveUpholsteryOrderResponse = {
  client_id: string;
  state: UpholsteryOrderState;
};

export type ShortageCardViewModel = {
  upholsteryId: string;
  name: string;
  code: string | null;
  imageUrl: string | null;
  itemCount: number;
  totalAmountMeters: number;
  totalAmountLabel: string;
  earliestDueDate: string | null;
  earliestDueDateLabel: string | null;
};

export type OrderCardViewModel = {
  orderId: string;
  upholsteryId: string | null;
  name: string;
  code: string | null;
  imageUrl: string | null;
  orderAmountMeters: number;
  orderAmountLabel: string;
  receivedAmountMeters: number;
  receivedAmountLabel: string;
  remainingReceivableMeters: number;
  remainingReceivableLabel: string;
  expectedReceiveAt: string | null;
  receivedAt: string | null;
  dateLabel: string | null;
  state: UpholsteryOrderState;
  stateLabel: string;
};

export type OrderingItemCardViewModel = {
  itemUpholsteryId: string;
  taskId: string;
  task: TaskViewModel;
  primaryItem: Item | null;
  firstImage: ImageViewModel | null;
  images: ImageViewModel[];
  amountMeters: number;
  amountLabel: string | null;
  dueDate: string | null;
  dueDateLabel: string | null;
};

export type OrderingImage = PendingSeatImage;
