import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiRequestError } from "@beyo/api-client";
import { generateClientId, notify } from "@beyo/lib";

import { createItemIssues } from "../api/create-item-issues";
import { deleteItemIssues } from "../api/delete-item-issues";
import { itemIssueKeys } from "../api/item-issue-keys";
import type {
  CreateItemIssueInput,
  IssueSelectionDraft,
  IssueType,
  ItemIssue,
  ListItemIssuesResponse,
} from "../types";

export type SaveItemIssuesContext = {
  itemId: string;
  workingSectionId: string | null;
  itemCategoryId: string | null;
  stepId: string | null;
  workerId: string | null;
};

export type SaveItemIssuesArgs = {
  draft: IssueSelectionDraft;
  existingIssues: ItemIssue[];
  issueTypes: IssueType[];
  context: SaveItemIssuesContext;
};

type SaveItemIssuesOptimisticContext = {
  previousData: ListItemIssuesResponse | undefined;
  queryKey: ReturnType<typeof itemIssueKeys.byItem>;
};

type ResolvedCreateIssue = CreateItemIssueInput & { client_id: string };

type ResolvedSaveArgs = {
  resolvedCreate: ResolvedCreateIssue[];
  resolvedDelete: string[];
  context: SaveItemIssuesContext;
  existingIssues: ItemIssue[];
  issueTypes: IssueType[];
};

function resolvePlacement(
  issueType: IssueType | undefined,
  itemCategoryId: string | null,
): string {
  if (!issueType || !itemCategoryId) {
    return "";
  }

  return (
    issueType.linked_item_category_ids.find(
      (link) => link.item_category_id === itemCategoryId,
    )?.placement_of_issue ?? ""
  );
}

export function useSaveItemIssues() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    void,
    ApiRequestError,
    ResolvedSaveArgs,
    SaveItemIssuesOptimisticContext
  >({
    mutationFn: async ({ resolvedCreate, resolvedDelete, context }) => {
      if (resolvedDelete.length > 0) {
        await deleteItemIssues(context.itemId, resolvedDelete);
      }

      if (resolvedCreate.length > 0) {
        await createItemIssues(context.itemId, resolvedCreate);
      }
    },
    onMutate: async ({
      resolvedCreate,
      resolvedDelete,
      existingIssues,
      issueTypes,
      context: { itemId, workingSectionId, itemCategoryId, stepId, workerId },
    }) => {
      const queryKey = itemIssueKeys.byItem(itemId, {
        working_section_id: workingSectionId ?? undefined,
        item_category_id: itemCategoryId ?? undefined,
      });

      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<ListItemIssuesResponse>(queryKey);

      const now = new Date().toISOString();
      const workspaceId =
        existingIssues[0]?.workspace_id ??
        previousData?.item_issues_pagination.items[0]?.workspace_id ??
        "";

      const issueTypesById = new Map(
        issueTypes.map((issueType) => [issueType.client_id, issueType]),
      );
      const existingIssuesByTypeId = new Map(
        existingIssues.map((issue) => [issue.issue_type_id ?? "", issue]),
      );
      const deleteSet = new Set(resolvedDelete);

      const optimisticIssues: ItemIssue[] = [
        ...existingIssues.filter((issue) => !deleteSet.has(issue.client_id)),
        ...resolvedCreate.map((issue) => {
          const issueType = issue.issue_type_id
            ? issueTypesById.get(issue.issue_type_id)
            : undefined;
          const existingIssue = existingIssuesByTypeId.get(
            issue.issue_type_id ?? "",
          );

          return {
            client_id: issue.client_id,
            workspace_id: existingIssue?.workspace_id ?? workspaceId,
            item_id: itemId,
            step_id: stepId,
            worker_id: workerId,
            working_section_id: workingSectionId,
            item_category_id: itemCategoryId,
            issue_type_id: issue.issue_type_id,
            issue_type_snapshot:
              issue.issue_type_snapshot ??
              existingIssue?.issue_type_snapshot ??
              "",
            issue_mode_snapshot:
              issueType?.issue_mode ??
              existingIssue?.issue_mode_snapshot ??
              null,
            placement_of_issue_snapshot:
              issue.placement_of_issue_snapshot ||
              existingIssue?.placement_of_issue_snapshot ||
              "",
            intensity: issue.intensity as 1 | 2 | 3,
            created_at: existingIssue?.created_at ?? now,
            updated_at: now,
          };
        }),
      ];

      queryClient.setQueryData<ListItemIssuesResponse>(queryKey, {
        item_issues_pagination: {
          items: optimisticIssues,
          limit: 200,
          offset: 0,
          has_more: false,
        },
      });

      return { previousData, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      notify.error("Save failed", "Could not save issues. Please try again.");
    },
    onSettled: (_data, _error, { context }) => {
      void queryClient.invalidateQueries({
        queryKey: ["item-issues", "by-item", context.itemId],
      });
    },
  });

  return {
    saveIssues: async (args: SaveItemIssuesArgs) => {
      const { draft, existingIssues, issueTypes, context } = args;
      const { itemCategoryId, stepId, workerId, workingSectionId } = context;
      const existingByTypeId = new Map(
        existingIssues.map((issue) => [issue.issue_type_id ?? "", issue]),
      );

      const resolvedDelete: string[] = [];
      const resolvedCreate: ResolvedCreateIssue[] = [];

      for (const existingIssue of existingIssues) {
        const issueTypeId = existingIssue.issue_type_id ?? "";
        const draftIntensity = draft[issueTypeId] ?? 0;

        if (
          draftIntensity === 0 ||
          draftIntensity !== existingIssue.intensity
        ) {
          resolvedDelete.push(existingIssue.client_id);
        }
      }

      for (const [issueTypeId, intensity] of Object.entries(draft)) {
        if (intensity === 0) {
          continue;
        }

        const issueType = issueTypes.find(
          (candidate) => candidate.client_id === issueTypeId,
        );
        if (!issueType) {
          continue;
        }

        const existingIssue = existingByTypeId.get(issueTypeId);
        if (existingIssue && existingIssue.intensity === intensity) {
          continue;
        }

        resolvedCreate.push({
          client_id: generateClientId("ItemIssue"),
          issue_type_id: issueTypeId,
          step_id: stepId,
          worker_id: workerId,
          working_section_id: workingSectionId,
          item_category_id: itemCategoryId,
          issue_type_snapshot: issueType.name,
          placement_of_issue_snapshot: resolvePlacement(
            issueType,
            itemCategoryId,
          ),
          intensity: intensity as 1 | 2 | 3,
        });
      }

      if (resolvedDelete.length === 0 && resolvedCreate.length === 0) {
        return;
      }

      return mutation.mutateAsync({
        resolvedCreate,
        resolvedDelete,
        context,
        existingIssues,
        issueTypes,
      });
    },
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
