import { CaseTaskInfoCard } from '@/features/cases/components/CaseTaskInfoCard';
import type { GetTaskResult } from '@/features/tasks/api/get-task';
import { TASK_DETAIL_SURFACE_ID } from '@/features/tasks/surfaces';
import { useSurface } from '@/hooks/use-surface';

import { CASE_TASK_INFO_SHEET_SURFACE_ID } from '../surfaces';

type CaseTaskInfoSheetContentProps = {
  taskId: string;
  taskDetail: GetTaskResult | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => Promise<unknown>;
};

export function CaseTaskInfoSheetContent({
  taskId,
  taskDetail,
  isPending,
  isError,
  onRetry,
}: CaseTaskInfoSheetContentProps): React.JSX.Element {
  const surface = useSurface();

  if (isPending && !taskDetail) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="h-5 w-28 animate-pulse rounded-full bg-muted" />
        <div className="flex gap-3 rounded-[1.5rem] border border-border bg-card p-3">
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
        <div className="rounded-[1.5rem] border border-dashed border-border bg-card/70 px-5 py-6 text-center">
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
      <div>
        <p className="text-sm font-semibold text-foreground">Linked task</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the context here or jump into the full task detail slide.
        </p>
      </div>

      <CaseTaskInfoCard
        onOpenTask={() => {
          surface.close(CASE_TASK_INFO_SHEET_SURFACE_ID);
          surface.open(TASK_DETAIL_SURFACE_ID, { taskId });
        }}
        taskDetail={taskDetail}
      />
    </div>
  );
}
