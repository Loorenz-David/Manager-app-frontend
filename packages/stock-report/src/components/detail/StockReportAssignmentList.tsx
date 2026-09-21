import { TaskListCard } from "@beyo/tasks";

import type { StockReportAssignmentCardData } from "../../stock-report.types";

export type StockReportAssignmentListProps = {
  assignments: readonly StockReportAssignmentCardData[];
  /** Opens the task detail. Omitted for a role that has no task page yet. */
  onTapCard?: (taskId: string) => void;
  onTapImage?: (taskId: string) => void;
  /**
   * This page's own ⋮ menu — not the task page's (intention §6.2, card 5).
   * Omitted for a role that cannot remove, which is how sellers see no ⋮.
   */
  onTapActions?: (taskId: string, itemId: string | null) => void;
};

/**
 * The assignments, rendered with `TaskListCard` from `@beyo/tasks` exactly as
 * it is. The card brings its own 16 px side inset (`mx-4`), which is this
 * page's gutter, so the list adds no horizontal padding of its own.
 */
export function StockReportAssignmentList({
  assignments,
  onTapCard,
  onTapImage,
  onTapActions,
}: StockReportAssignmentListProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-2.5"
      data-testid="stock-report-assignment-list"
    >
      {assignments.map((assignment) => (
        <TaskListCard
          key={assignment.taskId}
          imageUrl={assignment.imageUrl}
          item={assignment.item}
          statePill={assignment.statePill}
          task={assignment.task}
          taskId={assignment.taskId}
          onTapActions={onTapActions}
          onTapCard={onTapCard}
          onTapImage={onTapImage}
        />
      ))}
    </div>
  );
}
