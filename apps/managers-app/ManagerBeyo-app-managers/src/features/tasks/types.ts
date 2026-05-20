import { z } from 'zod';

import { ClientIdSchema } from '@/lib/client-id';
import type { CustomerId, TaskId, UserId } from '@/types/common';
import { AddressSchema, DateOnlySchema } from '@/types/common';

export const TASK_TYPE = ['return', 'pre_order', 'internal'] as const;
export const TASK_PRIORITY = ['low', 'normal', 'high', 'urgent'] as const;
export const TASK_STATE = [
  'pending',
  'assigned',
  'working',
  'stalled',
  'ready',
  'resolved',
  'failed',
  'cancelled',
] as const;
export const TASK_RETURN_SOURCE = [
  'after_purchase',
  'before_purchase',
  'store_return',
] as const;
export const TASK_ITEM_LOCATION = ['store', 'customer'] as const;
export const TASK_RETURN_METHOD = ['drop_off_by_customer', 'pickup'] as const;
export const TASK_FULFILLMENT_METHOD = ['pickup_at_store', 'delivery'] as const;
export const TASK_NOTE_TYPE = [
  'user_note',
  'system_note',
  'correction_note',
  'retraction_note',
] as const;

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
  customer_id: z.string().transform((v) => v as CustomerId).nullable(),
  primary_phone_number: z.string().nullable(),
  secondary_phone_number: z.string().nullable(),
  primary_email: z.string().nullable(),
  secondary_email: z.string().nullable(),
  address: AddressSchema,
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string().transform((v) => v as UserId).nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  updated_by_id: z.string().transform((v) => v as UserId).nullable(),
  closed_at: z.string().datetime({ offset: true }).nullable(),
  recorded_time_marked_wrong: z.boolean(),
  taken_from_average: z.boolean(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInputSchema = z.object({
  client_id: ClientIdSchema,
  task_type: z.enum(TASK_TYPE, { message: 'Task type is required.' }),
  priority: z.enum(TASK_PRIORITY, { message: 'Priority is required.' }),
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
    .email('Enter a valid email.')
    .optional()
    .or(z.literal('')),
  secondary_email: z
    .string()
    .email('Enter a valid email.')
    .optional()
    .or(z.literal('')),
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
  primary_email: z.string().email().nullable().optional().or(z.literal('')),
  secondary_email: z.string().email().nullable().optional().or(z.literal('')),
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
  note_type: z.enum(TASK_NOTE_TYPE, { message: 'Note type is required.' }),
  content: z.record(z.string(), z.unknown()),
});
export type CreateTaskNoteInput = z.infer<typeof CreateTaskNoteInputSchema>;

export const AddItemToTaskInputSchema = z.object({
  task_id: z.string().transform((v) => v as TaskId),
  item_id: z.string().min(1),
});
export type AddItemToTaskInput = z.infer<typeof AddItemToTaskInputSchema>;

export type ListTasksParams = {
  limit?: number;
  offset?: number;
};

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

const dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
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
  const isOverdue = Boolean(task.ready_by_at && new Date(task.ready_by_at) < new Date());

  return {
    ...task,
    display_number: `#${task.task_scalar_id}`,
    state_label: task.state,
    priority_label: task.priority,
    task_type_label: task.task_type,
    ready_by_formatted: readyByFormatted,
    scheduled_range_formatted: scheduledRangeFormatted,
    is_overdue: isOverdue,
    is_open: !['cancelled', 'failed', 'resolved'].includes(task.state),
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
    state: 'pending',
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
