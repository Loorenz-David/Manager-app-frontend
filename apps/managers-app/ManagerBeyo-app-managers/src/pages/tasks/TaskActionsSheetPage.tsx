import { useEffect } from 'react';

import type { TaskActionsSurfaceProps } from '@/features/tasks/surfaces';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

export function TaskActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskActionsSurfaceProps>();

  useEffect(() => {
    header?.setTitle('Actions');
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
      <p className="text-sm">Actions coming soon</p>
      <p className="text-xs text-border">{taskId}</p>
    </div>
  );
}
