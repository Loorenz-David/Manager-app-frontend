import { useEffect } from 'react';

import { CaseTaskInfoSheetContent } from '@/features/cases/components/CaseTaskInfoSheetContent';
import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import type { CaseTaskInfoSheetSurfaceProps } from '@/features/cases/surfaces';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

export function CaseTaskInfoSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<CaseTaskInfoSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId);

  useEffect(() => {
    header?.setTitle('Task info');
    header?.setActions(null);
  }, [header]);

  if (!taskId) {
    return (
      <div
        className="bg-background p-4 text-sm text-muted-foreground"
        data-testid="case-task-info-sheet"
      >
        Task id is missing.
      </div>
    );
  }

  return (
    <div className="bg-background" data-testid="case-task-info-sheet">
      <CaseTaskInfoSheetContent
        isError={taskQuery.isError}
        isPending={taskQuery.isPending}
        onRetry={taskQuery.refetch}
        taskDetail={taskQuery.data}
        taskId={taskId}
      />
    </div>
  );
}
