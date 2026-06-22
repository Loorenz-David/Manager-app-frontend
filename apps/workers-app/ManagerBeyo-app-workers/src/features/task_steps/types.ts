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

export const DependencyWorkingSectionRefSchema = z.object({
  client_id: WorkingSectionIdSchema,
  name: z.string(),
  image: z.string().nullable(),
  order_list: z.number(),
});
export type DependencyWorkingSectionRef = z.infer<
  typeof DependencyWorkingSectionRefSchema
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
]) satisfies z.ZodType<import("@beyo/tasks").StepState>;
export type StepState = z.infer<typeof StepStateSchema>;

export type MajorCategory = "seat" | "wood";

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
  return_source: z
    .enum(["after_purchase", "before_purchase", "store_return"])
    .nullable(),
  item_location: z.string().nullable(),
  ready_by_at: z.string().nullable(),
  return_method: z.string().nullable(),
});
export type TaskSnapshot = z.infer<typeof TaskSnapshotSchema>;

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

export const CasesSummarySchema = z.object({
  total_unread: z.number().int(),
});
export type CasesSummary = z.infer<typeof CasesSummarySchema>;

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
  total_working_seconds: z.number().int(),
  total_pause_seconds: z.number().int(),
  total_ended_shift_seconds: z.number().int(),
  total_working_count: z.number().int(),
  total_pause_count: z.number().int(),
  total_ended_shift_count: z.number().int(),
  total_issues_count: z.number().int(),
  total_issues_resolved_count: z.number().int(),
  total_cost_minor: z.number().int().nullable(),
  updated_at: z.string(),
  created_by: UserRefSchema,
  updated_by: UserRefSchema.nullable(),
  last_state_record: LastStateRecordSchema.nullable(),
  task: TaskSnapshotSchema,
  item: ItemSnapshotSchema,
  item_images: z.array(ItemImageSchema),
  cases_summary: CasesSummarySchema.nullable().optional(),
  dependency_working_sections: z.array(StepDependencyEntrySchema).default([]),
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
  "pause_case_created",
]);
export type StepTransitionReason = z.infer<typeof StepTransitionReasonSchema>;

export type TransitionStepStateInput = {
  task_id: TaskId;
  step_id: TaskStepId;
  new_state: StepState;
  credited_user_id?: UserId;
  reason?: StepTransitionReason;
  description?: string;
  mark_closing_record_inaccurate?: boolean;
};

export type PendingStepCompletion = {
  pendingCompletionId: string;
  expiresAt: string;
  stepId: TaskStepId;
  workingSectionId: WorkingSectionId;
};

export type TransitionStepStateOutput =
  | {
      kind: "immediate";
      step_id: TaskStepId;
      new_state: StepState;
      last_state_record: LastStateRecord;
    }
  | {
      kind: "pending_completion";
      pending_completion_id: string;
      expires_at: string;
    };

export type CancelPendingCompletionOutput = { cancelled: true };

export type ListWorkingSectionStepsParams = {
  working_section_id: WorkingSectionId;
  q?: string;
  upholstery_search?: boolean;
  limit?: number;
  offset?: number;
  record_step_state?: string;
  major_category?: string;
};

export type TaskStepCardViewModel = {
  stepId: TaskStepId;
  taskId: TaskId;
  itemId: string | null;
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
  itemPositionPillLabel: string | null;
  quantityPillLabel: string | null;
  lastStateRecord: LastStateRecord | null;
  totalWorkingSeconds: number;
  totalPauseSeconds: number;
  casesSummary: CasesSummary | null;
};

export type IncompleteDependencyViewModel = {
  workingSectionClientId: WorkingSectionId;
  name: string;
  imageUrl: string | null;
  prerequisiteStepState: StepState;
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
  const itemPositionPillLabel = item?.item_position
    ? `W-${item.item_position}`
    : null;

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
    itemId: item?.client_id ?? null,
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
    itemPositionPillLabel,
    quantityPillLabel,
    lastStateRecord: step.last_state_record,
    totalWorkingSeconds: step.total_working_seconds,
    totalPauseSeconds: step.total_pause_seconds,
    casesSummary: step.cases_summary ?? null,
  };
}

export function toIncompleteDependencyViewModels(
  entries: StepDependencyEntry[],
): IncompleteDependencyViewModel[] {
  return entries
    .filter((entry) => !STEP_TERMINAL_STATES.has(entry.prerequisite_step_state))
    .map((entry) => ({
      workingSectionClientId: entry.working_section.client_id,
      name: entry.working_section.name,
      imageUrl: entry.working_section.image,
      prerequisiteStepState: entry.prerequisite_step_state,
    }));
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
