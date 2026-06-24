import type { CalendarQuickSelectOption } from "@beyo/ui";

export const TASK_READY_BY_QUICK_SELECT_OPTIONS: CalendarQuickSelectOption[] = [
  {
    id: "tomorrow",
    label: "Tomorrow",
    amount: 1,
    unit: "day",
  },
  {
    id: "one-week",
    label: "1 week",
    amount: 1,
    unit: "week",
  },
  {
    id: "one-month",
    label: "1 month",
    amount: 1,
    unit: "month",
  },
];
