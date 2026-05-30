import { z } from "zod";

import type { ImageViewModel } from "@beyo/images";
import { ClientIdSchema } from "@/lib/client-id";
import {
  ItemIssueSchema,
  ItemUpholsteryRequirementSchema,
  ItemUpholsterySchema,
  type Item,
} from "@/features/items/types";
import type { CustomerId, TaskId, UserId } from "@/types/common";
import { AddressSchema, DateOnlySchema } from "@/types/common";

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
export const TASK_RETURN_SOURCE = [
  "after_purchase",
  "before_purchase",
  "store_return",
] as const;
export const TASK_ITEM_LOCATION = ["store", "customer"] as const;
export const TASK_RETURN_METHOD = ["drop_off_by_customer", "pickup"] as const;
export const TASK_FULFILLMENT_METHOD = ["pickup_at_store", "delivery"] as const;
export const TASK_NOTE_TYPE = [
  "user_note",
  "system_note",
  "correction_note",
  "retraction_note",
] as const;

export type TaskType = (typeof TASK_TYPE)[number];
export type TaskPriority = (typeof TASK_PRIORITY)[number];
export type TaskState = (typeof TASK_STATE)[number];
export type TaskReturnSource = (typeof TASK_RETURN_SOURCE)[number];
export type TaskItemLocation = (typeof TASK_ITEM_LOCATION)[number];
export type TaskReturnMethod = (typeof TASK_RETURN_METHOD)[number];
export type TaskFulfillmentMethod = (typeof TASK_FULFILLMENT_METHOD)[number];
export type TaskTypeFilter = TaskType | "all";

export const TaskSchema = z.object({
  id: z.string().transform((v) => v as TaskId),
  task_scalar_id: z.number().int(),
  task_type: z.enum(TASK_TYPE),
  priority: z.enum(TASK_PRIORITY),
  state: z.enum(TASK_STATE),
  return_source: z.enum(TASK_RETURN_SOURCE).nullable(),
  item_location: z.enum(TASK_ITEM_LOCATION).nullable(),
  return_method: z.enum(TASK_RETURN_METHOD).nullable(),
  fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).nullable(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  additional_details: z.record(z.string(), z.unknown()).nullable(),
  ready_by_at: DateOnlySchema.nullable(),
  scheduled_start_at: DateOnlySchema.nullable(),
  scheduled_end_at: DateOnlySchema.nullable(),
  customer_id: z
    .string()
    .transform((v) => v as CustomerId)
    .nullable(),
  primary_phone_number: z.string().nullable(),
  secondary_phone_number: z.string().nullable(),
  primary_email: z.string().nullable(),
  secondary_email: z.string().nullable(),
  address: AddressSchema,
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z
    .string()
    .transform((v) => v as UserId)
    .nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  updated_by_id: z
    .string()
    .transform((v) => v as UserId)
    .nullable(),
  closed_at: z.string().datetime({ offset: true }).nullable(),
  recorded_time_marked_wrong: z.boolean(),
  taken_from_average: z.boolean(),
});

export type Task = z.infer<typeof TaskSchema>;

export const TaskNoteSchema = z.object({
  client_id: z.string(),
  task_id: z.string().transform((value) => value as TaskId),
  note_type: z.enum(TASK_NOTE_TYPE),
  content: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  is_deleted: z.boolean(),
  deleted_at: z.string().datetime({ offset: true }).nullable(),
});
export type TaskNote = z.infer<typeof TaskNoteSchema>;

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
  item_issues: z.array(ItemIssueSchema),
  item_upholstery: z.array(ItemUpholsterySchema),
  requirements: z.array(ItemUpholsteryRequirementSchema),
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
      latest_state_records: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional(),
    }),
  ),
  task_notes: z.array(TaskNoteSchema),
  unread_message_count: z.number().int(),
});
export type TaskDetailRaw = z.infer<typeof TaskDetailRawSchema>;

export const CreateTaskInputSchema = z.object({
  client_id: ClientIdSchema,
  task_type: z.enum(TASK_TYPE, { message: "Task type is required." }),
  priority: z.enum(TASK_PRIORITY, { message: "Priority is required." }),
  title: z.string().max(255).optional(),
  summary: z.string().max(1024).optional(),
  ready_by_at: DateOnlySchema.nullable().optional(),
  scheduled_start_at: DateOnlySchema.nullable().optional(),
  scheduled_end_at: DateOnlySchema.nullable().optional(),
  return_method: z.enum(TASK_RETURN_METHOD).optional(),
  fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).optional(),
  return_source: z.enum(TASK_RETURN_SOURCE).optional(),
  item_location: z.enum(TASK_ITEM_LOCATION).optional(),
  customer_id: z.string().min(1).optional(),
  primary_phone_number: z.string().optional(),
  secondary_phone_number: z.string().optional(),
  primary_email: z
    .string()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  secondary_email: z
    .string()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  address: AddressSchema,
  additional_details: z.record(z.string(), z.unknown()).optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = z.object({
  id: z.string().transform((v) => v as TaskId),
  title: z.string().max(255).nullable().optional(),
  summary: z.string().max(1024).nullable().optional(),
  priority: z.enum(TASK_PRIORITY).optional(),
  ready_by_at: DateOnlySchema.nullable().optional(),
  scheduled_start_at: DateOnlySchema.nullable().optional(),
  scheduled_end_at: DateOnlySchema.nullable().optional(),
  return_method: z.enum(TASK_RETURN_METHOD).nullable().optional(),
  fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).nullable().optional(),
  return_source: z.enum(TASK_RETURN_SOURCE).nullable().optional(),
  item_location: z.enum(TASK_ITEM_LOCATION).nullable().optional(),
  customer_id: z.string().min(1).nullable().optional(),
  primary_phone_number: z.string().nullable().optional(),
  secondary_phone_number: z.string().nullable().optional(),
  primary_email: z.string().email().nullable().optional().or(z.literal("")),
  secondary_email: z.string().email().nullable().optional().or(z.literal("")),
  address: AddressSchema,
  additional_details: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

export const TransitionTaskInputSchema = z.object({
  id: z.string().transform((v) => v as TaskId),
});
export type CancelTaskInput = z.infer<typeof TransitionTaskInputSchema>;
export type ResolveTaskInput = z.infer<typeof TransitionTaskInputSchema>;
export type FailTaskInput = z.infer<typeof TransitionTaskInputSchema>;

export const CreateTaskNoteInputSchema = z.object({
  task_id: z.string().transform((v) => v as TaskId),
  note_type: z.enum(TASK_NOTE_TYPE, { message: "Note type is required." }),
  content: z.record(z.string(), z.unknown()),
});
export type CreateTaskNoteInput = z.infer<typeof CreateTaskNoteInputSchema>;

export const AddItemToTaskInputSchema = z.object({
  task_id: z.string().transform((v) => v as TaskId),
  item_id: z.string().min(1),
});
export type AddItemToTaskInput = z.infer<typeof AddItemToTaskInputSchema>;

export const TaskListItemRawSchema = z.object({
  task: z.object({
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
  }),
  primary_item: z
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
  item_images: z.array(z.record(z.string(), z.unknown())),
});
export type TaskListItemRaw = z.infer<typeof TaskListItemRawSchema>;

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

export type ListTasksParams = ListTasksFullParams;

export const TaskAdditionalDetailsFieldsSchema = z.object({
  additional_details: z.string().max(4000).optional(),
});
export type TaskAdditionalDetailsFields = z.infer<
  typeof TaskAdditionalDetailsFieldsSchema
>;

export type TaskViewModel = Task & {
  display_number: string;
  state_label: string;
  priority_label: string;
  task_type_label: string;
  ready_by_formatted: string | null;
  scheduled_range_formatted: string | null;
  is_overdue: boolean;
  is_open: boolean;
  has_customer: boolean;
  has_scheduled_dates: boolean;
};

export type TaskCardViewModel = {
  taskId: string;
  task: TaskViewModel;
  item: Item | null;
  firstImage: ImageViewModel | null;
  imageCount: number;
};

export const TASK_STATE_FILTER_OPTIONS = TASK_STATE.map((state) => ({
  value: state,
  label: state.charAt(0).toUpperCase() + state.slice(1).replace("_", " "),
  testId: `task-state-option-${state}`,
}));

export const TASK_TYPE_PICKER_OPTIONS = [
  { value: "all" as const, label: "All", testId: "task-type-all" },
  { value: "return" as const, label: "Returns", testId: "task-type-return" },
  {
    value: "pre_order" as const,
    label: "Pre-Orders",
    testId: "task-type-pre-order",
  },
  {
    value: "internal" as const,
    label: "Internals",
    testId: "task-type-internal",
  },
] as const;

const dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDateOnly(dateString: string | null): string | null {
  if (!dateString) return null;
  const d = new Date(dateString);
  return Number.isNaN(d.getTime()) ? null : dateOnlyFormatter.format(d);
}

export function toTaskViewModel(task: Task): TaskViewModel {
  const readyByFormatted = formatDateOnly(task.ready_by_at);
  const startFormatted = formatDateOnly(task.scheduled_start_at);
  const endFormatted = formatDateOnly(task.scheduled_end_at);
  const scheduledRangeFormatted = startFormatted
    ? endFormatted && endFormatted !== startFormatted
      ? `${startFormatted} – ${endFormatted}`
      : startFormatted
    : null;
  const isOverdue = Boolean(
    task.ready_by_at && new Date(task.ready_by_at) < new Date(),
  );

  return {
    ...task,
    display_number: `#${task.task_scalar_id}`,
    state_label: task.state,
    priority_label: task.priority,
    task_type_label: task.task_type,
    ready_by_formatted: readyByFormatted,
    scheduled_range_formatted: scheduledRangeFormatted,
    is_overdue: isOverdue,
    is_open: !["cancelled", "failed", "resolved"].includes(task.state),
    has_customer: Boolean(task.customer_id),
    has_scheduled_dates: Boolean(task.scheduled_start_at),
  };
}

export function toOptimisticTask(input: CreateTaskInput): Task {
  return TaskSchema.parse({
    id: input.client_id,
    task_scalar_id: 0,
    task_type: input.task_type,
    priority: input.priority,
    state: "pending",
    return_source: input.return_source ?? null,
    item_location: input.item_location ?? null,
    return_method: input.return_method ?? null,
    fulfillment_method: input.fulfillment_method ?? null,
    title: input.title ?? null,
    summary: input.summary ?? null,
    additional_details: input.additional_details ?? null,
    ready_by_at: input.ready_by_at ?? null,
    scheduled_start_at: input.scheduled_start_at ?? null,
    scheduled_end_at: input.scheduled_end_at ?? null,
    customer_id: input.customer_id ?? null,
    primary_phone_number: input.primary_phone_number ?? null,
    secondary_phone_number: input.secondary_phone_number ?? null,
    primary_email: input.primary_email ?? null,
    secondary_email: input.secondary_email ?? null,
    address: input.address ?? null,
    created_at: new Date().toISOString(),
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
    closed_at: null,
    recorded_time_marked_wrong: false,
    taken_from_average: false,
  });
}
