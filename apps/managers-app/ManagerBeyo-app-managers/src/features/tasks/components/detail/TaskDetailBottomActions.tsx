import { useSurface } from '@/hooks/use-surface';

import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

export function TaskDetailBottomActions(): React.JSX.Element {
  const { openEditTask } = useTaskDetailContext();
  const surface = useSurface();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-3 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]">
      <button
        type="button"
        className="flex-1 rounded-xl bg-[var(--color-card)] py-3 text-sm font-semibold text-foreground"
        onClick={openEditTask}
      >
        Edit
      </button>
      <button
        className="flex-1 rounded-xl bg-[var(--color-primary)] py-3 text-sm font-semibold text-white"
        type="button"
        onClick={() => surface.closeTop()}
      >
        Close
      </button>
    </div>
  );
}
