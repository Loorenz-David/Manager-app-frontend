import { DashedInfoSection, EyebrowLabel, InfoPill } from '@/components/primitives';

import { isoWeek } from "../../lib/task-detail";
import { useTaskDetailContext } from "../../providers/TaskDetailProvider";

export function TaskScheduledDeliverySection(): React.JSX.Element | null {
  const { openQuantitySheet, openScheduleSheet, taskDetail } =
    useTaskDetailContext();

  if (!taskDetail) {
    return null;
  }

  const { item, task } = taskDetail;
  const week = isoWeek(task.scheduled_start_at ?? null);
  const quantity = item?.quantity ?? null;
  const quantityLabel =
    quantity !== null
      ? `${quantity} ${quantity === 1 ? "piece" : "pieces"}`
      : null;

  if (week === null && quantityLabel === null) {
    return null;
  }

  return (
    <DashedInfoSection data-testid="task-detail-schedule-section">
      <div className="flex items-start gap-6">
        {week !== null ? (
          <div className="flex flex-col gap-1.5">
            <EyebrowLabel>Delivery Week</EyebrowLabel>
            <button
              className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              type="button"
              onClick={openScheduleSheet}
            >
              <InfoPill>Week {week}</InfoPill>
            </button>
          </div>
        ) : null}

        {quantityLabel !== null ? (
          <div className="flex flex-col gap-1.5">
            <EyebrowLabel>Quantity</EyebrowLabel>
            <button
              className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              type="button"
              onClick={openQuantitySheet}
            >
              <InfoPill>{quantityLabel}</InfoPill>
            </button>
          </div>
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
