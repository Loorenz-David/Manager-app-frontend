import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { resolveRangeSelection } from "@beyo/lib";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  BoxSlidePicker,
  DayCalendar,
  formatDateDisplay,
  parseISOToDate,
  serializeDateToISO,
} from "@beyo/ui";

import { useUpdateTaskSchedule } from "../actions/use-update-task-schedule";
import { useGetTaskQuery } from "../api/use-get-task-query";
import type { TaskScheduledDeliverySheetSurfaceProps } from "../surface-ids";

export function TaskScheduledDeliverySheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, mode = "edit" } =
    useSurfaceProps<TaskScheduledDeliverySheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateSchedule = useUpdateTaskSchedule();
  const task = taskQuery.data?.task;
  const isReadOnly = mode === "view";
  const [activeTarget, setActiveTarget] = useState<"from" | "to">("from");
  const [fromDate, setFromDate] = useState<Date | undefined>(
    parseISOToDate(task?.scheduled_start_at ?? null),
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    parseISOToDate(task?.scheduled_end_at ?? null),
  );

  useEffect(() => {
    header?.setTitle("Delivery window");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (!taskQuery.isPending) {
      setFromDate(parseISOToDate(task?.scheduled_start_at ?? null));
      setToDate(parseISOToDate(task?.scheduled_end_at ?? null));
    }
  }, [taskQuery.isPending, task?.scheduled_start_at, task?.scheduled_end_at]);

  function handleDayClick(date: Date) {
    if (!taskId || isReadOnly) {
      return;
    }

    const resolution = resolveRangeSelection({
      activeTarget,
      clickedDate: date,
      fromDate,
      toDate,
    });

    setFromDate(resolution.fromDate);
    setToDate(resolution.toDate);
    setActiveTarget(resolution.nextActiveTarget);

    if (resolution.shouldClose) {
      header?.requestClose();
      updateSchedule.mutate({
        taskId,
        scheduled_start_at: resolution.fromDate
          ? serializeDateToISO(resolution.fromDate)
          : null,
        scheduled_end_at: resolution.toDate
          ? serializeDateToISO(resolution.toDate)
          : null,
      });
    }
  }

  return (
    <div data-testid="task-scheduled-delivery-sheet-page">
      {!isReadOnly ? (
        <BoxSlidePicker
          className="mx-4 mb-4 mt-2"
          dataTestId="delivery-date-range-tabs"
          options={[
            {
              value: "from",
              testId: "delivery-date-from-tab",
              label: (
                <span className="flex min-w-0 flex-col items-center">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
                    From
                  </span>
                  <span
                    className={
                      fromDate
                        ? "mt-0.5 text-sm font-medium text-foreground"
                        : "mt-0.5 text-sm font-medium text-muted-foreground"
                    }
                  >
                    {fromDate
                      ? formatDateDisplay(serializeDateToISO(fromDate))
                      : "Select start"}
                  </span>
                </span>
              ),
            },
            {
              value: "to",
              testId: "delivery-date-to-tab",
              label: (
                <span className="flex min-w-0 flex-col items-center">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/90">
                    To
                  </span>
                  <span
                    className={
                      toDate
                        ? "mt-0.5 text-sm font-medium text-foreground"
                        : "mt-0.5 text-sm font-medium text-muted-foreground"
                    }
                  >
                    {toDate
                      ? formatDateDisplay(serializeDateToISO(toDate))
                      : "Select end"}
                  </span>
                </span>
              ),
            },
          ]}
          value={activeTarget}
          onValueChange={(value) => {
            setActiveTarget(value as "from" | "to");
          }}
        />
      ) : null}
      <DayCalendar
        mode="range"
        onDayClick={handleDayClick}
        onSelect={(_range: DateRange | undefined) => {}}
        selected={{ from: fromDate, to: toDate }}
      />
    </div>
  );
}
