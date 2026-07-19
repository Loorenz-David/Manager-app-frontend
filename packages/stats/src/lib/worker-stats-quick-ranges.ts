import type { CalendarQuickRangeOption } from "@beyo/ui";

// Preset range pills shown below the calendar when picking the worker-stats
// totals window. Past/recent-oriented (stats are looked at after the fact);
// resolved to concrete { from, to } pairs by resolveQuickRangeOption.
export const WORKER_STATS_QUICK_RANGE_OPTIONS: CalendarQuickRangeOption[] = [
  { id: "yesterday", label: "Yesterday", kind: "yesterday" },
  { id: "this-week", label: "This week", kind: "this-week" },
  { id: "this-month", label: "This month", kind: "this-month" },
];
