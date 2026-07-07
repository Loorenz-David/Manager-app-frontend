import type { QueryClient } from "@tanstack/react-query";
import type { useSurface } from "@beyo/hooks";
import {
  ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID,
  fetchIssueTypes,
  hasIssueTypesForContext,
  issueTypeKeys,
  type ItemIssueSelectionSheetSurfaceProps,
} from "@beyo/item-issues";
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";

import type { TransitionStepStateAction } from "../actions/use-transition-step-state";
import { getIssuePlacementGroups } from "./issue-placement-groups";

type OpenSurface = ReturnType<typeof useSurface>["open"];

type ProceedToStartArgs = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  workingSectionName: string | null | undefined;
  itemId: string | null | undefined;
  itemCategoryId: string | null | undefined;
  workerId: string | null | undefined;
  queryClient: QueryClient;
  openSurface: OpenSurface;
  transitionStepState: TransitionStepStateAction["transitionStepState"];
};

export function buildProceedToStart(
  args: ProceedToStartArgs,
): () => Promise<void> {
  return async () => {
    const {
      stepId,
      taskId,
      workingSectionId,
      workingSectionName,
      itemId,
      itemCategoryId,
      workerId,
      queryClient,
      openSurface,
      transitionStepState,
    } = args;

    const workingSectionIds = [workingSectionId];
    const itemCategoryIds = itemCategoryId ? [itemCategoryId] : [];

    const { issue_types: issueTypes } = await queryClient.fetchQuery({
      queryKey: issueTypeKeys.list({
        working_section_ids: workingSectionIds,
        item_category_ids: itemCategoryIds,
      }),
      queryFn: () =>
        fetchIssueTypes({
          working_section_ids: workingSectionIds,
          item_category_ids: itemCategoryIds,
        }),
      staleTime: 5 * 60 * 1000,
    });

    const hasIssues = hasIssueTypesForContext(
      issueTypes,
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
        placementGroups: getIssuePlacementGroups(workingSectionName),
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
