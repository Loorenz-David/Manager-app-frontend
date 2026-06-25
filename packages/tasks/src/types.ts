import { z } from "zod";

import { AddressSchema, DateOnlySchema } from "@beyo/lib";

export const TASK_TYPE = ["return", "pre_order", "internal"] as const;
export const TASK_PRIORITY = ["low", "normal", "high", "urgent"] as const;
export const TASK_STATE = [
  "pending",
  "assigned",
  "working",
  "stalled",
  "ready",
  "resolved",
  "failed",
  "cancelled",
] as const;
export const TASK_RETURN_METHOD = ["drop_off_by_customer", "pickup"] as const;

export const TaskFlowRecordActorSchema = z.object({
  client_id: z.string(),
  username: z.string().nullable(),
  profile_picture: z.string().nullable(),
});
export type TaskFlowRecordActor = z.infer<typeof TaskFlowRecordActorSchema>;

export const TaskFlowRecordSchema = z.object({
  type: z.string(),
  entity_type: z.string(),
  entity_client_id: z.string(),
  description: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  created_by: TaskFlowRecordActorSchema.nullable(),
});
export type TaskFlowRecord = z.infer<typeof TaskFlowRecordSchema>;

export const TaskFlowRecordsPaginationSchema = z.object({
  has_more: z.boolean(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const ListTaskFlowRecordsResponseSchema = z.object({
  flow_records: z.array(TaskFlowRecordSchema),
  flow_records_pagination: TaskFlowRecordsPaginationSchema,
});
export type ListTaskFlowRecordsResponse = z.infer<
  typeof ListTaskFlowRecordsResponseSchema
>;

export const ItemUpholsteryEntrySchema = z.object({
  client_id: z.string(),
  item_id: z.string(),
  upholstery_id: z.string().nullable(),
  name: z.string().nullable(),
  code: z.string().nullable(),
  image_url: z.string().nullable(),
  amount_meters: z.number().nullable(),
  source: z.string(),
  time_to_fix_in_seconds: z.number().int().nullable(),
  active_requirement_id: z.string().nullable(),
});
export type ItemUpholsteryEntry = z.infer<typeof ItemUpholsteryEntrySchema>;

export const UpholsteryRequirementEntrySchema = z.object({
  client_id: z.string(),
  item_upholstery_id: z.string(),
  upholstery_inventory_id: z.string().nullable(),
  amount_meters: z.number().nullable(),
  value_minor: z.number().int().nullable(),
  currency: z.string().nullable(),
  source: z.string(),
  state: z.string(),
});
export type UpholsteryRequirementEntry = z.infer<
  typeof UpholsteryRequirementEntrySchema
>;

export const StepStateSchema = z.enum([
  "pending",
  "working",
  "paused",
  "ended_shift",
  "blocked",
  "completed",
  "skipped",
  "failed",
  "cancelled",
]);

export const TaskStepForPinSchema = z.object({
  client_id: z.string(),
  task_id: z.string(),
  state: StepStateSchema,
  working_section_name: z.string().nullable(),
  working_section_image: z.string().nullable().optional(),
});
export type TaskStepForPin = z.infer<typeof TaskStepForPinSchema>;

export const TASK_RETURN_SOURCE = [
  "after_purchase",
  "before_purchase",
  "store_return",
] as const;
export const TASK_FULFILLMENT_METHOD = ["pickup_at_store", "delivery"] as const;

export type TaskType = (typeof TASK_TYPE)[number];
export type TaskPriority = (typeof TASK_PRIORITY)[number];
export type TaskState = (typeof TASK_STATE)[number];
export type TaskReturnMethod = (typeof TASK_RETURN_METHOD)[number];
export type TaskReturnSource = (typeof TASK_RETURN_SOURCE)[number];
export type TaskFulfillmentMethod = (typeof TASK_FULFILLMENT_METHOD)[number];

export const ImageLightSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  width_px: z.number().int().nullable().optional(),
  height_px: z.number().int().nullable().optional(),
  file_size_bytes: z.number().nullable().optional(),
});
export type ImageLight = z.infer<typeof ImageLightSchema>;

export const TaskDetailRawSchema = z.object({
  task: z.object({
    client_id: z.string(),
    task_scalar_id: z.number().int(),
    task_type: z.enum(TASK_TYPE),
    priority: z.enum(TASK_PRIORITY),
    state: z.enum(TASK_STATE),
    title: z.string().nullable(),
    summary: z.string().nullable(),
    return_source: z.enum(TASK_RETURN_SOURCE).nullable(),
    item_location: z.string().nullable(),
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
    address: AddressSchema,
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    closed_at: z.string().datetime({ offset: true }).nullable(),
    is_deleted: z.boolean(),
    deleted_at: z.string().datetime({ offset: true }).nullable(),
  }),
  item: z
    .object({
      client_id: z.string(),
      article_number: z.string().nullable(),
      sku: z.string().nullable(),
      state: z.string(),
      item_category_id: z.string().nullable(),
      quantity: z.number().int(),
      designer: z.string().nullable(),
      height_in_cm: z.number().int().nullable(),
      width_in_cm: z.number().int().nullable(),
      depth_in_cm: z.number().int().nullable(),
      item_value_minor: z.number().int().nullable(),
      item_cost_minor: z.number().int().nullable(),
      item_currency: z.string().nullable(),
      item_position: z.string().nullable(),
      external_id: z.string().nullable(),
      external_url: z.string().nullable(),
      external_source: z.string().nullable(),
      external_order_id: z.string().nullable(),
      item_category_snapshot: z.string().nullable(),
      item_major_category_snapshot: z.string().nullable(),
    })
    .nullable(),
  item_images: z.array(ImageLightSchema),
  task_steps: z.array(
    z.object({
      client_id: z.string(),
      task_id: z.string(),
      state: z.string(),
      readiness_status: z.string(),
      sequence_order: z.number().int().nullable(),
      working_section_id: z.string().nullable(),
      assigned_worker_id: z.string().nullable(),
      total_dependencies: z.number().int(),
      completed_dependencies: z.number().int(),
      working_section_name_snapshot: z.string().nullable(),
      assigned_worker_display_name_snapshot: z.string().nullable(),
      created_at: z.string().datetime({ offset: true }),
      closed_at: z.string().datetime({ offset: true }).nullable(),
      latest_state_records: z.record(z.string(), z.unknown()).nullable().optional(),
    }),
  ),
  task_notes: z.array(z.unknown()),
  unread_message_count: z.number().int(),
});
export type TaskDetailRaw = z.infer<typeof TaskDetailRawSchema>;

export type ListTasksFullParams = {
  limit?: number;
  offset?: number;
  q?: string | null;
  task_types?: string;
  task_states?: string;
  task_step_states?: string;
  step_readiness_statuses?: string;
  priorities?: string;
  return_sources?: string;
  working_section_ids?: string;
  ready_from_date?: string;
  ready_to_date?: string;
  scheduled_from_date?: string;
  scheduled_to_date?: string;
  upholstery_requirement_states?: string;
  deleted?: boolean;
  order_by?: string;
};

export const TaskAdditionalDetailsFieldsSchema = z.object({
  additional_details: z.string().max(4000).optional(),
});
export type TaskAdditionalDetailsFields = z.infer<
  typeof TaskAdditionalDetailsFieldsSchema
>;

export const CreateTaskInputSchema = z.object({
  client_id: z.string(),
  task_type: z.string(),
  priority: z.string(),
  title: z.string().max(255).optional(),
  summary: z.string().max(1024).optional(),
  ready_by_at: DateOnlySchema.nullable().optional(),
  scheduled_start_at: DateOnlySchema.nullable().optional(),
  scheduled_end_at: DateOnlySchema.nullable().optional(),
  return_method: z.string().optional(),
  fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).optional(),
  return_source: z.enum(TASK_RETURN_SOURCE).optional(),
  item_location: z.string().optional(),
  customer_id: z.string().min(1).optional(),
  primary_phone_number: z.string().optional(),
  secondary_phone_number: z.string().optional(),
  primary_email: z.string().email("Enter a valid email.").optional().or(z.literal("")),
  secondary_email: z.string().email("Enter a valid email.").optional().or(z.literal("")),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
    })
    .nullable(),
  additional_details: z.record(z.string(), z.unknown()).optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
