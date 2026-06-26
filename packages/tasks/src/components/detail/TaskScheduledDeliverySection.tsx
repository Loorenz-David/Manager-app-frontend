import { DashedInfoSection } from "@beyo/ui";

import type { TaskDetailRaw } from "../../types";
import { TaskScheduledDeliveryDatePill } from "./TaskScheduledDeliveryDatePill";

type TaskScheduledDeliverySectionProps = {
  onOpenDeliveryDate: () => void;
  taskDetail: TaskDetailRaw | null;
};

export function TaskScheduledDeliverySection({
  onOpenDeliveryDate,
  taskDetail,
}: TaskScheduledDeliverySectionProps): React.JSX.Element | null {
  if (!taskDetail) {
    return null;
  }

  const { task } = taskDetail;
  const isInternalTask = task.task_type === "internal";

  return (
    <DashedInfoSection data-testid="task-detail-schedule-section">
      <div className="flex items-start gap-6">
        {!isInternalTask ? (
          <TaskScheduledDeliveryDatePill
            scheduledEndAt={task.scheduled_end_at ?? null}
            scheduledStartAt={task.scheduled_start_at ?? null}
            onPress={onOpenDeliveryDate}
          />
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
