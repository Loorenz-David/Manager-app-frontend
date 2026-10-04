import type { TaskTypeFilter } from "../types";

export function countTaskSheetFilters({
  taskType,
  itemPosition,
  groupByUpholstery,
}: {
  taskType: TaskTypeFilter;
  itemPosition: string;
  groupByUpholstery: boolean;
}): { task: number; other: number; total: number } {
  const task = taskType === "all" ? 0 : 1;
  const other = Number(Boolean(itemPosition.trim())) + Number(groupByUpholstery);
  return { task, other, total: task + other };
}
