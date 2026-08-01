import { z } from "zod";
import type {
  TaskId,
  TaskStepId,
  UserId,
  WorkingSectionId,
} from "@beyo/lib";
import { PauseReasonSchema } from "@beyo/pause-reasons";
import { UpholsteryGroupFieldsSchema } from "@beyo/upholstery";

export const QuickPreOrderItemFormSchema = z.object({
  item: z.object({
    article_number: z
      .string()
      .trim()
      .min(1, { message: "Enter the article number." })
      .max(128),
    quantity: z
      .number({ message: "Enter a quantity." })
      .int()
      .min(1, { message: "Quantity must be at least 1." }),
  }),
});

export type QuickPreOrderItemFormValues = z.infer<
  typeof QuickPreOrderItemFormSchema
>;

// ─── Working-section step item ────────────────────────────────────────────────
// The canonical step-row shape returned by `GET /working-sections/{id}/steps`
// and, with one added `acknowledgment` key, by
// `GET /task-step-acknowledgments/reassigned-steps` (handoff §11). Promoted out
// of the workers app so both the app and this package share one definition.

const TaskIdSchema = z.string().transform((value) => value as TaskId);
const TaskStepIdSchema = z.string().transform((value) => value as TaskStepId);
const WorkingSectionIdSchema = z
  .string()
  .transform((value) => value as WorkingSectionId);
const UserIdSchema = z.string().transform((value) => value as UserId);

export const DependencyWorkingSectionRefSchema = z.object({
  client_id: WorkingSectionIdSchema,
  name: z.string(),
  image: z.string().nullable(),
  order_list: z.number(),
});
export type DependencyWorkingSectionRef = z.infer<
  typeof DependencyWorkingSectionRefSchema
>;

// `ended_shift` is deliberately retained: the backend still returns it during
// the interim window before `INTENTION_ended_shift_step_state_collapse_20260731`
// lands (handoff §6.1). Parse it, never branch on it — treat it as `paused`.
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
]) satisfies z.ZodType<import("@beyo/tasks").StepState>;
export type StepState = z.infer<typeof StepStateSchema>;

export const STEP_TERMINAL_STATES = new Set<StepState>([
  "completed",
  "skipped",
  "failed",
  "cancelled",
]);

export const STEP_QUICK_TRANSITION: Partial<Record<StepState, StepState>> = {
  pending: "working",
  working: "paused",
  paused: "working",
  ended_shift: "working",
};

export const UserRefSchema = z.object({
  client_id: UserIdSchema,
  username: z.string(),
  profile_picture: z.string().nullable(),
});

export const StepDependencyEntrySchema = z.object({
  working_section: DependencyWorkingSectionRefSchema,
  prerequisite_step_state: StepStateSchema,
});
export type StepDependencyEntry = z.infer<typeof StepDependencyEntrySchema>;

export const LastStateRecordSchema = z.object({
  state: StepStateSchema,
  // The pause reason as a full nested object (renamed from the old flat
  // `pause_reason_id`); populated for paused/ended-shift records, null
  // otherwise. Optional for resilience against older cached payloads.
  pause_reason: PauseReasonSchema.nullable().optional(),
  entered_at: z.string(),
  exited_at: z.string().nullable(),
  last_action_by: UserRefSchema.nullable().optional(),
  first_started_at: z.string().nullable().optional(),
});
export type LastStateRecord = z.infer<typeof LastStateRecordSchema>;

export const TaskSnapshotSchema = z.object({
  client_id: TaskIdSchema,
  task_type: z.enum(["return", "pre_order", "internal"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  state: z.string(),
  assortment: z.string().nullable(),
  return_source: z
    .enum(["after_purchase", "before_purchase", "store_return"])
    .nullable(),
  item_location: z.string().nullable(),
  ready_by_at: z.string().nullable(),
  scheduled_start_at: z.string().nullable(),
  scheduled_end_at: z.string().nullable(),
  return_method: z.string().nullable(),
});
export type TaskSnapshot = z.infer<typeof TaskSnapshotSchema>;
export type TaskType = TaskSnapshot["task_type"];

export const UpholsteryRequirementSchema = z.object({
  client_id: z.string(),
  item_upholstery_id: z.string().nullable().optional(),
  upholstery_id: z.string().nullable().optional(),
  state: z.string(),
  source: z.string(),
  amount_meters: z.number().nullable(),
});

export const ItemSnapshotSchema = z
  .object({
    client_id: z.string(),
    article_number: z.string().nullable(),
    sku: z.string().nullable(),
    state: z.string(),
    item_category_id: z.string().nullable(),
    quantity: z.number(),
    item_position: z.string().nullable(),
    item_zone: z.string().nullable(),
    upholstery_requirement: z.array(UpholsteryRequirementSchema),
  })
  .nullable();

// Handoff §5.7: the array is heterogeneous — index 0 carries the rich shape,
// every later element carries only the five light keys.
export const ItemImageLightSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  width_px: z.number().nullable(),
  height_px: z.number().nullable(),
  file_size_bytes: z.number().nullable(),
});

export const ItemImageFullSchema = ItemImageLightSchema.extend({
  storage_provider: z.string(),
  source_type: z.string(),
  source_reference: z.string().nullable(),
  created_at: z.string(),
  last_event: z.unknown().nullable(),
  events: z.array(z.unknown()),
  image_annotation: z.unknown().nullable(),
});

export const ItemImageSchema = z.union([
  ItemImageFullSchema,
  ItemImageLightSchema,
]);
export type ItemImage = z.infer<typeof ItemImageSchema>;

export const CasesSummarySchema = z.object({
  total_unread: z.number().int(),
});
export type CasesSummary = z.infer<typeof CasesSummarySchema>;

export const ReadinessStatusSchema = z.enum(["ready", "blocked", "partial"]);
export type ReadinessStatus = z.infer<typeof ReadinessStatusSchema>;

export const WorkingSectionStepItemSchema = z
  .object({
    client_id: TaskStepIdSchema,
    task_id: TaskIdSchema,
    state: StepStateSchema,
    readiness_status: ReadinessStatusSchema,
    sequence_order: z.number().nullable(),
    working_section_id: WorkingSectionIdSchema,
    assigned_worker_id: z.string().nullable(),
    total_dependencies: z.number(),
    completed_dependencies: z.number(),
    working_section_name_snapshot: z.string(),
    assigned_worker_display_name_snapshot: z.string().nullable(),
    created_at: z.string(),
    closed_at: z.string().nullable(),
    total_working_seconds: z.number().int(),
    total_pause_seconds: z.number().int(),
    total_ended_shift_seconds: z.number().int(),
    total_working_count: z.number().int(),
    total_pause_count: z.number().int(),
    total_ended_shift_count: z.number().int(),
    total_issues_count: z.number().int(),
    total_issues_resolved_count: z.number().int(),
    total_cost_minor: z.number().int().nullable(),
    // Nullable per handoff §5.1, and the §3.6 example ships `null` — the
    // pre-promotion app schema declared it non-nullable, which would have
    // failed validation on every never-updated step.
    updated_at: z.string().nullable(),
    created_by: UserRefSchema,
    updated_by: UserRefSchema.nullable(),
    last_state_record: LastStateRecordSchema.nullable(),
    task: TaskSnapshotSchema,
    item: ItemSnapshotSchema,
    item_images: z.array(ItemImageSchema),
    cases_summary: CasesSummarySchema.nullable().optional(),
    is_reassigned: z.boolean().default(false),
    dependency_working_sections: z.array(StepDependencyEntrySchema).default([]),
  })
  .extend(UpholsteryGroupFieldsSchema.shape);
export type WorkingSectionStepItem = z.infer<
  typeof WorkingSectionStepItemSchema
>;

export const TaskStepsPaginationSchema = z.object({
  items: z.array(WorkingSectionStepItemSchema),
  limit: z.number(),
  offset: z.number(),
  has_more: z.boolean(),
});
export type TaskStepsPagination = z.infer<typeof TaskStepsPaginationSchema>;

// ─── Reassigned steps ─────────────────────────────────────────────────────────
// `GET /task-step-acknowledgments/reassigned-steps` (handoff §3). Deliberately
// NOT shared with the `/pending` modal payload — that one carries a similar but
// narrower shape (handoff §9).

export const TaskStepAcknowledgmentSchema = z.object({
  client_id: z.string(),
  step_id: TaskStepIdSchema,
  task_id: TaskIdSchema,
  reason: z.string().nullable(),
  worker: UserRefSchema.nullable(),
  created_by: UserRefSchema.nullable(),
  first_seen_at: z.string().nullable(),
  acknowledged_at: z.string().nullable(),
  created_at: z.string(),
});
export type TaskStepAcknowledgment = z.infer<
  typeof TaskStepAcknowledgmentSchema
>;

export const ReassignedStepItemSchema = WorkingSectionStepItemSchema.extend({
  acknowledgment: TaskStepAcknowledgmentSchema,
});
export type ReassignedStepItem = z.infer<typeof ReassignedStepItemSchema>;

// Handoff §5.9 — the `working_sections` map value.
export const WorkingSectionCompactSchema = z.object({
  client_id: WorkingSectionIdSchema,
  name: z.string(),
  image: z.string().nullable(),
  order_list: z.number().nullable(),
  allows_batch_working: z.boolean(),
  allows_shopify_product_modifications: z.boolean(),
});
export type WorkingSectionCompact = z.infer<typeof WorkingSectionCompactSchema>;

export const ReassignedStepsPaginationSchema = z.object({
  items: z.array(ReassignedStepItemSchema),
  limit: z.number(),
  offset: z.number(),
  has_more: z.boolean(),
});
export type ReassignedStepsPagination = z.infer<
  typeof ReassignedStepsPaginationSchema
>;

export const ReassignedStepsResponseSchema = z.object({
  steps_pagination: ReassignedStepsPaginationSchema,
  working_sections: z.record(z.string(), WorkingSectionCompactSchema),
});
export type ReassignedStepsResponse = z.infer<
  typeof ReassignedStepsResponseSchema
>;

export const ReassignedStepsCountSchema = z.object({
  total: z.number().int(),
  unacknowledged: z.number().int(),
});
export type ReassignedStepsCount = z.infer<typeof ReassignedStepsCountSchema>;

export const ReassignedStepsCountResponseSchema = z.object({
  reassigned_steps_count: ReassignedStepsCountSchema,
});

export type ListReassignedStepsParams = {
  limit?: number;
  offset?: number;
  /** Trimmed client-side; never sent longer than 200 chars (handoff §3.1). */
  q?: string;
  unacknowledged_only?: boolean;
};
