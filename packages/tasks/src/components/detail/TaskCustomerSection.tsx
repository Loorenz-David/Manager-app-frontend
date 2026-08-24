import { Phone, User } from "lucide-react";

import { DashedInfoSection, EyebrowLabel } from "@beyo/ui";

import type { TaskDetailRaw } from "../../types";

type TaskCustomerSectionProps = {
  onPress?: () => void;
  taskDetail: TaskDetailRaw | null;
};

export function TaskCustomerSection({
  onPress,
  taskDetail,
}: TaskCustomerSectionProps): React.JSX.Element | null {
  if (!taskDetail) {
    return null;
  }

  const { task } = taskDetail;
  if (task.task_type === "internal") {
    return null;
  }

  const customerName = task.customer_name_snapshot ?? null;

  return (
    <DashedInfoSection data-testid="task-detail-customer-section">
      {/* The whole section is the tap target for the customer detail sheet, so
          the phone number renders as plain text here — the sheet owns the
          `tel:` link. */}
      <button
        className="flex w-full flex-col gap-2.5 text-left"
        data-testid="task-detail-customer-section-trigger"
        type="button"
        onClick={onPress}
      >
        <EyebrowLabel>Customer Detail</EyebrowLabel>

        {customerName ? (
          <span className="flex items-center gap-2.5 text-sm">
            <User
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="font-medium text-foreground">{customerName}</span>
          </span>
        ) : null}

        {task.primary_phone_number ? (
          <span className="flex items-center gap-2.5 text-sm">
            <Phone
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="font-medium text-foreground">
              {task.primary_phone_number}
            </span>
          </span>
        ) : null}
      </button>
    </DashedInfoSection>
  );
}
