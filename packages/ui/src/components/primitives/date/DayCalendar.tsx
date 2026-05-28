import { DayPicker, type ClassNames, type DateRange, type Matcher } from 'react-day-picker';

type DayCalendarProps = {
  mode: 'single' | 'range';
  selected: Date | DateRange | undefined;
  onSelect:
    | ((date: Date | undefined) => void)
    | ((range: DateRange | undefined) => void);
  onDayClick?: (date: Date) => void;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  disabled?: Matcher | Matcher[];
};

const DAY_CALENDAR_CLASS_NAMES = {
  root: 'relative w-full px-4 pb-4',
  months: 'flex flex-col',
  month: 'grid gap-4',
  month_caption: 'flex h-12 items-center justify-center',
  caption_label: 'text-2xl font-semibold text-foreground',
  nav: 'absolute inset-x-5 top-0 z-10 flex h-12 items-center justify-between',
  button_previous:
    'flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-95',
  button_next:
    'flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-95',
  chevron: 'h-5 w-5 stroke-[2.5]',
  month_grid: 'col-start-1 row-start-2 w-full border-collapse',
  weekdays: 'grid grid-cols-7 mb-1',
  weekday:
    'flex h-9 items-center justify-center text-xs font-medium text-muted-foreground',
  weeks: 'space-y-1',
  week: 'grid grid-cols-7',
  day: 'flex h-11 w-full items-center justify-center',
  day_button:
    'h-10 w-10 rounded-full text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
  selected:
    '[&>button]:bg-foreground [&>button]:text-background [&>button]:hover:bg-foreground',
  today:
    '[&>button]:font-semibold [&>button]:ring-1 [&>button]:ring-primary/40 [&>button:not([aria-selected=true])]:bg-primary/10 [&>button:not([aria-selected=true])]:text-primary',
  outside: 'text-muted-foreground opacity-40',
  disabled: 'pointer-events-none text-muted-foreground opacity-30',
  range_start:
    '[&>button]:bg-foreground [&>button]:text-background [&>button]:hover:bg-foreground',
  range_end:
    '[&>button]:bg-foreground [&>button]:text-background [&>button]:hover:bg-foreground',
  range_middle:
    '[&>button]:bg-muted [&>button]:text-foreground [&>button]:hover:bg-muted',
  hidden: 'invisible',
} satisfies Partial<ClassNames>;

export function DayCalendar({
  mode,
  selected,
  onSelect,
  onDayClick,
  month,
  onMonthChange,
  disabled,
}: DayCalendarProps) {
  const sharedProps = {
    month,
    onMonthChange,
    disabled,
    classNames: DAY_CALENDAR_CLASS_NAMES,
    showOutsideDays: true,
    timeZone: 'UTC',
  } as const;

  if (mode === 'single') {
    return (
      <DayPicker
        mode="single"
        selected={selected as Date | undefined}
        onSelect={onSelect as (date: Date | undefined) => void}
        onDayClick={(date) => onDayClick?.(date)}
        {...sharedProps}
      />
    );
  }

  return (
    <DayPicker
      mode="range"
      selected={selected as DateRange | undefined}
      onSelect={onSelect as (range: DateRange | undefined) => void}
      onDayClick={(date) => onDayClick?.(date)}
      {...sharedProps}
    />
  );
}
