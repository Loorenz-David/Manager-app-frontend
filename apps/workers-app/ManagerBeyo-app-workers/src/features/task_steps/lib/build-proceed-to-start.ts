import type { QueryClient } from "@tanstack/react-query";
import type { useSurface } from "@beyo/hooks";
import {
  ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID,
  hasIssueTypesForContext,
  issueTypeKeys,
  type IssueType,
  type ItemIssueSelectionSheetSurfaceProps,
  type ListIssueTypesResponse,
} from "@beyo/item-issues";
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";

import type { TransitionStepStateAction } from "../actions/use-transition-step-state";

type OpenSurface = ReturnType<typeof useSurface>["open"];

type ProceedToStartArgs = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  itemId: string | null | undefined;
  itemCategoryId: string | null | undefined;
  workerId: string | null | undefined;
  queryClient: QueryClient;
  openSurface: OpenSurface;
  transitionStepState: TransitionStepStateAction["transitionStepState"];
};

function getCachedIssueTypes(queryClient: QueryClient): IssueType[] {
  const cachedQueries = queryClient.getQueriesData<ListIssueTypesResponse>({
    queryKey: issueTypeKeys.all(),
  });
  const dedupedIssueTypes = new Map<string, IssueType>();

  for (const [, data] of cachedQueries) {
    for (const issueType of data?.issue_types ?? []) {
      dedupedIssueTypes.set(issueType.client_id, issueType);
    }
  }

  return Array.from(dedupedIssueTypes.values());
}

export function buildProceedToStart(args: ProceedToStartArgs): () => void {
  return () => {
    const {
      stepId,
      taskId,
      workingSectionId,
      itemId,
      itemCategoryId,
      workerId,
      queryClient,
      openSurface,
      transitionStepState,
    } = args;

    const hasIssues = hasIssueTypesForContext(
      getCachedIssueTypes(queryClient),
      workingSectionId,
      itemCategoryId ?? null,
    );

    if (itemId && hasIssues) {
      openSurface(ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID, {
        itemId,
        workingSectionId,
        itemCategoryId: itemCategoryId ?? null,
        stepId,
        workerId: workerId ?? null,
        onSaved: () => {
          transitionStepState({
            task_id: taskId,
            step_id: stepId,
            new_state: "working",
            working_section_id: workingSectionId,
          });
        },
      } satisfies ItemIssueSelectionSheetSurfaceProps);
      return;
    }

    transitionStepState({
      task_id: taskId,
      step_id: stepId,
      new_state: "working",
      working_section_id: workingSectionId,
    });
  };
}
