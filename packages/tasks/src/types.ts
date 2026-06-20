import { z } from "zod";

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
