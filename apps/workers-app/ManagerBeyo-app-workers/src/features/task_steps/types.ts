import { z } from "zod";
import type { TaskId, TaskStepId, WorkingSectionId, UserId } from "@beyo/lib";
import {
  ImageAnnotationSchema,
  toImageAnnotationViewModels,
  type ImageAnnotationViewModel,
} from "@beyo/images";

const TaskIdSchema = z.string().transform((value) => value as TaskId);
const TaskStepIdSchema = z.string().transform((value) => value as TaskStepId);
const WorkingSectionIdSchema = z
  .string()
  .transform((value) => value as WorkingSectionId);
const UserIdSchema = z.string().transform((value) => value as UserId);

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

export const LastStateRecordSchema = z.object({
  state: StepStateSchema,
  entered_at: z.string(),
  exited_at: z.string().nullable(),
});
export type LastStateRecord = z.infer<typeof LastStateRecordSchema>;

export const TaskSnapshotSchema = z.object({
  client_id: TaskIdSchema,
  task_type: z.enum(["return", "pre_order", "internal"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  state: z.string(),
  return_source: z
    .enum(["after_purchase", "before_purchase", "store_return"])
    .nullable(),
  item_location: z.string().nullable(),
  ready_by_at: z.string().nullable(),
  return_method: z.string().nullable(),
});
export type TaskSnapshot = z.infer<typeof TaskSnapshotSchema>;

export const UserRefSchema = z.object({
  client_id: UserIdSchema,
  username: z.string(),
  profile_picture: z.string().nullable(),
});

export const UpholsteryRequirementSchema = z.object({
  client_id: z.string(),
  item_upholstery_id: z.string().nullable().optional(),
  upholstery_id: z.string().nullable().optional(),
  state: z.string(),
  source: z.string(),
  amount_meters: z.number(),
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
    upholstery_requirement: z.array(UpholsteryRequirementSchema),
  })
  .nullable();

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

export const TaskStepSchema = z.object({
  client_id: TaskStepIdSchema,
  task_id: TaskIdSchema,
  state: StepStateSchema,
  readiness_status: z.enum(["ready", "blocked", "pending"]),
  sequence_order: z.number().nullable(),
  working_section_id: WorkingSectionIdSchema,
  assigned_worker_id: z.string().nullable(),
  total_dependencies: z.number(),
  completed_dependencies: z.number(),
  working_section_name_snapshot: z.string(),
  assigned_worker_display_name_snapshot: z.string().nullable(),
  created_at: z.string(),
  closed_at: z.string().nullable(),
  updated_at: z.string(),
  created_by: UserRefSchema,
  updated_by: UserRefSchema.nullable(),
  last_state_record: LastStateRecordSchema.nullable(),
  task: TaskSnapshotSchema,
  item: ItemSnapshotSchema,
  item_images: z.array(ItemImageSchema),
});
export type TaskStep = z.infer<typeof TaskStepSchema>;

export const TaskStepsPaginationSchema = z.object({
  items: z.array(TaskStepSchema),
  limit: z.number(),
  offset: z.number(),
  has_more: z.boolean(),
});
export type TaskStepsPagination = z.infer<typeof TaskStepsPaginationSchema>;

export const StepTransitionReasonSchema = z.enum([
  "waiting_for_upholstery",
  "pause_lunch_break",
  "pause_coffee_break",
  "pause_ended_shift",
  "pause_meeting",
  "pause_other_task_priority",
]);
export type StepTransitionReason = z.infer<typeof StepTransitionReasonSchema>;

export type TransitionStepStateInput = {
  task_id: TaskId;
  step_id: TaskStepId;
  new_state: StepState;
  credited_user_id?: UserId;
  reason?: StepTransitionReason;
  description?: string;
};

export type TransitionStepStateOutput = {
  step_id: TaskStepId;
  new_state: StepState;
  last_state_record: LastStateRecord;
};

export type ListWorkingSectionStepsParams = {
  working_section_id: WorkingSectionId;
  q?: string;
  upholstery_search?: boolean;
  limit?: number;
  offset?: number;
};

export type TaskStepCardViewModel = {
  stepId: TaskStepId;
  taskId: TaskId;
  state: StepState;
  isTerminal: boolean;
  hasQuickAction: boolean;
  nextState: StepState | undefined;
  articleLabel: string;
  task: TaskSnapshot;
  firstImageUrl: string | null;
  firstImageAnnotations: ImageAnnotationViewModel[];
  firstImageWidthPx: number | null;
  firstImageHeightPx: number | null;
  quantityPillLabel: string | null;
  lastStateRecord: LastStateRecord | null;
};

export function toTaskStepCardViewModel(step: TaskStep): TaskStepCardViewModel {
  const item = step.item;
  const articleLabel = item
    ? item.article_number
      ? `#${item.article_number}`
      : (item.sku ?? "Article number missing")
    : "No item linked";

  const quantityPillLabel =
    item && item.quantity > 1 ? `#${item.quantity}` : null;

  const firstImage = step.item_images[0] ?? null;
  const firstImageUrl = firstImage ? firstImage.image_url : null;
  const firstImageWidthPx = firstImage?.width_px ?? null;
  const firstImageHeightPx = firstImage?.height_px ?? null;

  const rawAnnotation =
    firstImage && "image_annotation" in firstImage
      ? firstImage.image_annotation
      : undefined;
  const parsed = ImageAnnotationSchema.nullable().safeParse(rawAnnotation);
  const parsedAnnotation = parsed.success && parsed.data ? parsed.data : null;
  const firstImageAnnotations = toImageAnnotationViewModels(
    parsedAnnotation ?? undefined,
    undefined,
  );

  const isTerminal = STEP_TERMINAL_STATES.has(step.state);
  const nextState = STEP_QUICK_TRANSITION[step.state];

  return {
    stepId: step.client_id,
    taskId: step.task_id,
    state: step.state,
    isTerminal,
    hasQuickAction: nextState !== undefined,
    nextState,
    articleLabel,
    task: step.task,
    firstImageUrl,
    firstImageAnnotations,
    firstImageWidthPx,
    firstImageHeightPx,
    quantityPillLabel,
    lastStateRecord: step.last_state_record,
  };
}

export type NonTerminalStepCounts = {
  pending: number;
  working: number;
  paused: number;
  ended_shift: number;
  blocked: number;
};

export function computeNonTerminalCounts(
  steps: TaskStep[],
): NonTerminalStepCounts {
  return steps.reduce(
    (acc, step) => {
      if (!STEP_TERMINAL_STATES.has(step.state) && step.state !== "cancelled") {
        const key = step.state as keyof NonTerminalStepCounts;
        if (key in acc) {
          acc[key] += 1;
        }
      }

      return acc;
    },
    { pending: 0, working: 0, paused: 0, ended_shift: 0, blocked: 0 },
  );
}
