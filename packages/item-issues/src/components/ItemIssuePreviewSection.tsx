import { Plus } from "lucide-react";

import { DashedInfoSection, EyebrowLabel, InfoPill } from "@beyo/ui";

import { useItemIssuesQuery } from "../api/use-item-issues-query";
import type { ItemIssueSurfaceOpeners } from "../surface-ids";

type ItemIssuePreviewSectionProps = {
  itemId: string | null | undefined;
  workingSectionId: string | null | undefined;
  itemCategoryId?: string | null | undefined;
  surfaceOpeners?: ItemIssueSurfaceOpeners;
  "data-testid"?: string;
};

export function ItemIssuePreviewSection({
  itemId,
  workingSectionId,
  itemCategoryId,
  surfaceOpeners,
  "data-testid": testId = "item-issue-preview-section",
}: ItemIssuePreviewSectionProps): React.JSX.Element | null {
  const issuesQuery = useItemIssuesQuery(itemId, {
    working_section_id: workingSectionId ?? undefined,
    item_category_id: itemCategoryId ?? undefined,
  });
  const issues = issuesQuery.data?.item_issues_pagination.items ?? [];

  if (!itemId) {
    return null;
  }

  if (!issues.length && !surfaceOpeners?.openIssueSelection) {
    return null;
  }

  return (
    <DashedInfoSection data-testid={testId}>
      <EyebrowLabel>Issues Found</EyebrowLabel>
      <div className="flex flex-wrap gap-2">
        {issues.map((issue) => (
          <InfoPill
            key={issue.client_id}
            className="border-amber-400 bg-amber-50 text-amber-500"
            data-testid="item-issue-pill"
          >
            <span>{issue.issue_type_snapshot}</span>
            {issue.issue_mode_snapshot !== "switch" ? (
              <span className="ml-1 text-xs opacity-70">
                ({issue.intensity})
              </span>
            ) : null}
          </InfoPill>
        ))}

        {surfaceOpeners?.openIssueSelection ? (
          <button
            aria-label="Add issue"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground"
            data-testid="add-issue-button"
            type="button"
            onClick={surfaceOpeners.openIssueSelection}
          >
            <Plus aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
