import type { TaskStepId, WorkingSectionId } from "@beyo/lib";
import type { ListWorkingSectionStepsParams } from "../types";

export const taskStepKeys = {
  all: ["task-steps"] as const,
  sectionLists: () => [...taskStepKeys.all, "section-list"] as const,
  sectionList: (params: ListWorkingSectionStepsParams) =>
    [
      ...taskStepKeys.sectionLists(),
      params.working_section_id,
      {
        q: params.q,
        limit: params.limit,
        offset: params.offset,
        record_step_state: params.record_step_state,
        major_category: params.major_category,
        readiness_statuses: params.readiness_statuses,
        task_types: params.task_types,
        item_position: params.item_position,
        group_by_upholstery: params.group_by_upholstery,
      },
    ] as const,
  sectionListsBySection: (sectionId: WorkingSectionId) =>
    [...taskStepKeys.sectionLists(), sectionId] as const,
  /**
   * One entry per step, the detail surface's only data source. Every list
   * fetch writes its rows through here and every transition patches it, so a
   * detail opened from any entry point reads the same live object.
   */
  details: () => [...taskStepKeys.all, "detail"] as const,
  detail: (stepId: TaskStepId) => [...taskStepKeys.details(), stepId] as const,
  userLastActive: () => [...taskStepKeys.all, "user-last-active"] as const,
  reassignmentAcks: () => [...taskStepKeys.all, "reassignment-acks"] as const,
};
