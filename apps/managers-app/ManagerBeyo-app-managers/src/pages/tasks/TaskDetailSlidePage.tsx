import { useEffect } from 'react';

import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import type { TaskDetailSurfaceProps } from '@/features/tasks/surfaces';

export function TaskDetailSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskDetailSurfaceProps>();

  useEffect(() => {
    header?.setTitle('Task');
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
      <p className="text-base font-medium">Task details</p>
      <p className="text-sm">Coming soon</p>
      <p className="text-xs text-border">{taskId}</p>
    </div>
  );
}
