import { cn } from "@beyo/lib";
import { SectionLabel } from "@beyo/ui";

import { useTaskFlowRecordsQuery } from "../api/use-task-flow-records-query";
import { formatDateTime, getFlowActorLabel } from "../lib/task-flow-record";

type TaskFlowTimelineProps = {
  taskId: string;
  onRecordPress: (entityClientId: string) => void;
};

export function TaskFlowTimeline({
  taskId,
  onRecordPress,
}: TaskFlowTimelineProps): React.JSX.Element {
  const query = useTaskFlowRecordsQuery(taskId);

  const sorted = [...(query.data?.flow_records ?? [])].sort(
    (left, right) =>
      new Date(right.created_at).getTime() -
      new Date(left.created_at).getTime(),
  );

  return (
    <div
      className="mt-7 flex flex-col gap-3"
      data-testid="task-detail-flow-section"
    >
      <SectionLabel as="h3" tone="muted">
        Flow timeline
      </SectionLabel>

      {query.isPending ? (
        <p className="text-sm text-muted-foreground">
          Loading timeline…
        </p>
      ) : query.isError ? (
        <p className="text-sm text-muted-foreground">
          Could not load timeline.
        </p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
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
                className="flex w-full gap-0 text-left"
                type="button"
                onClick={() => onRecordPress(record.entity_client_id)}
              >
                <div className="relative mr-3 flex w-4 shrink-0 flex-col items-center">
                  <div
                    className={cn(
                      "mt-0.5 h-3 w-3 shrink-0 rounded-full",
                      isMostRecent
                        ? "bg-primary"
                        : "bg-(--color-border)",
                    )}
                  />
                  {!isLast ? (
                    <div className="mt-1 w-px flex-1 bg-(--color-border)" />
                  ) : null}
                </div>

                <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
                  <p
                    className={cn(
                      "text-sm",
                      isMostRecent ? "text-foreground" : "text-foreground/75",
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
