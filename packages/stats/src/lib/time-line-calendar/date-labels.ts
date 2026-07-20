import { parseLocalDateKey } from "./local-date";

const SINGLE_DAY_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const DAY_MONTH_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

// Header date-pill label. Mockup examples: "Sun 19 Jul", "19–21 Jul",
// cross-month "30 Jul–1 Aug".
export function formatTimelineDateLabel(visibleDates: string[]): string {
  const first = parseLocalDateKey(visibleDates[0]);
  const last = parseLocalDateKey(visibleDates[visibleDates.length - 1]);

  if (visibleDates.length === 1) {
    return SINGLE_DAY_FORMAT.format(first);
  }

  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${DAY_MONTH_FORMAT.format(last)}`;
  }

  return `${DAY_MONTH_FORMAT.format(first)}–${DAY_MONTH_FORMAT.format(last)}`;
}
