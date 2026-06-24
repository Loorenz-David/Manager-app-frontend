import { z } from "zod";

import { DateOnlySchema } from "@beyo/lib";

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

export type TaskReturnSource = (typeof TASK_RETURN_SOURCE)[number];
export type TaskFulfillmentMethod = (typeof TASK_FULFILLMENT_METHOD)[number];

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
