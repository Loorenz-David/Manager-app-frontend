import { ChevronRight } from "lucide-react";

import { EyebrowLabel, InfoPill } from "@beyo/ui";
import { useTaskWorkingSectionsCountsFlow } from "../flows/use-task-working-sections-counts.flow";
import { formatWorkingDuration } from "../lib/format-working-duration";

type TaskWorkingSectionsFieldProps = {
  /** Omitted for a read-only role: the counts render without a chevron or tap. */
  onOpenWorkingSections?: () => void;
  taskId: string;
};

export function TaskWorkingSectionsField({
  onOpenWorkingSections,
  taskId,
}: TaskWorkingSectionsFieldProps): React.JSX.Element {
  const { assignedCount, completedCount, totalWorkingSeconds } =
    useTaskWorkingSectionsCountsFlow(taskId);

  const content = (
    <>
      <EyebrowLabel>Stages</EyebrowLabel>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-1 flex-wrap gap-2">
          <InfoPill
            className="py-1 text-xs"
            data-testid="working-sections-assigned-count"
          >
            {assignedCount} assigned
          </InfoPill>
          <InfoPill
            className="py-1 text-xs"
            data-testid="working-sections-completed-count"
          >
            {completedCount} completed
          </InfoPill>
          <InfoPill
            className="py-1 text-xs"
            data-testid="working-sections-working-time"
          >
            {formatWorkingDuration(totalWorkingSeconds)}
          </InfoPill>
        </div>
        {onOpenWorkingSections ? (
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-[color:var(--color-icon)] stroke-[2.5]"
          />
        ) : null}
      </div>
    </>
  );

  if (!onOpenWorkingSections) {
    return (
      <div
        className="flex w-full flex-col gap-1.5 px-4 py-4 text-left"
        data-testid="task-working-sections-field"
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex w-full flex-col gap-1.5 px-4 py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      data-testid="task-working-sections-field"
      onClick={onOpenWorkingSections}
    >
      {content}
    </button>
  );
}
