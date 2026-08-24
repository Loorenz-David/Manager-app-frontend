import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { MapPin, Mail, Phone, User } from "lucide-react";

import { useGetTaskQuery } from "../api/use-get-task-query";
import { formatAddress } from "../lib/task-detail";
import type { TaskCustomerDetailsSheetSurfaceProps } from "../surface-ids";

type CustomerDetailRowProps = {
  href?: string;
  icon: typeof Phone;
  label: string;
  testId: string;
  value: string;
};

function CustomerDetailRow({
  href,
  icon: Icon,
  label,
  testId,
  value,
}: CustomerDetailRowProps): React.JSX.Element {
  const content = (
    <>
      <Icon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] tracking-wide text-[color:var(--color-icon)]">
          {label}
        </span>
        {href ? (
          <span className="break-words text-primary underline decoration-dotted">
            {value}
          </span>
        ) : (
          <span className="break-words font-medium text-foreground">
            {value}
          </span>
        )}
      </span>
    </>
  );

  if (href) {
    return (
      <a className="flex items-start gap-2.5 text-sm" data-testid={testId} href={href}>
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-start gap-2.5 text-sm" data-testid={testId}>
      {content}
    </div>
  );
}

export function TaskCustomerDetailsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskCustomerDetailsSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId);

  // The page renders its own header, so the sheet's built-in one stays muted.
  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  const task = taskQuery.data?.task ?? null;
  const customerName = task?.customer_name_snapshot ?? null;
  const phoneNumber = task?.primary_phone_number ?? null;
  const email = task?.primary_email ?? null;
  const address = task ? formatAddress(task.address) : null;

  let body: React.ReactNode;

  if (taskQuery.isPending) {
    body = (
      <p className="text-sm text-muted-foreground">Loading customer detail...</p>
    );
  } else if (taskQuery.isError || !task) {
    body = (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Customer detail could not be loaded.
        </p>
        <button
          className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          type="button"
          onClick={() => {
            void taskQuery.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  } else if (!customerName && !phoneNumber && !email && !address) {
    body = (
      <p className="text-sm text-muted-foreground">
        No customer detail recorded for this task.
      </p>
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        {customerName ? (
          <CustomerDetailRow
            icon={User}
            label="Name"
            testId="task-customer-details-name"
            value={customerName}
          />
        ) : null}

        {phoneNumber ? (
          <CustomerDetailRow
            href={`tel:${phoneNumber}`}
            icon={Phone}
            label="Phone"
            testId="task-customer-details-phone"
            value={phoneNumber}
          />
        ) : null}

        {email ? (
          <CustomerDetailRow
            href={`mailto:${email}`}
            icon={Mail}
            label="Email"
            testId="task-customer-details-email"
            value={email}
          />
        ) : null}

        {address ? (
          <CustomerDetailRow
            icon={MapPin}
            label="Address"
            testId="task-customer-details-address"
            value={address}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 px-6 pb-6"
      data-testid="task-customer-details-sheet"
    >
      <p className="text-base font-semibold text-foreground">Customer detail</p>
      {body}
    </div>
  );
}
