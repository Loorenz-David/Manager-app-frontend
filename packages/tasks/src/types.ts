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

export const ItemIssueSchema = z.object({
  client_id: z.string(),
  item_id: z.string(),
  issue_type_id: z.string(),
  issue_severity_id: z.string().nullable(),
  state: z.string(),
  base_time_seconds: z.number().int().nullable(),
  time_multiplier: z.number().nullable(),
  issue_name_snapshot: z.string().nullable(),
  severity_name_snapshot: z.string().nullable(),
  created_by_id: z.string().nullable(),
  created_at: z.string().nullable(),
  started_at: z.string().nullable(),
  resolved_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});
export type ItemIssue = z.infer<typeof ItemIssueSchema>;

export const IssueCategoryConfigSchema = z.object({
  client_id: z.string(),
  item_category_id: z.string(),
  issue_type_id: z.string(),
  base_time_seconds: z.number().int(),
  issue_type_name: z.string(),
});
export type IssueCategoryConfig = z.infer<typeof IssueCategoryConfigSchema>;

export type ListIssueCategoryConfigsParams = {
  item_category_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export const ItemIssueFieldEntrySchema = z.object({
  issue_id: z.string().min(1),
  issue_severity_id: z.string().optional().or(z.literal("")),
});
export type ItemIssueFieldEntry = z.infer<typeof ItemIssueFieldEntrySchema>;

export const ItemUpholsteryEntrySchema = z.object({
  client_id: z.string(),
  item_id: z.string(),
  upholstery_id: z.string(),
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
