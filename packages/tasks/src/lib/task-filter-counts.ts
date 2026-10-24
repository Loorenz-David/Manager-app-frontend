import type { TaskTypeFilter } from "../types";

export function countTaskSheetFilters({
  taskType,
  itemPosition,
  groupByUpholstery,
  showDeleted = false,
}: {
  taskType: TaskTypeFilter;
  itemPosition: string;
  groupByUpholstery: boolean;
  showDeleted?: boolean;
}): { task: number; other: number; total: number } {
  const task = taskType === "all" ? 0 : 1;
  const other =
    Number(Boolean(itemPosition.trim())) +
    Number(groupByUpholstery) +
    Number(showDeleted);
  return { task, other, total: task + other };
}
