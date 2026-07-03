import type { TaskListItemRaw } from "../types";

export type PostHandlingRequirementKey =
  | "fulfillment_method"
  | "schedule"
  | "assortment";

export type PostHandlingRequirement = {
  key: PostHandlingRequirementKey;
  label: string;
};

type PostHandlingTaskFields = Pick<
  TaskListItemRaw["task"],
  | "task_type"
  | "fulfillment_method"
  | "scheduled_start_at"
  | "scheduled_end_at"
  | "assortment"
>;

function hasValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function getPostHandlingMissingRequirements(
  task: PostHandlingTaskFields,
): PostHandlingRequirement[] {
  if (task.task_type === "pre_order") {
    const missing: PostHandlingRequirement[] = [];

    if (!hasValue(task.fulfillment_method)) {
      missing.push({
        key: "fulfillment_method",
        label: "Fulfillment method",
      });
    }

    if (!hasValue(task.scheduled_start_at) && !hasValue(task.scheduled_end_at)) {
      missing.push({
        key: "schedule",
        label: "Delivery date (start or end)",
      });
    }

    return missing;
  }

  if (task.task_type === "return") {
    return hasValue(task.assortment)
      ? []
      : [{ key: "assortment", label: "Assortment" }];
  }

  return [];
}
