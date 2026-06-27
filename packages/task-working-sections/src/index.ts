export {
  QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID,
  TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID,
} from "./surface-ids";
export type {
  QuickTaskAssignSurfaceOpeners,
  QuickTaskAssignSurfaceProps,
  RecoveredPendingAdd,
  RecoveredPendingReassignment,
  TaskWorkingSectionsDiscardChangesSurfaceProps,
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

export function loadTaskWorkingSectionsSlidePage() {
  return import("./pages/TaskWorkingSectionsSlidePage").then((m) => ({
    default: m.TaskWorkingSectionsSlidePage,
  }));
}
export function loadTaskWorkingSectionsDiscardChangesSheetPage() {
  return import("./pages/TaskWorkingSectionsDiscardChangesSheetPage").then(
    (m) => ({ default: m.TaskWorkingSectionsDiscardChangesSheetPage }),
  );
}
export function loadQuickTaskAssignSlidePage() {
  return import("./pages/QuickTaskAssignSlidePage").then((m) => ({
    default: m.QuickTaskAssignSlidePage,
  }));
}
