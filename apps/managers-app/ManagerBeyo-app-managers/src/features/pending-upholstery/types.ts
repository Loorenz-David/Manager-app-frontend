import { z } from "zod";

import type { ImageViewModel } from "@beyo/images";
import type { Item } from "@/features/items/types";
import {
  ITEM_CURRENCY,
  ITEM_STATE,
  ItemSchema,
} from "@/features/items/types";
import {
  TASK_FULFILLMENT_METHOD,
  TASK_ITEM_LOCATION,
  TASK_PRIORITY,
  TASK_RETURN_METHOD,
  TASK_RETURN_SOURCE,
  TASK_STATE,
  TASK_TYPE,
} from "@/features/tasks/types";
import type { Task, TaskViewModel } from "@/features/tasks/types";
import type { CustomerId, ItemId, TaskId } from "@/types/common";

export const PENDING_UPHOLSTERY_REASON = [
  "missing_selection",
  "missing_quantity",
] as const;
export type PendingUpholsteryReason =
  (typeof PENDING_UPHOLSTERY_REASON)[number];
export const PendingUpholsteryReasonSchema = z.enum(
  PENDING_UPHOLSTERY_REASON,
);

export const PendingSeatImageSchema = z
  .object({
    client_id: z.string(),
    image_url: z.string(),
    width_px: z.number().nullable().optional(),
    height_px: z.number().nullable().optional(),
    file_size_bytes: z.number().nullable().optional(),
  })
  .passthrough();
export type PendingSeatImage = z.infer<typeof PendingSeatImageSchema>;

export const PendingSeatRawTaskSchema = z
  .object({
    client_id: z.string(),
    task_scalar_id: z.number().int(),
    task_type: z.enum(TASK_TYPE),
    priority: z.enum(TASK_PRIORITY),
    state: z.enum(TASK_STATE),
    title: z.string().nullable(),
    summary: z.string().nullable(),
    return_source: z.enum(TASK_RETURN_SOURCE).nullable(),
    item_location: z.enum(TASK_ITEM_LOCATION).nullable(),
    return_method: z.enum(TASK_RETURN_METHOD).nullable(),
    fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).nullable(),
    additional_details: z.record(z.string(), z.unknown()).nullable(),
    ready_by_at: z.string().nullable(),
    scheduled_start_at: z.string().nullable(),
    scheduled_end_at: z.string().nullable(),
    customer_id: z.string().nullable(),
    primary_phone_number: z.string().nullable(),
    secondary_phone_number: z.string().nullable(),
    primary_email: z.string().nullable(),
    secondary_email: z.string().nullable(),
    address: z.unknown().nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
    closed_at: z.string().nullable(),
    is_deleted: z.boolean(),
    deleted_at: z.string().nullable(),
  })
  .passthrough();
export type PendingSeatRawTask = z.infer<typeof PendingSeatRawTaskSchema>;

export const PendingSeatRawItemSchema = z
  .object({
    client_id: z.string(),
    article_number: z.string().nullable(),
    sku: z.string().nullable(),
    state: z.enum(ITEM_STATE),
    item_category_id: z.string().nullable(),
    quantity: z.number().int(),
    designer: z.string().nullable(),
    height_in_cm: z.number().int().nullable(),
    width_in_cm: z.number().int().nullable(),
    depth_in_cm: z.number().int().nullable(),
    item_value_minor: z.number().int().nullable(),
    item_cost_minor: z.number().int().nullable(),
    item_currency: z.enum(ITEM_CURRENCY).nullable(),
    item_position: z.string().nullable(),
    external_id: z.string().nullable(),
    external_url: z.string().nullable(),
    external_source: z.string().nullable(),
    external_order_id: z.string().nullable(),
    item_category_snapshot: z.string().nullable(),
    item_major_category_snapshot: z.string().nullable(),
  })
  .passthrough();
export type PendingSeatRawItem = z.infer<typeof PendingSeatRawItemSchema>;

export const PendingSeatTaskRowSchema = z.object({
  task: PendingSeatRawTaskSchema,
  primary_item: PendingSeatRawItemSchema.nullable(),
  pending_upholstery_reason: PendingUpholsteryReasonSchema,
  item_upholstery_id: z.string().nullable(),
  item_images: z.array(PendingSeatImageSchema),
});
export type PendingSeatTaskRow = z.infer<typeof PendingSeatTaskRowSchema>;

export type ListPendingSeatTasksParams = {
  limit?: number;
  offset?: number;
  q?: string;
  missing_selection: boolean;
  missing_quantity: boolean;
};

export type PendingSeatCounts = {
  missing_selection_total: number;
  missing_quantity_total: number;
};

export type PendingSeatCardViewModel = {
  taskId: string;
  task: TaskViewModel;
  primaryItem: Item | null;
  firstImage: ImageViewModel | null;
  images: ImageViewModel[];
  pendingReason: PendingUpholsteryReason;
  itemUpholsteryId: string | null;
};

export function toTaskFromPendingRaw(raw: PendingSeatRawTask): Task {
  return {
    id: raw.client_id as TaskId,
    task_scalar_id: raw.task_scalar_id,
    task_type: raw.task_type,
    priority: raw.priority,
    state: raw.state,
    return_source: raw.return_source,
    item_location: raw.item_location,
    return_method: raw.return_method,
    fulfillment_method: raw.fulfillment_method,
    title: raw.title,
    summary: raw.summary,
    additional_details: raw.additional_details,
    ready_by_at: raw.ready_by_at,
    scheduled_start_at: raw.scheduled_start_at,
    scheduled_end_at: raw.scheduled_end_at,
    customer_id: raw.customer_id as CustomerId | null,
    primary_phone_number: raw.primary_phone_number,
    secondary_phone_number: raw.secondary_phone_number,
    primary_email: raw.primary_email,
    secondary_email: raw.secondary_email,
    address: raw.address as Task["address"],
    created_at: raw.created_at,
    created_by_id: null,
    updated_at: raw.updated_at,
    updated_by_id: null,
    closed_at: raw.closed_at,
    recorded_time_marked_wrong: false,
    taken_from_average: false,
  };
}

export function toItemFromPendingRaw(raw: PendingSeatRawItem): Item {
  return ItemSchema.parse({
    id: raw.client_id as ItemId,
    state: raw.state,
    article_number: raw.article_number,
    sku: raw.sku,
    item_category_id: raw.item_category_id,
    quantity: raw.quantity,
    designer: raw.designer,
    height_in_cm: raw.height_in_cm,
    width_in_cm: raw.width_in_cm,
    depth_in_cm: raw.depth_in_cm,
    item_value_minor: raw.item_value_minor,
    item_cost_minor: raw.item_cost_minor,
    item_currency: raw.item_currency,
    item_position: raw.item_position,
    external_id: raw.external_id,
    external_url: raw.external_url,
    external_source: raw.external_source,
    external_order_id: raw.external_order_id,
    item_category_snapshot: raw.item_category_snapshot,
    item_major_category_snapshot: raw.item_major_category_snapshot,
    created_at: new Date().toISOString(),
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  });
}
