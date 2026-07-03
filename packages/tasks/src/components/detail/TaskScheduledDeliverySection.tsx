import { useSurface } from "@beyo/hooks";
import { TaskNotePill, TASK_NOTES_SHEET_SURFACE_ID } from "@beyo/task-notes";
import { DashedInfoSection } from "@beyo/ui";

import type { TaskDetailRaw } from "../../types";
import { TaskAssortmentPill } from "./TaskAssortmentPill";
import { TaskFulfillmentMethodPill } from "./TaskFulfillmentMethodPill";
import { TaskScheduledDeliveryDatePill } from "./TaskScheduledDeliveryDatePill";

type TaskScheduledDeliverySectionProps = {
  onOpenDeliveryDate: () => void;
  onOpenAssortment?: () => void;
  onOpenFulfillmentMethod?: () => void;
  taskDetail: TaskDetailRaw | null;
};

export function TaskScheduledDeliverySection({
  onOpenDeliveryDate,
  onOpenAssortment,
  onOpenFulfillmentMethod,
  taskDetail,
}: TaskScheduledDeliverySectionProps): React.JSX.Element | null {
  const surface = useSurface();

  if (!taskDetail) {
    return null;
  }

  const { task } = taskDetail;
  const isReturnTask = task.task_type === "return";
  const isStoreReturn = task.return_source === "store_return";
  const shouldRenderPostHandlingPills =
    task.task_type === "pre_order" || (isReturnTask && !isStoreReturn);

  return (
    <DashedInfoSection data-testid="task-detail-schedule-section">
      <div className="flex items-start gap-6">
        <TaskNotePill
          labelFormatter={(count) => `${count} notes`}
          taskId={task.client_id}
          onPress={() => {
            surface.open(TASK_NOTES_SHEET_SURFACE_ID, {
              taskId: task.client_id,
            });
          }}
        />
        {shouldRenderPostHandlingPills ? (
          <TaskScheduledDeliveryDatePill
            scheduledEndAt={task.scheduled_end_at ?? null}
            scheduledStartAt={task.scheduled_start_at ?? null}
            onPress={onOpenDeliveryDate}
          />
        ) : null}
        {shouldRenderPostHandlingPills ? (
          <TaskFulfillmentMethodPill
            fulfillmentMethod={task.fulfillment_method ?? null}
            onPress={onOpenFulfillmentMethod}
          />
        ) : null}
        {isReturnTask && isStoreReturn ? (
          <TaskAssortmentPill
            assortment={task.assortment ?? null}
            onPress={onOpenAssortment}
          />
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
