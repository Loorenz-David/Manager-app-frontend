import { CaseTaskInfoCard } from "@/components/cases/CaseTaskInfoCard";
import { useGetTaskQuery } from "@/features/tasks/api/use-get-task-query";
import { TASK_DETAIL_SURFACE_ID } from "@/features/tasks/surfaces";
import { useSurface } from "@/hooks/use-surface";
import { useSurfaceHeader } from "@/hooks/use-surface-header";

type CaseTaskInfoSheetContentProps = {
  taskId: string;
};

export function CaseTaskInfoSheetContent({
  taskId,
}: CaseTaskInfoSheetContentProps): React.JSX.Element {
  const surface = useSurface();
  const header = useSurfaceHeader();
  const taskQuery = useGetTaskQuery(taskId);
  const taskDetail = taskQuery.data;
  const isPending = taskQuery.isPending;
  const isError = taskQuery.isError;
  const onRetry = taskQuery.refetch;

  if (isPending && !taskDetail) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="h-5 w-28 animate-pulse rounded-full bg-muted" />
        <div className="flex gap-3 rounded-3xl border border-border bg-card p-3">
          <div className="aspect-square w-24 animate-pulse rounded-[1.25rem] bg-muted" />
          <div className="flex flex-1 flex-col gap-3 py-1">
            <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
            <div className="mt-auto h-4 w-28 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !taskDetail) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-3xl border border-dashed border-border bg-card/70 px-5 py-6 text-center">
          <p className="text-sm font-medium text-foreground">
            Task info could not be loaded.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Retry the lookup before opening the full task detail.
          </p>
        </div>
        <button
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
          onClick={() => {
            void onRetry();
          }}
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <CaseTaskInfoCard
        onOpenTask={() => {
          surface.open(TASK_DETAIL_SURFACE_ID, { taskId });
          header?.requestClose();
        }}
        taskDetail={taskDetail}
      />
    </div>
  );
}
