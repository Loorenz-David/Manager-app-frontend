import { Plus } from "lucide-react";
import { useMemo } from "react";

import {
  EyebrowLabel,
  DashedInfoSection,
  InfoPill,
} from "@beyo/ui";
import { useIssueTypesQuery } from "@beyo/item-issues";

import type { WorkerItemIssueSelectionDraft } from "../types";

type WorkerItemIssuePreviewSectionProps = {
  draft: WorkerItemIssueSelectionDraft;
  itemCategoryId: string | null | undefined;
  workingSectionId: string | null | undefined;
  onOpen: () => void;
};

export function WorkerItemIssuePreviewSection({
  draft,
  itemCategoryId,
  workingSectionId,
  onOpen,
}: WorkerItemIssuePreviewSectionProps): React.JSX.Element {
  const issueTypesQuery = useIssueTypesQuery(
    {
      working_section_ids: workingSectionId ? [workingSectionId] : [],
      item_category_ids: itemCategoryId ? [itemCategoryId] : [],
    },
  );

  const selectedIssueTypes = useMemo(() => {
    const issueTypes = issueTypesQuery.data?.issue_types ?? [];
    return Object.entries(draft ?? {})
      .filter(([, intensity]) => intensity > 0)
      .map(([issueTypeId, intensity]) => {
        const issueType = issueTypes.find(
          (candidate) => candidate.client_id === issueTypeId,
        );
        return issueType
          ? {
              client_id: issueType.client_id,
              name: issueType.name,
              issue_mode: issueType.issue_mode,
              intensity,
            }
          : null;
      })
      .filter((issueType) => issueType !== null);
  }, [draft, issueTypesQuery.data?.issue_types]);

  const canOpen = Boolean(itemCategoryId && workingSectionId);

  return (
    <DashedInfoSection data-testid="worker-item-issue-preview-section">
      <EyebrowLabel>Issues Found</EyebrowLabel>
      <div className="flex flex-wrap gap-2">
        {selectedIssueTypes.length > 0 ? (
          selectedIssueTypes.map((issueType) => (
            <InfoPill
              key={issueType.client_id}
              data-testid="worker-item-issue-pill"
            >
              <span>{issueType.name}</span>
              {issueType.issue_mode !== "switch" ? (
                <span className="ml-1 text-xs opacity-70">
                  ({issueType.intensity})
                </span>
              ) : null}
            </InfoPill>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">
            {canOpen ? "No issues added yet" : "Select a category first"}
          </span>
        )}

        <button
          aria-label="Add issue"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground disabled:opacity-50"
          data-testid="worker-add-issue-button"
          disabled={!canOpen}
          type="button"
          onClick={onOpen}
        >
          <Plus aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </DashedInfoSection>
  );
}
