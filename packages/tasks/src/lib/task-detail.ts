import { RotateCcw, ShoppingBag, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { daysUntil } from "@beyo/lib";
import type { Address } from "@beyo/lib";
import type { StatePillVariant } from "@beyo/ui";

import type {
  TaskFlowRecord,
  TaskPriority,
  TaskReturnSource,
  TaskState,
  TaskType,
} from "../types";
export { isoWeek } from "@beyo/lib";

export const TASK_STATE_VARIANT: Record<TaskState, StatePillVariant> = {
  pending: "neutral",
  assigned: "active",
  working: "active",
  stalled: "warning",
  ready: "success",
  resolved: "success",
  failed: "danger",
  cancelled: "neutral",
};

export const TASK_PRIORITY_VARIANT: Record<TaskPriority, StatePillVariant> = {
  low: "neutral",
  normal: "active",
  high: "warning",
  urgent: "danger",
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  return: "Return",
  pre_order: "Pre-order",
  internal: "Internal",
};

export function humanizeSnakeCase(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
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

export function formatDateTimeLocalInput(
  value: string | null | undefined,
): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const pad = (segment: number) => String(segment).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function parseLocalDateTimeInput(value: string): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function formatAddress(address: Address): string | null {
  if (!address) {
    return null;
  }

  const parts = [
    address.street,
    address.postal_code,
    address.city,
    address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function getTaskTitle(task: {
  title: string | null;
  summary: string | null;
}): string {
  return task.title ?? task.summary ?? "Task";
}

export function getFlowActorLabel(record: TaskFlowRecord): string {
  return record.created_by?.username ?? "System";
}

export const TASK_TYPE_ICON: Record<TaskType, LucideIcon> = {
  return: RotateCcw,
  pre_order: ShoppingBag,
  internal: Wrench,
};

export const RETURN_SOURCE_LABEL: Record<TaskReturnSource, string> = {
  after_purchase: "After purchase",
  before_purchase: "Before purchase",
  store_return: "Store return",
};

function parseTaskDate(value: string): Date | null {
  const parsedDirect = new Date(value);
  if (!Number.isNaN(parsedDirect.getTime())) {
    return parsedDirect;
  }

  const parsedDateOnly = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsedDateOnly.getTime()) ? null : parsedDateOnly;
}

export function formatLocalDateISO(dateString: string | null): string | null {
  if (!dateString) {
    return null;
  }

  const date = parseTaskDate(dateString);
  if (!date) {
    return null;
  }

  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatLocalDateYYMMDD(dateString: string | null): string | null {
  const isoDate = formatLocalDateISO(dateString);
  if (!isoDate) {
    return null;
  }

  return isoDate.slice(2);
}

export function formatDateDDMMYY(dateString: string | null): string | null {
  return formatLocalDateYYMMDD(dateString);
}

export { daysUntil };
