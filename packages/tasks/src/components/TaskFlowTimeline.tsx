import { cn } from "@beyo/lib";
import { SectionLabel } from "@beyo/ui";

import { useTaskFlowRecordsInfiniteQuery } from "../api/use-task-flow-records-infinite-query";
import { formatDateTime, getFlowActorLabel } from "../lib/task-flow-record";
import { FlowRecordDescription } from "./flow-descriptions/FlowRecordDescription";

type TaskFlowTimelineProps = {
  taskId: string;
  onRecordPress: (entityClientId: string) => void;
  initialLimit?: number;
  loadMoreSize?: number;
};

export function TaskFlowTimeline({
  taskId,
  onRecordPress,
  initialLimit = 10,
  loadMoreSize = 10,
}: TaskFlowTimelineProps): React.JSX.Element {
  const query = useTaskFlowRecordsInfiniteQuery({
    taskId,
    pageSize: initialLimit,
    loadMoreSize,
  });

  const allRecords = (query.data?.pages ?? []).flatMap(
    (page) => page.flow_records,
  );

  const sorted = [...allRecords].sort(
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
        <p className="text-sm text-muted-foreground">Loading timeline…</p>
      ) : query.isError ? (
        <p className="text-sm text-muted-foreground">
          Could not load timeline.
        </p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No flow records yet.</p>
      ) : (
        <>
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
                        isMostRecent ? "bg-primary" : "bg-(--color-border)",
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
                      <FlowRecordDescription record={record} />
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

          {query.hasNextPage ? (
            <div className="flex justify-center pt-3">
              <button
                type="button"
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm disabled:opacity-50"
                data-testid="task-flow-timeline-show-more"
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? "Loading…" : "Show more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
