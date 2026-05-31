import { RotateCcw, ShoppingBag, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TaskSnapshot } from "../types";

export type TaskType = TaskSnapshot["task_type"];

const TASK_TYPE_ICON: Record<TaskType, LucideIcon> = {
  return: RotateCcw,
  pre_order: ShoppingBag,
  internal: Wrench,
};

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  return: "Return",
  pre_order: "Pre-order",
  internal: "Internal",
};

export function getTaskTypeIcon(taskType: TaskType): LucideIcon {
  return TASK_TYPE_ICON[taskType];
}

export function getTaskTypeLabel(taskType: TaskType): string {
  return TASK_TYPE_LABEL[taskType];
}
