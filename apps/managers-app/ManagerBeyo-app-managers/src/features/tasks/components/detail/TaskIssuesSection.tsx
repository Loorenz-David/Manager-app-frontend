import { Plus } from 'lucide-react';

import { DashedInfoSection } from '@/components/primitives';
import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

const issuePillClass =
  'inline-flex items-center rounded-full border border-[var(--color-info-pill-border)] bg-[var(--color-info-pill)] px-3 py-1.5 text-sm font-medium text-foreground';

export function TaskIssuesSection(): React.JSX.Element | null {
  const { openIssueSheet, taskDetail, issueNameByTypeId } = useTaskDetailContext();

  if (!taskDetail) {
    return null;
  }

  const issues = taskDetail.item_issues;

  return (
    <DashedInfoSection data-testid="task-detail-issues-section">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Issues Found</span>

      <div className="flex flex-wrap gap-2">
        {issues.map((issue) => (
          <span key={issue.client_id} className={issuePillClass}>
            {issue.issue_name_snapshot ?? issueNameByTypeId.get(issue.issue_type_id) ?? '—'}
          </span>
        ))}

        <button
          aria-label="Add issue"
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground"
          onClick={openIssueSheet}
        >
          <Plus aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </DashedInfoSection>
  );
}
