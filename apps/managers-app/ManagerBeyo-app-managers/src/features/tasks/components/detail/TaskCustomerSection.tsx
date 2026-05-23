import { Mail, Phone, Truck } from 'lucide-react';

import { DashedInfoSection } from '@/components/primitives';

import { humanizeSnakeCase } from '../../lib/task-detail';
import { useTaskDetailContext } from '../../providers/TaskDetailProvider';

export function TaskCustomerSection(): React.JSX.Element | null {
  const { taskDetail } = useTaskDetailContext();

  if (!taskDetail) {
    return null;
  }

  const { task } = taskDetail;
  if (task.task_type === 'internal') {
    return null;
  }

  const fulfillmentLabel = task.fulfillment_method
    ? humanizeSnakeCase(task.fulfillment_method)
    : null;

  return (
    <DashedInfoSection data-testid="task-detail-customer-section">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Customer Detail</span>

      <div className="flex flex-col gap-2.5">
        {task.primary_phone_number ? (
          <a href={`tel:${task.primary_phone_number}`} className="flex items-center gap-2.5 text-sm">
            <Phone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-primary underline decoration-dotted">
              {task.primary_phone_number}
            </span>
          </a>
        ) : null}

        {task.primary_email ? (
          <a href={`mailto:${task.primary_email}`} className="flex items-center gap-2.5 text-sm">
            <Mail aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-primary underline decoration-dotted">{task.primary_email}</span>
          </a>
        ) : null}

        {fulfillmentLabel ? (
          <div className="flex items-center gap-2.5 text-sm">
            <Truck aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground">{fulfillmentLabel}</span>
          </div>
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
