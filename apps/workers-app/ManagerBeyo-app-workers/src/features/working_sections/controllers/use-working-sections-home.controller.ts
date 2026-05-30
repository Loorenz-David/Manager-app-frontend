import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchOnCondition } from "@beyo/ui";

import { fetchWorkingSectionSteps } from "../../task_steps/api/fetch-working-section-steps";
import { taskStepKeys } from "../../task_steps/api/task-step-keys";
import { preloadTaskDetailSlideSurface } from "../../task_steps/surfaces";
import { useWorkerWorkingSectionsQuery } from "../api/use-worker-working-sections";
import {
  toWorkingSectionViewModel,
  type WorkingSectionViewModel,
} from "../types";

export type WorkingSectionsHomeController = {
  sections: WorkingSectionViewModel[];
  isPending: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
};

export function useWorkingSectionsHomeController(): WorkingSectionsHomeController {
  const queryClient = useQueryClient();
  const query = useWorkerWorkingSectionsQuery();

  async function refetch(): Promise<void> {
    await query.refetch();
  }

  const sections = useMemo(
    () => (query.data ?? []).map(toWorkingSectionViewModel),
    [query.data],
  );

  const activeSections = useMemo(
    () =>
      (query.data ?? []).filter(
        (section) =>
          section.task_steps_counts.paused +
            section.task_steps_counts.working +
            section.task_steps_counts.ended_shift >
          0,
      ),
    [query.data],
  );

  usePrefetchOnCondition(activeSections.length > 0, () =>
    Promise.all([
      preloadTaskDetailSlideSurface(),
      ...activeSections.map((section) =>
        queryClient.prefetchQuery({
          queryKey: taskStepKeys.sectionList({
            working_section_id: section.client_id,
            limit: 50,
            offset: 0,
          }),
          queryFn: () =>
            fetchWorkingSectionSteps({
              working_section_id: section.client_id,
              limit: 50,
              offset: 0,
            }),
          staleTime: 30_000,
        }),
      ),
    ]),
  );

  return {
    sections,
    isPending: query.isPending,
    isError: query.isError,
    refetch,
  };
}
