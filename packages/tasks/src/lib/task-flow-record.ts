import type { TaskFlowRecord } from "../types";

export function getFlowActorLabel(record: TaskFlowRecord): string {
  return record.created_by?.username ?? "System";
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
