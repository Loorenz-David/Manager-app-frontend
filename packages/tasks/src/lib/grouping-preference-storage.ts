import { z } from "zod";

export const TASKS_LIST_GROUP_BY_UPHOLSTERY_STORAGE_KEY =
  "beyo.tasksList.groupByUpholstery";

const Schema = z.object({
  enabled: z.boolean(),
  updatedAt: z.number().int(),
});

export function readTasksListGroupByUpholstery(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(
    TASKS_LIST_GROUP_BY_UPHOLSTERY_STORAGE_KEY,
  );
  if (!raw) return false;
  try {
    const parsed = Schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.enabled : false;
  } catch {
    return false;
  }
}

export function writeTasksListGroupByUpholstery(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    TASKS_LIST_GROUP_BY_UPHOLSTERY_STORAGE_KEY,
    JSON.stringify({ enabled, updatedAt: Date.now() }),
  );
}
