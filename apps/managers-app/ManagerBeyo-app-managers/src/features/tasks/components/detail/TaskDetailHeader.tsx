import { m } from 'framer-motion';
import { Calendar } from 'lucide-react';

import { StatePill } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { useTaskDetailContext } from '../../providers/TaskDetailProvider';
import {
  RETURN_SOURCE_LABEL,
  TASK_STATE_VARIANT,
  TASK_TYPE_ICON,
  TASK_TYPE_LABEL,
  daysUntil,
  formatDateDDMMYY,
  humanizeSnakeCase,
} from '../../lib/task-detail';

function DaysLeftPill({ days }: { days: number }): React.JSX.Element | null {
  if (Math.abs(days) > 99) {
    return null;
  }

  const baseClass =
    'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium';

  if (days <= 3) {
    return (
      <m.span
        animate={{ backgroundColor: ['hsl(var(--destructive))', 'transparent'] }}
        className={cn(baseClass, 'text-destructive')}
        transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
      >
        {days}d
      </m.span>
    );
  }

  return <span className={cn(baseClass, 'bg-amber-500/15 text-amber-600')}>{days}d</span>;
}

export function TaskDetailHeader(): React.JSX.Element | null {
  const { openMenu, taskDetail } = useTaskDetailContext();

  if (!taskDetail) {
    return null;
  }

  const { task, item } = taskDetail;
  const articleLabel = item
    ? (item.article_number ?? item.sku ?? 'Article number missing')
    : 'No item linked';
  const TypeIcon = TASK_TYPE_ICON[task.task_type];
  const typeLabel = TASK_TYPE_LABEL[task.task_type];
  const returnSourceLabel = task.return_source ? RETURN_SOURCE_LABEL[task.return_source] : null;
  const readyByLabel = formatDateDDMMYY(task.ready_by_at ?? null);
  const days = daysUntil(task.ready_by_at ?? null);

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {articleLabel}
        </span>
        <StatePill
          label={humanizeSnakeCase(task.state) ?? task.state}
          variant={TASK_STATE_VARIANT[task.state]}
        />
        <button
          aria-label="Task actions"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
          type="button"
          onClick={openMenu}
        >
          <span className="flex flex-col items-center gap-0.5">
            {[0, 1, 2].map((index) => (
              <span key={index} className="size-1 rounded-full bg-current" />
            ))}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TypeIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {typeLabel}
          {returnSourceLabel ? ` • ${returnSourceLabel}` : ''}
        </span>
      </div>

      {readyByLabel ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
          <span>{readyByLabel}</span>
          {days !== null ? <DaysLeftPill days={days} /> : null}
        </div>
      ) : null}
    </div>
  );
}
