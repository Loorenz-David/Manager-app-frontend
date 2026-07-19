import { formatDateDisplay, serializeDateToISO } from "@beyo/ui";

import type { WorkerStatsDateRange } from "../types";

export function todayISO(): string {
  return serializeDateToISO(new Date());
}

export function todayRange(): WorkerStatsDateRange {
  const today = todayISO();
  return { from: today, to: today };
}

export function dateRangeLabel(date: string, today: string): string {
  return date === today ? "Today" : (formatDateDisplay(date) ?? date);
}
