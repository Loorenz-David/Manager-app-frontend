import { Plus } from "lucide-react";
import { DashedInfoSection, EyebrowLabel, InfoPill } from "@beyo/ui";

import { useItemIssuesQuery } from "../api/use-item-issues-query";
import type { TaskIssueSurfaceOpeners } from "../surface-ids";

type TaskIssuesSectionProps = {
  itemId: string | null | undefined;
  surfaceOpeners?: TaskIssueSurfaceOpeners;
  "data-testid"?: string;
};

export function TaskIssuesSection({
  itemId,
  surfaceOpeners,
  "data-testid": testId = "task-detail-issues-section",
}: TaskIssuesSectionProps): React.JSX.Element | null {
  const issuesQuery = useItemIssuesQuery(itemId);
  const issues = issuesQuery.data?.issues ?? [];

  if (!itemId) {
    return null;
  }

  if (!issues.length && !surfaceOpeners?.openFastIssueSheet) {
    return null;
  }

  return (
    <DashedInfoSection data-testid={testId}>
      <EyebrowLabel>Issues Found</EyebrowLabel>

      <div className="flex flex-wrap gap-2">
        {issues.map((issue) => (
          <InfoPill key={issue.client_id}>{issue.issue_name_snapshot ?? "—"}</InfoPill>
        ))}

        {surfaceOpeners?.openFastIssueSheet ? (
          <button
            aria-label="Add issue"
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground"
            onClick={surfaceOpeners.openFastIssueSheet}
          >
            <Plus aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
