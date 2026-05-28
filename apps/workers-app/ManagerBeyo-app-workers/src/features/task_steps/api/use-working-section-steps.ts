import { useQuery } from "@tanstack/react-query";
import { fetchWorkingSectionSteps } from "./fetch-working-section-steps";
import { taskStepKeys } from "./task-step-keys";
import type { ListWorkingSectionStepsParams } from "../types";

export function useWorkingSectionStepsQuery(
  params: ListWorkingSectionStepsParams,
) {
  return useQuery({
    queryKey: taskStepKeys.sectionList(params),
    queryFn: () => fetchWorkingSectionSteps(params),
    enabled: Boolean(params.working_section_id),
  });
}
