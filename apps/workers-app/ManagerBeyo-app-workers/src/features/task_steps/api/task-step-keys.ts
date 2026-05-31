import type { WorkingSectionId } from "@beyo/lib";
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
      },
    ] as const,
  sectionListsBySection: (sectionId: WorkingSectionId) =>
    [...taskStepKeys.sectionLists(), sectionId] as const,
  userLastActive: () => [...taskStepKeys.all, "user-last-active"] as const,
};
