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
