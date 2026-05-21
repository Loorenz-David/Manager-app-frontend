import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { BoxPicker } from '@/components/primitives';
import type { BoxPickerOptionType } from '@/components/primitives';
import { TEST_ITEM_ISSUES, TEST_ISSUE_SEVERITIES } from '@/features/items/item-test-data';
import { preloadItemIssueSeverityPickerSurface } from '@/features/items/surfaces';
import type { ItemIssueFieldEntry } from '@/features/items/types';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

export function ItemIssuesField() {
  const { control } = useFormContext();
  const { field, fieldState } = useController({
    name: 'item_issues',
    control,
    defaultValue: [],
  });

  const currentPairs: ItemIssueFieldEntry[] = field.value ?? [];
  const selectedIssueIds = currentPairs.map((p) => p.issue_id);

  useEffect(() => {
    void preloadItemIssueSeverityPickerSurface();
  }, []);

  const options: BoxPickerOptionType[] = TEST_ITEM_ISSUES.map((issue) => {
    const pair = currentPairs.find((p) => p.issue_id === issue.client_id);
    const severityName = pair
      ? (TEST_ISSUE_SEVERITIES.find((s) => s.client_id === pair.issue_severity_id)?.name ?? '')
      : '';
    return {
      value: issue.client_id,
      label: severityName ? `${issue.name} · ${severityName}` : issue.name,
      testId: `item-issue-${issue.client_id}-option`,
    };
  });

  function handleIssuePress(issueId: string) {
    const issue = TEST_ITEM_ISSUES.find((i) => i.client_id === issueId);
    if (!issue) return;
    // onSelect captures currentPairs at call time. If field value changes while the sheet
    // is open (fast double-tap), the committed value is built from the snapshot taken here.
    // Low risk: the sheet modal prevents further interaction until closed.
    useSurfaceStore.getState().open('item-issue-severity-picker', {
      issueId: issue.client_id,
      issueName: issue.name,
      currentSeverityId:
        currentPairs.find((p) => p.issue_id === issueId)?.issue_severity_id ?? null,
      onSelect: (id: string, severityId: string) => {
        const next = currentPairs.filter((p) => p.issue_id !== id);
        field.onChange([...next, { issue_id: id, issue_severity_id: severityId }]);
      },
    });
  }

  function removeIssue(issueId: string) {
    field.onChange(currentPairs.filter((p) => p.issue_id !== issueId));
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="item-issues-field">
      <label className="text-sm font-medium text-muted-foreground">Issues</label>
      <BoxPicker
        mode="multiple"
        value={selectedIssueIds}
        options={options}
        onValueChange={(ids) => {
          // BoxPicker toggles the array. Detect which direction the change went:
          //   added:   new ID appeared → user tapped unselected issue → open severity picker
          //   removed: ID disappeared → user tapped selected issue body → reopen severity picker
          // RHF value is never updated here — only onSelect inside handleIssuePress writes it.
          // Removals via × go through removeIssue directly, not this handler.
          const added = ids.find((id) => !selectedIssueIds.includes(id));
          const removed = selectedIssueIds.find((id) => !ids.includes(id));
          if (added) handleIssuePress(added);
          if (removed) handleIssuePress(removed);
        }}
        layout="grid"
        columns={2}
        visualVariant="pill"
        showIcon={false}
        data-testid="item-issues-picker"
        renderSelectedAction={(option) => (
          <button
            type="button"
            aria-label={`Remove ${option.label} issue`}
            data-testid={`item-issue-${option.value}-remove-button`}
            className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-full p-1 text-xs opacity-70 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              removeIssue(option.value);
            }}
          >
            <X className="size-3" />
          </button>
        )}
      />
      {fieldState.error?.message ? (
        <p
          className="text-xs text-destructive"
          data-testid="item-issues-error"
          role="alert"
        >
          {fieldState.error.message}
        </p>
      ) : null}
    </div>
  );
}
