import { RotateCcw, ShoppingBag, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { StatePillVariant } from '@/components/primitives';
import type {
  TaskFlowRecord,
  TaskPriority,
  TaskReturnSource,
  TaskState,
  TaskType,
} from '@/features/tasks/types';
import type { Address } from '@/types/common';

export const TASK_STATE_VARIANT: Record<TaskState, StatePillVariant> = {
  pending: 'neutral',
  assigned: 'active',
  working: 'active',
  stalled: 'warning',
  ready: 'success',
  resolved: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

export const TASK_PRIORITY_VARIANT: Record<TaskPriority, StatePillVariant> = {
  low: 'neutral',
  normal: 'active',
  high: 'warning',
  urgent: 'danger',
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  return: 'Return',
  pre_order: 'Pre-order',
  internal: 'Internal',
};

export function humanizeSnakeCase(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Not set';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatDateTimeLocalInput(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const pad = (segment: number) => String(segment).padStart(2, '0');
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

  const parts = [address.street, address.postal_code, address.city, address.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function getTaskTitle(task: { title: string | null; summary: string | null }): string {
  return task.title ?? task.summary ?? 'Task';
}

export function getFlowActorLabel(record: TaskFlowRecord): string {
  return record.created_by?.username ?? 'System';
}

export const TASK_TYPE_ICON: Record<TaskType, LucideIcon> = {
  return: RotateCcw,
  pre_order: ShoppingBag,
  internal: Wrench,
};

export const RETURN_SOURCE_LABEL: Record<TaskReturnSource, string> = {
  after_purchase: 'After purchase',
  before_purchase: 'Before purchase',
  store_return: 'Store return',
};

export function formatDateDDMMYY(dateString: string | null): string | null {
  if (!dateString) {
    return null;
  }

  const parsedDirect = new Date(dateString);
  const date = Number.isNaN(parsedDirect.getTime())
    ? new Date(`${dateString}T00:00:00Z`)
    : parsedDirect;

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export function daysUntil(dateString: string | null): number | null {
  if (!dateString) {
    return null;
  }

  const parsedDirect = new Date(dateString);
  const target = Number.isNaN(parsedDirect.getTime())
    ? new Date(`${dateString}T00:00:00Z`)
    : parsedDirect;

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const now = new Date();
  const todayUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((target.getTime() - todayUtcMs) / (1000 * 60 * 60 * 24));
}

export function isoWeek(dateString: string | null): number | null {
  if (!dateString) {
    return null;
  }

  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) {
    return null;
  }

  const dayOfWeek = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayOfWeek + 3);
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const dayOfYear = (d.getTime() - jan4.getTime()) / 86400000;
  return 1 + Math.round((dayOfYear - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}
