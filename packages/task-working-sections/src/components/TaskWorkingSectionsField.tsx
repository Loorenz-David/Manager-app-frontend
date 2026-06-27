import { ChevronRight } from "lucide-react";

import { EyebrowLabel, InfoPill } from "@beyo/ui";
import { useTaskWorkingSectionsCountsFlow } from "../flows/use-task-working-sections-counts.flow";

type TaskWorkingSectionsFieldProps = {
  onOpenWorkingSections: () => void;
  taskId: string;
};

export function TaskWorkingSectionsField({
  onOpenWorkingSections,
  taskId,
}: TaskWorkingSectionsFieldProps): React.JSX.Element {
  const { assignedCount, completedCount } =
    useTaskWorkingSectionsCountsFlow(taskId);

  return (
    <button
      type="button"
      className="flex w-full flex-col gap-1.5 px-4 py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      data-testid="task-working-sections-field"
      onClick={onOpenWorkingSections}
    >
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
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-[color:var(--color-icon)] stroke-[2.5]"
        />
      </div>
    </button>
  );
}
