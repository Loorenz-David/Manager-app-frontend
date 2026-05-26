import { ChevronRight } from 'lucide-react';

import { ImagePlaceholder, StatePill } from '@/components/primitives';
import type { GetTaskResult } from '@/features/tasks/api/get-task';
import {
  RETURN_SOURCE_LABEL,
  TASK_STATE_VARIANT,
  TASK_TYPE_LABEL,
  humanizeSnakeCase,
} from '@/features/tasks/lib/task-detail';

type CaseTaskInfoCardProps = {
  taskDetail: GetTaskResult;
  onOpenTask: () => void;
};

function getPrimaryReference(taskDetail: GetTaskResult): string {
  return (
    taskDetail.item?.article_number ??
    taskDetail.item?.sku ??
    'Article number missing'
  );
}

export function CaseTaskInfoCard({
  taskDetail,
  onOpenTask,
}: CaseTaskInfoCardProps): React.JSX.Element {
  const firstImage = taskDetail.item_images[0] ?? null;
  const imageUrl = firstImage?.image_url ?? null;
  const primaryReference = getPrimaryReference(taskDetail);
  const taskTypeLabel = TASK_TYPE_LABEL[taskDetail.task.task_type];
  const returnSourceLabel = taskDetail.task.return_source
    ? RETURN_SOURCE_LABEL[taskDetail.task.return_source]
    : null;
  const stateLabel = humanizeSnakeCase(taskDetail.task.state) ?? 'Unknown';

  return (
    <button
      aria-label="Open task detail"
      className="flex w-full items-stretch gap-3 rounded-[1.5rem] border border-border bg-card p-3 text-left shadow-sm transition-colors duration-150 hover:bg-muted/40"
      data-testid="case-task-info-card"
      onClick={onOpenTask}
      type="button"
    >
      <div
        className="flex aspect-square w-24 shrink-0 overflow-hidden rounded-[1.25rem] bg-muted"
        data-testid="case-task-info-image"
      >
        {imageUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            src={imageUrl}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">
              {primaryReference}
            </p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {taskTypeLabel}
              {returnSourceLabel ? ` • ${returnSourceLabel}` : ''}
            </p>
            {taskDetail.item?.article_number && taskDetail.item?.sku ? (
              <p className="mt-2 truncate text-xs text-muted-foreground">
                SKU {taskDetail.item.sku}
              </p>
            ) : null}
          </div>

          <div data-testid="case-task-info-state">
            <StatePill
              label={stateLabel}
              variant={TASK_STATE_VARIANT[taskDetail.task.state]}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Open full task details</span>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
        </div>
      </div>
    </button>
  );
}
