import { useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  ItemIssuesField,
  useCreateItemIssue,
  useDeleteItemIssue,
  useItemIssuesPickerFlow,
} from '@/features/items';
import { TEST_ISSUE_SEVERITIES } from '@/features/items/item-test-data';
import type { ItemIssue, ItemIssueFieldEntry } from '@/features/items/types';
import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

type ItemFastIssueSurfaceProps = {
  taskId: string;
  itemId: string;
};

type IssueFormValues = {
  item: { item_category_id: string | undefined };
  item_issues: ItemIssueFieldEntry[];
};

export function ItemFastIssueSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, itemId } = useSurfaceProps<ItemFastIssueSurfaceProps>();

  const taskQuery = useGetTaskQuery(taskId);
  const createItemIssue = useCreateItemIssue(taskId ?? '');
  const deleteItemIssue = useDeleteItemIssue(taskId ?? '');
  const item = taskQuery.data?.item;
  const { options: issueOptions } = useItemIssuesPickerFlow(item?.item_category_id ?? null);

  const form = useForm<IssueFormValues>({
    defaultValues: {
      item: { item_category_id: undefined },
      item_issues: [],
    },
  });

  const initialIssuesRef = useRef<ItemIssue[]>([]);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    header?.setTitle('Edit issues');
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (!taskQuery.data || hasInitializedRef.current) {
      return;
    }

    const issues = taskQuery.data.item_issues ?? [];

    initialIssuesRef.current = issues;
    form.reset({
      item: { item_category_id: taskQuery.data.item?.item_category_id ?? undefined },
      item_issues: issues.map((issue) => ({
        issue_id: issue.issue_type_id,
        issue_severity_id: issue.issue_severity_id ?? '',
      })),
    });
    hasInitializedRef.current = true;
  }, [form, taskQuery.data]);

  async function handleSave(values: IssueFormValues) {
    if (!itemId) {
      return;
    }

    const initialIssueTypeIds = new Set(initialIssuesRef.current.map((issue) => issue.issue_type_id));
    const nextIssueTypeIds = new Set(values.item_issues.map((issue) => issue.issue_id));

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

    for (const issue of issuesToRemove) {
      await deleteItemIssue.mutateAsync({ itemId, issueId: issue.client_id });
    }

    for (const issue of issuesToAdd) {
      const issueConfig = issueOptions.find((option) => option.issue_type_id === issue.issue_id);
      const severity = TEST_ISSUE_SEVERITIES.find(
        (option) => option.client_id === issue.issue_severity_id,
      );

      await createItemIssue.mutateAsync({
        itemId,
        issue_type_id: issue.issue_id,
        issue_severity_id: issue.issue_severity_id || undefined,
        base_time_seconds: issueConfig?.base_time_seconds,
        time_multiplier: severity?.time_multiplier,
        issue_name_snapshot: issueConfig?.issue_type_name,
        severity_name_snapshot: severity?.name,
      });
    }

    header?.requestClose();
  }

  if (taskQuery.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Loading issues…</div>;
  }

  if (taskQuery.isError || !taskQuery.data?.item) {
    return <div className="p-6 text-sm text-muted-foreground">Item issues could not be loaded.</div>;
  }

  const isPending = createItemIssue.isPending || deleteItemIssue.isPending;

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
