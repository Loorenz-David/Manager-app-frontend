import { z } from "zod";

/**
 * Wire schemas for GET /api/v1/upholstery-inventories/{id}/history.
 *
 * `movement_type` and `trigger` stay plain strings: the backend can add new
 * origins without a frontend release, and the presenter falls back to a
 * humanised label for anything it does not know.
 */

export const INVENTORY_HISTORY_BUCKET_KEYS = [
  "stored",
  "in_use",
  "in_need",
  "ordered",
  "total_used",
  "total_used_inventory",
  "total_used_surplus",
  "total_surplus",
] as const;

export type InventoryHistoryBucketKey =
  (typeof INVENTORY_HISTORY_BUCKET_KEYS)[number];

export const InventoryHistoryBucketsSchema = z.object({
  stored: z.string(),
  in_use: z.string(),
  in_need: z.string(),
  ordered: z.string(),
  total_used: z.string(),
  total_used_inventory: z.string(),
  total_used_surplus: z.string(),
  total_surplus: z.string(),
});

export const InventoryHistoryActorSchema = z.object({
  client_id: z.string(),
  username: z.string().nullable(),
  profile_picture: z.string().nullable(),
});

export const InventoryHistoryRequirementSchema = z.object({
  client_id: z.string(),
  from_state: z.string().nullable(),
  to_state: z.string().nullable(),
});

export const InventoryHistoryTaskSchema = z.object({
  client_id: z.string(),
  task_scalar_id: z.number().int(),
  title: z.string().nullable(),
  state: z.string(),
  is_deleted: z.boolean(),
});

export const InventoryHistoryItemSchema = z.object({
  client_id: z.string(),
  article_number: z.string().nullable(),
  sku: z.string().nullable(),
  item_category_snapshot: z.string().nullable(),
});

export const InventoryHistoryOrderSchema = z.object({
  client_id: z.string(),
  state: z.string(),
  order_amount_meters: z.string().nullable(),
  received_amount_meters: z.string().nullable(),
});

const InventoryHistoryRecordBaseSchema = z.object({
  client_id: z.string(),
  movement_type: z.string(),
  trigger: z.string(),
  created_at: z.string(),
  is_reconstructed: z.boolean(),
  created_by: InventoryHistoryActorSchema.nullable(),
  quantity_meters: z.string().nullable(),
  before: InventoryHistoryBucketsSchema.nullable(),
  after: InventoryHistoryBucketsSchema.nullable(),
  delta: InventoryHistoryBucketsSchema.nullable(),
  requirement: InventoryHistoryRequirementSchema.nullable(),
  task: InventoryHistoryTaskSchema.nullable(),
  task_resolution: z.enum(["recorded", "inferred"]).nullable(),
  item: InventoryHistoryItemSchema.nullable(),
  upholstery_order: InventoryHistoryOrderSchema.nullable(),
  anomaly: z.string().nullable(),
  note: z.string().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
  chain_break: z.boolean(),
});

/** Children are one level deep; any `children` key they carry is dropped. */
export const InventoryHistoryChildRecordSchema = InventoryHistoryRecordBaseSchema;

export const InventoryHistoryRecordSchema =
  InventoryHistoryRecordBaseSchema.extend({
    children: z.array(InventoryHistoryChildRecordSchema).default([]),
  });

export const InventoryHistoryIntegritySchema = z.object({
  status: z.enum(["consistent", "drift", "no_baseline"]),
  latest_record_id: z.string().nullable(),
  pointer_matches: z.boolean(),
  expected: InventoryHistoryBucketsSchema.nullable(),
  current: InventoryHistoryBucketsSchema,
  drift: InventoryHistoryBucketsSchema.nullable(),
});

export const InventoryHistoryPaginationSchema = z.object({
  limit: z.number().int(),
  has_more: z.boolean(),
  next_cursor: z.string().nullable(),
});

export const InventoryHistoryPageSchema = z.object({
  records: z.array(InventoryHistoryRecordSchema),
  integrity: InventoryHistoryIntegritySchema.nullable(),
  pagination: InventoryHistoryPaginationSchema,
});

export type InventoryHistoryBuckets = z.infer<
  typeof InventoryHistoryBucketsSchema
>;
export type InventoryHistoryActor = z.infer<typeof InventoryHistoryActorSchema>;
export type InventoryHistoryTask = z.infer<typeof InventoryHistoryTaskSchema>;
/** Fields shared by top-level records and their children. */
export type InventoryHistoryChildRecord = z.infer<
  typeof InventoryHistoryChildRecordSchema
>;
export type InventoryHistoryRecord = z.infer<
  typeof InventoryHistoryRecordSchema
>;
export type InventoryHistoryIntegrity = z.infer<
  typeof InventoryHistoryIntegritySchema
>;
export type InventoryHistoryPage = z.infer<typeof InventoryHistoryPageSchema>;
