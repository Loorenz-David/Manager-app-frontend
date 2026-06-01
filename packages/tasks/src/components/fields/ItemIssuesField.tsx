import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useController, useFormContext } from "react-hook-form";
import { BoxPicker, FieldLabelRow } from "@beyo/ui";
import type { BoxPickerOptionType } from "@beyo/ui";

import { useItemIssuesPickerFlow } from "../../flows/use-item-issues-picker.flow";
import type { ItemIssueFieldEntry } from "../../types";

export function ItemIssuesField() {
  const { control, watch } = useFormContext();
  const itemCategoryId = watch("item.item_category_id") as string | undefined;
  const flow = useItemIssuesPickerFlow(itemCategoryId ?? null);
  const { field, fieldState } = useController({
    name: "item_issues",
    control,
    defaultValue: [],
  });

  const currentPairs: ItemIssueFieldEntry[] = field.value ?? [];
  const selectedIssueIds = currentPairs.map((pair) => pair.issue_id);
  const previousCategoryRef = useRef<string | undefined>(itemCategoryId);
  const allSelected =
    flow.options.length > 0 &&
    flow.options.every((issue) =>
      selectedIssueIds.includes(issue.issue_type_id),
    );

  useEffect(() => {
    if (previousCategoryRef.current === itemCategoryId) {
      return;
    }

    const previousCategoryId = previousCategoryRef.current;
    previousCategoryRef.current = itemCategoryId;

    if (previousCategoryId !== undefined) {
      field.onChange([]);
    }
  }, [field, itemCategoryId]);

  const options: BoxPickerOptionType[] = flow.options.map((issue) => ({
    value: issue.issue_type_id,
    label: issue.issue_type_name,
    testId: `item-issue-${issue.issue_type_id}-option`,
  }));

  function removeIssue(issueId: string) {
    field.onChange(currentPairs.filter((pair) => pair.issue_id !== issueId));
  }

  function selectAllIssues() {
    if (allSelected) {
      field.onChange([]);
      return;
    }

    field.onChange(
      flow.options.map((issue) => ({
        issue_id: issue.issue_type_id,
        issue_severity_id: "",
      })),
    );
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="item-issues-field">
      <FieldLabelRow label="Issues Found">
        <button
          type="button"
          className="text-sm font-light text-[var(--color-muted))]"
          data-testid="item-issues-select-all-button"
          disabled={
            flow.isDisabled || flow.isLoading || flow.options.length === 0
          }
          onClick={selectAllIssues}
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </FieldLabelRow>

      {flow.isDisabled ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="item-issues-disabled-state"
        >
          Select a category first
        </p>
      ) : flow.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading issues…</p>
      ) : (
        <BoxPicker
          mode="multiple"
          value={selectedIssueIds}
          options={options}
          onValueChange={(ids) => {
            const added = ids.find((id) => !selectedIssueIds.includes(id));
            const removed = selectedIssueIds.find((id) => !ids.includes(id));

            if (added) {
              field.onChange([
                ...currentPairs,
                { issue_id: added, issue_severity_id: "" },
              ]);
            }

            if (removed) {
              removeIssue(removed);
            }
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
              onClick={(event) => {
                event.stopPropagation();
                removeIssue(option.value);
              }}
            >
              <X className="size-3" />
            </button>
          )}
        />
      )}

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
