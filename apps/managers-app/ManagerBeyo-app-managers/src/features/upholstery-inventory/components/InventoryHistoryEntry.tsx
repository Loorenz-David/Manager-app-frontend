import { cn } from "@beyo/lib";
import { TimelineItem } from "@beyo/ui";

import type { InventoryHistoryEntryViewModel } from "../controllers/use-inventory-history-timeline.controller";
import { InventoryHistoryChildRow } from "./InventoryHistoryChildRow";
import {
  HistoryBadges,
  HistoryDeltaChips,
  HistoryTaskLabel,
} from "./InventoryHistoryParts";

type InventoryHistoryEntryProps = {
  entry: InventoryHistoryEntryViewModel;
  isNewest: boolean;
  isLastEntry: boolean;
  onOpenTask: (taskId: string) => void;
};

/**
 * One movement plus the requirement state changes it caused. The parent and
 * each child are sibling timeline items, so each can be its own button.
 */
export function InventoryHistoryEntry({
  entry,
  isNewest,
  isLastEntry,
  onOpenTask,
}: InventoryHistoryEntryProps): React.JSX.Element {
  const hasChildren = entry.children.length > 0;
  const task = entry.task;

  return (
    <>
      <TimelineItem
        data-testid="inventory-history-entry"
        emphasis={isNewest}
        isLast={isLastEntry && !hasChildren}
        spacing={hasChildren ? "tight" : "default"}
        onClick={task ? () => onOpenTask(task.taskId) : undefined}
      >
        <p
          className={cn(
            "text-sm",
            isNewest ? "text-foreground" : "text-foreground/75",
          )}
        >
          {entry.title}
        </p>
        {task ? (
          <p className="mt-0.5 text-xs text-foreground/75">
            <HistoryTaskLabel task={task} />
          </p>
        ) : null}
        {entry.requirementLabel ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Requirement {entry.requirementLabel}
          </p>
        ) : null}
        <HistoryDeltaChips chips={entry.chips} />
        <HistoryBadges badges={entry.badges} />
        {entry.detailsLabel ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {entry.detailsLabel}
          </p>
        ) : null}
        {entry.note ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{entry.note}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {entry.actorLabel} · {entry.timeLabel}
        </p>
      </TimelineItem>

      {entry.children.map((child, index) => {
        const isLastChild = index === entry.children.length - 1;

        return (
          <InventoryHistoryChildRow
            key={child.id}
            child={child}
            isLast={isLastEntry && isLastChild}
            spacing={isLastChild ? "default" : "tight"}
            onOpenTask={onOpenTask}
          />
        );
      })}
    </>
  );
}
