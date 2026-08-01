export {
  CasesSummarySchema,
  DependencyWorkingSectionRefSchema,
  ItemImageFullSchema,
  ItemImageLightSchema,
  ItemImageSchema,
  ItemSnapshotSchema,
  LastStateRecordSchema,
  QuickPreOrderItemFormSchema,
  ReadinessStatusSchema,
  STEP_QUICK_TRANSITION,
  STEP_TERMINAL_STATES,
  StepDependencyEntrySchema,
  StepStateSchema,
  TaskSnapshotSchema,
  TaskStepsPaginationSchema,
  UpholsteryRequirementSchema,
  UserRefSchema,
  WorkingSectionStepItemSchema,
} from "./types";
export type {
  CasesSummary,
  DependencyWorkingSectionRef,
  ItemImage,
  LastStateRecord,
  QuickPreOrderItemFormValues,
  ReadinessStatus,
  StepDependencyEntry,
  StepState,
  TaskSnapshot,
  TaskStepsPagination,
  TaskType,
  WorkingSectionStepItem,
} from "./types";

export {
  QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID,
  REASSIGNED_STEPS_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
} from "./surface-ids";
export type {
  QuickTaskAssignSurfaceOpeners,
  QuickTaskAssignSurfaceProps,
  ReassignedStepsHostAdapter,
  ReassignedStepsSlideSurfaceProps,
  RecoveredPendingAdd,
  RecoveredPendingReassignment,
  TaskWorkingSectionsDiscardChangesSurfaceProps,
  TaskWorkingSectionsReassignSlideSurfaceProps,
  TaskWorkingSectionsSurfaceOpeners,
  TaskWorkingSectionsSurfaceProps,
} from "./surface-ids";

export { useTaskWorkingSectionsController } from "./controllers/use-task-working-sections.controller";
export type {
  TaskWorkingSectionsController,
  TaskWorkingSectionEntry,
} from "./controllers/use-task-working-sections.controller";
export { useQuickTaskAssignController } from "./controllers/use-quick-task-assign.controller";
export type {
  QuickTaskAssignController,
} from "./controllers/use-quick-task-assign.controller";
export {
  useTaskWorkingSectionsCountsFlow,
} from "./flows/use-task-working-sections-counts.flow";
export type {
  TaskWorkingSectionsCountsFlow,
} from "./flows/use-task-working-sections-counts.flow";

export {
  TaskWorkingSectionsProvider,
  useTaskWorkingSectionsContext,
} from "./providers/TaskWorkingSectionsProvider";

export { TaskWorkingSectionsStepList } from "./components/TaskWorkingSectionsStepList";
export { TaskWorkingSectionsField } from "./components/TaskWorkingSectionsField";

export { quickTaskKeys } from "./api/quick-task-keys";
export { useTaskCountsQuery } from "./api/use-task-counts-query";
export { useQuickTaskListQuery } from "./api/use-quick-task-list-query";

export { reassignedStepKeys } from "./api/reassigned-step-keys";
export {
  REASSIGNED_STEPS_MAX_QUERY_LENGTH,
  REASSIGNED_STEPS_PAGE_SIZE,
  fetchReassignedSteps,
  normalizeReassignedStepsQuery,
} from "./api/fetch-reassigned-steps";
export { fetchReassignedStepsCount } from "./api/fetch-reassigned-steps-count";
export { usePaginatedReassignedStepsQuery } from "./api/use-reassigned-steps-query";
export type { PaginatedReassignedStepsQuery } from "./api/use-reassigned-steps-query";
export { useReassignedStepsCountQuery } from "./api/use-reassigned-steps-count-query";
export { groupReassignedSteps } from "./lib/group-reassigned-steps";
export type { ReassignedStepGroup } from "./lib/group-reassigned-steps";
export {
  ReassignedStepItemSchema,
  ReassignedStepsCountResponseSchema,
  ReassignedStepsCountSchema,
  ReassignedStepsPaginationSchema,
  ReassignedStepsResponseSchema,
  TaskStepAcknowledgmentSchema,
  WorkingSectionCompactSchema,
} from "./types";
export type {
  ListReassignedStepsParams,
  ReassignedStepItem,
  ReassignedStepsCount,
  ReassignedStepsPagination,
  ReassignedStepsResponse,
  TaskStepAcknowledgment,
  WorkingSectionCompact,
} from "./types";

export function loadTaskWorkingSectionsSlidePage() {
  return import("./pages/TaskWorkingSectionsSlidePage").then((m) => ({
    default: m.TaskWorkingSectionsSlidePage,
  }));
}
export function loadTaskWorkingSectionsReassignSlidePage() {
  return import("./pages/TaskWorkingSectionsReassignSlidePage").then((m) => ({
    default: m.TaskWorkingSectionsReassignSlidePage,
  }));
}
export function loadTaskWorkingSectionsDiscardChangesSheetPage() {
  return import("./pages/TaskWorkingSectionsDiscardChangesSheetPage").then(
    (m) => ({ default: m.TaskWorkingSectionsDiscardChangesSheetPage }),
  );
}
export function loadReassignedStepsSlidePage() {
  return import("./pages/ReassignedStepsSlidePage").then((m) => ({
    default: m.ReassignedStepsSlidePage,
  }));
}
export function loadQuickTaskAssignSlidePage() {
  return import("./pages/QuickTaskAssignSlidePage").then((m) => ({
    default: m.QuickTaskAssignSlidePage,
  }));
}
