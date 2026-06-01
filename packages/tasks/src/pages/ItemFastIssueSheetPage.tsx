import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useCreateItemIssue } from "../api/use-create-item-issue";
import { useDeleteItemIssues } from "../api/use-delete-item-issues";
import { useItemIssuesQuery } from "../api/use-item-issues-query";
import { ItemIssuesField } from "../components/fields/ItemIssuesField";
import type { ItemFastIssueSheetSurfaceProps } from "../surface-ids";
import type { ItemIssue, ItemIssueFieldEntry } from "../types";

type IssueFormValues = {
  item: { item_category_id: string | undefined };
  item_issues: ItemIssueFieldEntry[];
};

export function ItemFastIssueSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { itemId, itemCategoryId } =
    useSurfaceProps<ItemFastIssueSheetSurfaceProps>();

  const itemIssuesQuery = useItemIssuesQuery(itemId);
  const createItemIssue = useCreateItemIssue();
  const deleteItemIssues = useDeleteItemIssues();

  const form = useForm<IssueFormValues>({
    defaultValues: {
      item: { item_category_id: undefined },
      item_issues: [],
    },
  });

  const initialIssuesRef = useRef<ItemIssue[]>([]);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    header?.setTitle("Edit issues");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (!itemIssuesQuery.data || hasInitializedRef.current) {
      return;
    }

    const issues = itemIssuesQuery.data.issues;
    initialIssuesRef.current = issues;
    form.reset({
      item: { item_category_id: itemCategoryId ?? undefined },
      item_issues: issues.map((issue) => ({
        issue_id: issue.issue_type_id,
        issue_severity_id: issue.issue_severity_id ?? "",
      })),
    });
    hasInitializedRef.current = true;
  }, [form, itemCategoryId, itemIssuesQuery.data]);

  async function handleSave(values: IssueFormValues) {
    if (!itemId) {
      return;
    }

    const initialIssueTypeIds = new Set(
      initialIssuesRef.current.map((issue) => issue.issue_type_id),
    );
    const nextIssueTypeIds = new Set(
      values.item_issues.map((issue) => issue.issue_id),
    );
    const issuesToRemove = initialIssuesRef.current.filter(
      (issue) => !nextIssueTypeIds.has(issue.issue_type_id),
    );
    const issuesToAdd = values.item_issues.filter(
      (issue) => !initialIssueTypeIds.has(issue.issue_id),
    );

    if (issuesToRemove.length === 0 && issuesToAdd.length === 0) {
      header?.requestClose();
      return;
    }

    if (issuesToRemove.length > 0) {
      await deleteItemIssues.mutateAsync({
        itemId,
        issueIds: issuesToRemove.map((issue) => issue.client_id),
      });
    }

    for (const issue of issuesToAdd) {
      await createItemIssue.mutateAsync({
        itemId,
        issue_type_id: issue.issue_id,
      });
    }

    header?.requestClose();
  }

  if (itemIssuesQuery.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Loading issues…</div>;
  }

  if (itemIssuesQuery.isError || !itemId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Item issues could not be loaded.
      </div>
    );
  }

  const isPending =
    createItemIssue.isPending || deleteItemIssues.isPending;

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-4 p-6" data-testid="item-fast-issue-sheet">
        <ItemIssuesField />
        <button
          type="button"
          className="rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
          disabled={isPending || !itemId}
          onClick={() => {
            void form.handleSubmit(handleSave)();
          }}
        >
          Save
        </button>
      </div>
    </FormProvider>
  );
}
