import { useEffect, useMemo } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  TASK_DETAIL_SURFACE_ID,
  type TaskDetailSurfaceProps,
} from "@beyo/tasks";
import { useSurfaceStore } from "@beyo/ui";

import { humanizeReason } from "../lib/time-line-calendar/pause-reason-labels";
import type { CalendarEventRecord } from "../lib/time-line-calendar/segment-adapter";
import type { WorkerTimelineEventSheetProps } from "../surface-ids";

type TaskGroup = {
  taskId: string;
  records: CalendarEventRecord[];
};

// Record chooser for multi-record timeline events. Records are listed
// individually but visually grouped by task, so the user understands why
// several records contributed and picks the intended task deliberately —
// never an arbitrary first-task navigation.
export function WorkerTimelineEventSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<WorkerTimelineEventSheetProps>();
  const records = useMemo(() => props.records ?? [], [props.records]);

  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo<TaskGroup[]>(() => {
    const byTask = new Map<string, CalendarEventRecord[]>();
    for (const record of records) {
      const group = byTask.get(record.taskId);
      if (group) {
        group.push(record);
      } else {
        byTask.set(record.taskId, [record]);
      }
    }
    return [...byTask.entries()].map(([taskId, taskRecords]) => ({
      taskId,
      records: taskRecords,
    }));
  }, [records]);

  function handleOpenTask(taskId: string): void {
    useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
      taskId,
    } satisfies TaskDetailSurfaceProps);
  }

  return (
    <div
      className="flex flex-col gap-3 px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-4"
      data-testid="worker-timeline-event-sheet"
    >
      <div>
        <p className="text-md font-semibold text-foreground">
          {props.title ?? "Records"}
        </p>
        {props.subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {props.subtitle}
          </p>
        ) : null}
      </div>

      {groups.map((group) => {
        const primary = group.records[0];
        const groupLabel =
          primary.articleLabel ?? primary.workingSectionName ?? "Task";

        return (
          <button
            key={group.taskId}
            className="flex w-full flex-col gap-2 rounded-2xl bg-card px-4 py-3 text-left shadow-sm"
            data-testid={`timeline-event-task-${group.taskId}`}
            type="button"
            onClick={() => handleOpenTask(group.taskId)}
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                {groupLabel}
              </p>
              {group.records.length > 1 ? (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {group.records.length} records
                </span>
              ) : null}
            </div>

            {group.records.map((record) => (
              <div
                key={record.recordId}
                className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {humanizeReason(record.state)}
                </span>
                {record.reasonLabel ? <span>· {record.reasonLabel}</span> : null}
                {record.workingSectionName ? (
                  <span>· {record.workingSectionName}</span>
                ) : null}
                <span className="tabular-nums">
                  {record.enteredAtLabel} –{" "}
                  {record.isOpen ? "now" : (record.exitedAtLabel ?? "—")}
                </span>
                {record.isCompleted ? (
                  <span className="rounded-full bg-[#dff3e6] px-1.5 py-px font-semibold text-[#1e7a46]">
                    ✓ completed
                  </span>
                ) : null}
                {record.isOpen ? (
                  <span className="rounded-full bg-[#eaf1fd] px-1.5 py-px font-semibold text-[#2f6fed]">
                    live
                  </span>
                ) : null}
              </div>
            ))}
          </button>
        );
      })}
    </div>
  );
}
