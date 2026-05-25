import { Plus } from "lucide-react";

import {
  DashedInfoSection,
  EyebrowLabel,
  InfoPill,
} from "@/components/primitives";
import { useTaskDetailContext } from "../../providers/TaskDetailProvider";

export function TaskIssuesSection(): React.JSX.Element | null {
  const { openIssueSheet, taskDetail, issueNameByTypeId } =
    useTaskDetailContext();

  if (!taskDetail) {
    return null;
  }

  const issues = taskDetail.item_issues;

  return (
    <DashedInfoSection data-testid="task-detail-issues-section">
      <EyebrowLabel>Issues Found</EyebrowLabel>

      <div className="flex flex-wrap gap-2">
        {issues.map((issue) => (
          <InfoPill key={issue.client_id}>
            {issue.issue_name_snapshot ??
              issueNameByTypeId.get(issue.issue_type_id) ??
              "—"}
          </InfoPill>
        ))}

        <button
          aria-label="Add issue"
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground "
          onClick={openIssueSheet}
        >
          <Plus aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </DashedInfoSection>
  );
}
