import { useEffect } from 'react';

import type { TaskEditSurfaceProps } from '@/features/tasks/surfaces';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

export function TaskEditSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskEditSurfaceProps>();

  useEffect(() => {
    header?.setTitle('Edit task');
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
      <div className="text-center">
        <p className="text-base font-medium">Full task edit mode is not implemented yet.</p>
        <p className="mt-2 text-xs text-border">{taskId}</p>
      </div>
    </div>
  );
}
