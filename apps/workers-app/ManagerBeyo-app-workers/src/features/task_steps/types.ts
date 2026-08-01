import { z } from "zod";
import type {
  PauseReasonId,
  TaskId,
  TaskStepId,
  WorkingSectionId,
  UserId,
} from "@beyo/lib";
import {
  ImageAnnotationSchema,
  toImageAnnotationViewModels,
  type ImageAnnotationViewModel,
} from "@beyo/images";
import type { UpholsteryGroupFields } from "@beyo/upholstery";
// ─── Promoted step-item schema family ────────────────────────────────────────
// These definitions now live in `@beyo/task-working-sections` so the package's
// reassigned-steps page and this app share one shape (handoff §11). They are
// re-exported verbatim under their historic local names so no other app file
// changes.
import {
  STEP_QUICK_TRANSITION,
  STEP_TERMINAL_STATES,
  UserRefSchema,
  WorkingSectionStepItemSchema,
  type CasesSummary,
  type LastStateRecord,
  type ReadinessStatus,
  type StepDependencyEntry,
  type StepState,
  type TaskSnapshot,
  type TaskType,
  type WorkingSectionStepItem,
} from "@beyo/task-working-sections";

export {
  CasesSummarySchema,
  DependencyWorkingSectionRefSchema,
  ItemImageFullSchema,
  ItemImageLightSchema,
  ItemImageSchema,
  ItemSnapshotSchema,
  LastStateRecordSchema,
  ReadinessStatusSchema,
  StepDependencyEntrySchema,
  StepStateSchema,
  TaskSnapshotSchema,
  TaskStepsPaginationSchema,
  UpholsteryRequirementSchema,
} from "@beyo/task-working-sections";
export type {
  DependencyWorkingSectionRef,
  ItemImage,
  TaskStepsPagination,
} from "@beyo/task-working-sections";

export {
  STEP_QUICK_TRANSITION,
  STEP_TERMINAL_STATES,
  UserRefSchema,
  WorkingSectionStepItemSchema as TaskStepSchema,
};
export type {
  CasesSummary,
  LastStateRecord,
  ReadinessStatus,
  StepDependencyEntry,
  StepState,
  TaskSnapshot,
  TaskType,
};
export type TaskStep = WorkingSectionStepItem;

const TaskIdSchema = z.string().transform((value) => value as TaskId);
const TaskStepIdSchema = z.string().transform((value) => value as TaskStepId);

export type MajorCategory = "seat" | "wood";

export type TransitionStepStateInput = {
  task_id: TaskId;
  step_id: TaskStepId;
  new_state: StepState;
  credited_user_id?: UserId;
  pause_reason_id?: PauseReasonId | null;
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
      was_final_step: boolean;
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
  readiness_statuses?: string;
  task_types?: string;
  item_position?: string;
  group_by_upholstery?: boolean;
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
  itemQuantity: number;
  isReassigned: boolean;
  lastStateRecord: LastStateRecord | null;
  totalWorkingSeconds: number;
  totalPauseSeconds: number;
  casesSummary: CasesSummary | null;
  upholsteryGroup: UpholsteryGroupFields;
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
    itemQuantity: item?.quantity ?? 1,
    isReassigned: step.is_reassigned,
    lastStateRecord: step.last_state_record,
    totalWorkingSeconds: step.total_working_seconds,
    totalPauseSeconds: step.total_pause_seconds,
    casesSummary: step.cases_summary ?? null,
    upholsteryGroup: {
      upholstery_group_key: step.upholstery_group_key,
      upholstery_group_image_url: step.upholstery_group_image_url,
      upholstery_group_upholstery_id: step.upholstery_group_upholstery_id,
      upholstery_group_inventory: step.upholstery_group_inventory,
    },
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

export type UserLastActivePayload = {
  step: TaskStep | null;
  batchSteps: TaskStep[] | null;
};

// ─── Reassignment acknowledgments ─────────────────────────────────────────────
// The `/pending` payload item is byte-for-byte the resume-card step shape
// (TaskStepSchema) plus an `acknowledgment` block. Reuse the step schema verbatim.

export const AcknowledgmentSchema = z.object({
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
export type Acknowledgment = z.infer<typeof AcknowledgmentSchema>;

export const ReassignmentStepSchema = WorkingSectionStepItemSchema.extend({
  acknowledgment: AcknowledgmentSchema,
});
export type ReassignmentStep = z.infer<typeof ReassignmentStepSchema>;

export type ReassignmentAckViewModel = {
  stepId: TaskStepId;
  taskId: TaskId;
  articleLabel: string;
  workingSectionName: string;
  reason: string | null;
  firstImageUrl: string | null;
  firstImageAnnotations: ImageAnnotationViewModel[];
  firstImageWidthPx: number | null;
  firstImageHeightPx: number | null;
  quantityPillLabel: string | null;
  firstSeenAt: string | null;
  createdByName: string | null;
  step: ReassignmentStep;
};

export function toReassignmentAckViewModel(
  item: ReassignmentStep,
): ReassignmentAckViewModel {
  const card = toTaskStepCardViewModel(item);
  return {
    stepId: card.stepId,
    taskId: card.taskId,
    articleLabel: card.articleLabel,
    workingSectionName: item.working_section_name_snapshot,
    reason: item.acknowledgment.reason,
    firstImageUrl: card.firstImageUrl,
    firstImageAnnotations: card.firstImageAnnotations,
    firstImageWidthPx: card.firstImageWidthPx,
    firstImageHeightPx: card.firstImageHeightPx,
    quantityPillLabel: card.quantityPillLabel,
    firstSeenAt: item.acknowledgment.first_seen_at,
    createdByName: item.acknowledgment.created_by?.username ?? null,
    step: item,
  };
}

export type BatchStepTransitionItem = {
  task_id: TaskId;
  step_id: TaskStepId;
  mark_closing_record_inaccurate?: boolean;
};

export type BatchStepTransitionRequest = {
  items: BatchStepTransitionItem[];
  new_state: StepState;
  pause_reason_id?: PauseReasonId | null;
  description?: string | null;
};

export type BatchStepTransitionResponseItem = {
  step_id: TaskStepId;
  new_state: StepState;
  last_state_record: LastStateRecord;
  was_final_step: boolean;
};

export type BatchStepTransitionResponse = {
  items: BatchStepTransitionResponseItem[];
};

export function canTransitionToWorking(step: TaskStep): boolean {
  return (
    step.state === "pending" ||
    step.state === "paused" ||
    step.state === "ended_shift"
  );
}

export function canTransitionToPaused(step: TaskStep): boolean {
  return step.state === "working";
}

export function canTransitionToCompleted(step: TaskStep): boolean {
  return step.state === "working";
}

export function getBatchTransitionItems(
  steps: TaskStep[],
  targetState: "working" | "paused" | "completed",
  markInaccurate = false,
): BatchStepTransitionItem[] {
  const canTransition =
    targetState === "working"
      ? canTransitionToWorking
      : targetState === "paused"
        ? canTransitionToPaused
        : canTransitionToCompleted;

  return steps.filter(canTransition).map((step) => ({
    task_id: step.task_id,
    step_id: step.client_id,
    ...(markInaccurate && { mark_closing_record_inaccurate: true }),
  }));
}
