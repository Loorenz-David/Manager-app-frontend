import { ItemIssuePreviewSection } from "@beyo/item-issues";
import { DashedInfoGroup, DashedInfoSection } from "@beyo/ui";
import { TaskScheduledDeliveryDatePill } from "@beyo/tasks";
import { useTaskStepDetailContext } from "../../providers/TaskStepDetailProvider";

export function TaskStepItemDetailsSection(): React.JSX.Element | null {
  const { step, workingSectionId, issuesSurfaceOpeners, openDeliveryDateSheet } =
    useTaskStepDetailContext();

  if (!step?.item) {
    return null;
  }

  const shouldRenderDeliveryWindow = step.task.task_type !== "internal";

  return (
    <DashedInfoGroup data-testid="task-step-item-details">
      <DashedInfoSection className="px-3 py-3">
        <div className="flex items-start gap-4 overflow-x-auto">
          {shouldRenderDeliveryWindow ? (
            <TaskScheduledDeliveryDatePill
              scheduledEndAt={step.task.scheduled_end_at ?? null}
              scheduledStartAt={step.task.scheduled_start_at ?? null}
              onPress={openDeliveryDateSheet}
            />
          ) : null}
        </div>
      </DashedInfoSection>

      <ItemIssuePreviewSection
        itemId={step.item.client_id}
        itemCategoryId={step.item.item_category_id ?? null}
        workingSectionId={workingSectionId}
        surfaceOpeners={issuesSurfaceOpeners}
        data-testid="task-step-item-issues-section"
      />
    </DashedInfoGroup>
  );
}
