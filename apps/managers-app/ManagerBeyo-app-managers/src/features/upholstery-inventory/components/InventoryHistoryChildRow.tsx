import { TimelineItem, type TimelineItemSpacing } from "@beyo/ui";

import type { HistoryRecordDescription } from "../lib/inventory-history";
import {
  HistoryBadges,
  HistoryDeltaChips,
  HistoryTaskLabel,
} from "./InventoryHistoryParts";

type InventoryHistoryChildRowProps = {
  child: HistoryRecordDescription;
  isLast: boolean;
  spacing: TimelineItemSpacing;
  onOpenTask: (taskId: string) => void;
};

/** A requirement state change nested under the movement that caused it. */
export function InventoryHistoryChildRow({
  child,
  isLast,
  spacing,
  onOpenTask,
}: InventoryHistoryChildRowProps): React.JSX.Element {
  const task = child.task;

  return (
    <TimelineItem
      nested
      data-testid="inventory-history-child"
      isLast={isLast}
      spacing={spacing}
      onClick={task ? () => onOpenTask(task.taskId) : undefined}
    >
      <p className="text-sm text-foreground/75">
        {task ? <HistoryTaskLabel task={task} /> : "Requirement"}{" "}
        <span className="text-muted-foreground">{child.title}</span>
      </p>
      <HistoryDeltaChips chips={child.chips} />
      <HistoryBadges badges={child.badges} />
      {child.note ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{child.note}</p>
      ) : null}
    </TimelineItem>
  );
}
