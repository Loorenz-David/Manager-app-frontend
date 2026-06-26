import { useEffect, useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { DayCalendar, parseISOToDate, serializeDateToISO } from "@beyo/ui";

import { useUpdateTaskReadyByAt } from "../actions/use-update-task-ready-by-at";
import { useGetTaskQuery } from "../api/use-get-task-query";
import type { TaskReadyByAtSheetSurfaceProps } from "../surface-ids";

export function TaskReadyByAtSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskReadyByAtSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateReadyByAt = useUpdateTaskReadyByAt();
  const task = taskQuery.data?.task;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    parseISOToDate(task?.ready_by_at ?? null),
  );

  useEffect(() => {
    header?.setTitle("Ready by");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (!taskQuery.isPending) {
      setSelectedDate(parseISOToDate(task?.ready_by_at ?? null));
    }
  }, [taskQuery.isPending, task?.ready_by_at]);

  function handleSelect(date: Date | undefined) {
    if (!taskId || !date) {
      return;
    }

    setSelectedDate(date);
    header?.requestClose();
    updateReadyByAt.mutate({ taskId, ready_by_at: serializeDateToISO(date) });
  }

  return (
    <DayCalendar
      mode="single"
      onSelect={handleSelect}
      selected={selectedDate}
    />
  );
}
