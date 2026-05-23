import { DashedInfoSection } from '@/components/primitives';

import { isoWeek } from '../../lib/task-detail';
import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

const pillClass =
  'inline-flex items-center rounded-full border border-[var(--color-info-pill-border)] bg-[var(--color-info-pill)] px-3 py-1.5 text-sm font-medium text-foreground';

export function TaskScheduledDeliverySection(): React.JSX.Element | null {
  const { openQuantitySheet, openScheduleSheet, taskDetail } = useTaskDetailContext();

  if (!taskDetail) {
    return null;
  }

  const { item, task } = taskDetail;
  const week = isoWeek(task.scheduled_start_at ?? null);
  const quantity = item?.quantity ?? null;
  const quantityLabel = quantity !== null ? `${quantity} ${quantity === 1 ? 'piece' : 'pieces'}` : null;

  if (week === null && quantityLabel === null) {
    return null;
  }

  return (
    <DashedInfoSection data-testid="task-detail-schedule-section">
      <div className="flex items-start gap-6">
        {week !== null ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Delivery Week
            </span>
            <button className={pillClass} type="button" onClick={openScheduleSheet}>
              Week {week}
            </button>
          </div>
        ) : null}

        {quantityLabel !== null ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Quantity</span>
            <button className={pillClass} type="button" onClick={openQuantitySheet}>
              {quantityLabel}
            </button>
          </div>
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
