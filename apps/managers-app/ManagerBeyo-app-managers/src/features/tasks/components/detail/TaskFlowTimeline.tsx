import { cn } from "@/lib/utils";

import { formatDateTime, getFlowActorLabel } from "../../lib/task-detail";
import { useTaskDetailContext } from "../../providers/TaskDetailProvider";

export function TaskFlowTimeline(): React.JSX.Element {
  const { flowRecords, isFlowPending, openFlowRecord } = useTaskDetailContext();
  const sorted = [...flowRecords].sort(
    (left, right) =>
      new Date(right.created_at).getTime() -
      new Date(left.created_at).getTime(),
  );

  return (
    <div
      className="flex flex-col gap-3 mt-7"
      data-testid="task-detail-flow-section"
    >
      <h3 className="text-xs  uppercase tracking-wide text-[color:var(--color-icon)]">
        Flow timeline
      </h3>

      {isFlowPending ? (
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          Loading timeline…
        </p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          No flow records yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {sorted.map((record, index) => {
            const isMostRecent = index === 0;
            const isLast = index === sorted.length - 1;

            return (
              <button
                key={`${record.entity_client_id}-${record.created_at}`}
                type="button"
                className="flex w-full gap-0 text-left"
                onClick={() => openFlowRecord(record.entity_client_id)}
              >
                <div className="relative mr-3 flex w-4 shrink-0 flex-col items-center">
                  <div
                    className={cn(
                      "mt-0.5 h-3 w-3 shrink-0 rounded-full",
                      isMostRecent
                        ? "bg-primary"
                        : "bg-[color:var(--color-border)]",
                    )}
                  />
                  {!isLast ? (
                    <div className="mt-1 w-px flex-1 bg-[color:var(--color-border)]" />
                  ) : null}
                </div>

                <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
                  <p
                    className={cn(
                      "text-sm",
                      isMostRecent ? " text-foreground" : " text-foreground/75",
                    )}
                  >
                    {record.description ?? record.type}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {getFlowActorLabel(record)} ·{" "}
                    {formatDateTime(record.created_at)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
