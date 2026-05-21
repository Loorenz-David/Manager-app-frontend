# PLAN_date_field_calendar_system_20260520

## Metadata

- Plan ID: `PLAN_date_field_calendar_system_20260520`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-20T00:00:00Z`
- Last updated at (UTC): `2026-05-20T18:07:33Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/primitives.md` (date section)

## Goal and intent

- Goal: Build a mobile-first date selection system using React DayPicker v10 inside the existing bottom-sheet (Vaul) surface architecture. Deliver two primitive display components (`DateFieldTrigger`, `DateRangeFieldTrigger`), two calendar surface pages, a styled `DayCalendar` wrapper, a registration in the surface registry, and two RHF-aware field components in the tasks feature (`TaskReadyByDateField`, `TaskDeliveryDateField`).
- Business/user intent: Date fields appear on task creation and editing surfaces. The UX must feel native-mobile — tapping a date field opens a bottom sheet calendar, never a browser popup. Partial date ranges (only FROM or only TO set) must be preserved, as delivery windows can be open-ended.
- Non-goals: Time-of-day selection (deferred). Recurring schedules (deferred). Date pickers inside popovers or inline (explicitly excluded by intention). Datetime pickers (deferred). Real backend integration for the tasks feature (stub shape is acceptable — the field architecture is the deliverable).

## Scope

- In scope:
  - `src/components/primitives/date/` — four primitive components + surface registration file + public index
  - `src/pages/calendar/` — two surface pages (`CalendarSinglePickerPage`, `CalendarRangePickerPage`)
  - `src/app/surface-registry.ts` — registration of the two calendar surfaces
  - `src/features/tasks/components/fields/TaskReadyByDateField.tsx`
  - `src/features/tasks/components/fields/TaskDeliveryDateField.tsx`
  - `src/features/tasks/types.ts` — add date field schemas (`ready_by_at`, `scheduled_start_at`, `scheduled_end_at`) if not already present
- Out of scope:
  - Task feature CRUD (API, actions, controllers, providers) — already has a scaffold; date types are the only addition here
  - DayPicker CSS module overrides — use the `classNames` prop API only
  - Service Workers, background sync
  - Time selection, datetime pickers
  - Multi-month views, availability calendars
- Assumptions:
  - `react-day-picker@^10.0.1` is already installed (confirmed in package.json)
  - `vaul` is installed and `BottomSheetSurface` is functional (confirmed from codebase)
  - Input primitives plan (`PLAN_input_primitives_20260520`) is implemented — `--color-primary`, `--color-border` tokens are in `index.css`
  - `class-variance-authority` is installed
  - Surface system is operational (test surfaces already registered and working)

## Clarifications required

- ~~**`ready_by_at` stored as date-only or datetime?**~~ ✓ Resolved: frontend sends **date-only strings** (`"2026-05-20"`). The backend resolves timezone. Frontend reads and displays date only.
- ~~**Timezone for date display**~~ ✓ Resolved: display as date only (`"May 20, 2026"`). Use `{ timeZone: 'UTC' }` in `Intl.DateTimeFormat` so `"2026-05-20"` (parsed as UTC midnight) always renders as May 20 regardless of the user's local offset.

## Acceptance criteria

1. `npm run typecheck` passes with zero errors
2. Tapping `TaskReadyByDateField` opens a bottom sheet calendar; selecting a date closes it and the field shows the formatted date
3. Tapping `TaskDeliveryDateField` opens a range calendar; selecting FROM auto-advances to TO; selecting TO closes the sheet; both fields update in RHF
4. Swiping down on either calendar sheet closes it without errors; any partial range selection made before the swipe is preserved in the RHF field value
5. `DateFieldTrigger` and `DateRangeFieldTrigger` render in a `FormProvider` without RHF context errors (they are RHF-agnostic primitives — only the task field components use `useController`)
6. No `type="date"` input elements exist anywhere in the implementation
7. `CalendarSinglePickerPage` and `CalendarRangePickerPage` are lazy-loaded (confirmed by checking they are imported only via `lazy()`)

---

## Contracts and skills

### Contracts loaded

Core always-include:
- `architecture/01_architecture.md`: dependency rules — primitives in `components/`, feature fields in `features/<f>/components/fields/`
- `architecture/07_components.md`: named exports, `forwardRef` where needed, `cva`, `cn()`, no nested component definitions
- `architecture/14_styling.md`: Tailwind-only, `cva`, `cn()`, design tokens — DayPicker styled via `classNames` prop (Tailwind classes only, no CSS files)
- `architecture/09_forms.md`: `FormProvider`, `useFormContext`, `useController` — controlled bridge strategy for non-native inputs

Surface + animation bundle:
- `architecture/28_surfaces.md`: surface registry pattern, `SurfaceRegistrations`, `SurfacePropsContext`, no-path surfaces are ephemeral
- `architecture/28_surfaces_local.md`: `sheet` is the correct type (not `drawer`); `BottomSheetSurface` uses Vaul; `requestClose()` triggers 350ms delayed close
- `architecture/33_vaul_drawer.md`: never import Vaul outside `BottomSheetSurface`; no Framer Motion for drawer animation; focus trapping rules; scroll lock
- `architecture/31_animations.md`: CSS handles micro-transitions; Framer Motion handles structural movement; button press micro-interactions may use CSS

### Local extensions loaded

- `architecture/01_architecture_local.md`: `route-entry.tsx` applies only to primary tab routes — not applicable here
- `architecture/28_surfaces_local.md`: **critical** — confirms `sheet` is the correct surface type, `drawer` is excluded

### File read intent — pattern vs. relational

Permitted relational reads:
- `src/components/surfaces/BottomSheetSurface.tsx` — to understand `SurfaceHeaderContext` value shape and `requestClose` wiring (existing behavior)
- `src/providers/SurfaceProvider.tsx` — to read `SurfacePropsContext` type and `useSurfaceStore.open()` signature (existing behavior)
- `src/app/surface-registry.ts` — to see existing registration pattern before adding calendar surfaces (existing behavior)
- `src/features/test_feature/surfaces.ts` — to see a working surface registration example (existing behavior)
- `src/features/tasks/types.ts` — to see what task types already exist before adding date fields (existing behavior)
- `src/lib/animation.ts` — to read available transition tokens for the selection tab animation (existing behavior)

Prohibited pattern reads:
- Other field components to understand `useController` usage → `09_forms.md`
- Other surface pages to understand `SurfacePropsContext` cast pattern → `28_surfaces.md` + this plan

---

## Architecture: the RHF controlled bridge

Date fields are controlled interactions — the user does not type into an `<input>`, they tap and select from a calendar. React Hook Form's `register()` is for native HTML inputs where the browser provides the value. For custom controlled inputs, use `useController()`:

```tsx
// Field component (inside FormProvider tree)
const { field, fieldState } = useController({
  name: 'ready_by_at',
  control: useFormContext().control,
});
// field.value  → current ISO string or null
// field.onChange → update RHF field
// field.onBlur  → mark field as touched
// fieldState.error → validation error
```

When the user taps the field trigger:
```ts
useSurfaceStore.getState().open('calendar-single-picker', {
  currentValue: field.value ?? null,
  onSelect: (isoString: string | null) => field.onChange(isoString),
});
```

The `onSelect` callback is a closure over `field.onChange`. Since the form component is still mounted (behind the open sheet), the closure remains valid. The sheet surface reads this callback from `SurfacePropsContext` and calls it when a date is selected.

**Why `useController` and not `register`:**
- `register` returns a ref and event handlers designed for native `<input>` elements
- Custom display components (buttons that show a formatted date) need a controlled value to display the current selection
- `useController` gives access to `field.value` for rendering the formatted date, `field.onChange` for updating, and `fieldState.error` for validation display

---

## Architecture: incremental range commit

The range picker must support partial ranges. If the user selects only FROM and then swipes the sheet closed, that partial range must be preserved — Vaul's gesture close bypasses any cleanup logic in the surface page.

To handle this without relying on a cleanup callback, the range picker **commits immediately on each selection**:

1. User selects FROM date → `onFromSelect(isoString)` fires immediately → `scheduled_start_at` is updated in RHF
2. Active target switches to TO automatically
3. User selects TO date → `onToSelect(isoString)` fires immediately → `scheduled_end_at` is updated in RHF → `requestClose()` fires
4. If user swipes down after selecting only FROM → `scheduled_start_at` is already committed; `scheduled_end_at` retains its previous value (which could be null)

This means the surface props for the range picker use **two separate callbacks**:
```ts
type CalendarRangePickerSurfaceProps = {
  currentFrom: string | null;
  currentTo: string | null;
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
};
```

---

## Architecture: date representation

| Context | Format | Example |
|---|---|---|
| RHF field value | Date-only string | `"2026-05-20"` |
| Backend transport | Date-only string | `"2026-05-20"` |
| DayPicker internal | `Date` object (UTC midnight) | `new Date("2026-05-20")` |
| Display in field trigger | `Intl.DateTimeFormat` with `timeZone: 'UTC'` | `"May 20, 2026"` |
| Zod schema | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` | validates date-only string |

The frontend never sends times or timezone offsets. The backend owns timezone resolution for `ready_by_at`, `scheduled_start_at`, and `scheduled_end_at`.

**Why `timeZone: 'UTC'` in display**: `new Date("2026-05-20")` is parsed as UTC midnight by the spec. Without `timeZone: 'UTC'` in `Intl.DateTimeFormat`, a user in UTC-5 would see `May 19` — one day off. Locking the formatter to UTC ensures the displayed date always matches the stored string.

**Conversion functions** (live in `src/components/primitives/date/date-utils.ts`):

```ts
// Parse a "YYYY-MM-DD" string to a Date for DayPicker.
// Returns undefined if null, empty, or not a valid date-only string.
export function parseISOToDate(dateString: string | null | undefined): Date | undefined {
  if (!dateString) return undefined;
  // "YYYY-MM-DD" is parsed as UTC midnight by the spec — correct for date-only values.
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? undefined : d;
}

// Serialize a DayPicker Date selection to a "YYYY-MM-DD" string.
// Uses UTC components to avoid the local-offset day-shift problem.
export function serializeDateToISO(date: Date): string {
  const year  = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day   = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format a "YYYY-MM-DD" string for display.
// Uses timeZone: 'UTC' so "2026-05-20" always renders as "May 20" regardless of local offset.
export function formatDateDisplay(dateString: string | null | undefined): string | undefined {
  if (!dateString) return undefined;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
```

---

## Implementation plan

---

### Step 1 — `src/components/primitives/date/date-utils.ts`

Create the three utility functions defined in the Architecture: date representation section above (`parseISOToDate`, `serializeDateToISO`, `formatDateDisplay`). No dependencies on RHF or the surface system.

---

### Step 2 — `src/components/primitives/date/DayCalendar.tsx`

A styled wrapper around React DayPicker v10 that applies the app's design tokens and mobile-first sizing. This component is domain-agnostic — it does not know about single vs range selection or RHF.

#### Purpose

Centralise all DayPicker styling in one place. All calendar surfaces import this component. If the DayPicker API changes or the visual style is updated, only this file changes.

#### Props

```ts
type DayCalendarProps = {
  mode: 'single' | 'range';
  selected: Date | { from: Date | undefined; to: Date | undefined } | undefined;
  onSelect: ((date: Date | undefined) => void) | ((range: { from: Date | undefined; to: Date | undefined } | undefined) => void);
  month?: Date;
  onMonthChange?: (month: Date) => void;
  disabled?: Matcher | Matcher[];
};
```

Because `DayPicker` has complex overloaded types for single vs range mode, the simplest implementation is to render a single-mode `<DayPicker>` or range-mode `<DayPicker>` based on `mode`. Use a type-narrowed branch:

```tsx
export function DayCalendar({ mode, selected, onSelect, month, onMonthChange, disabled }: DayCalendarProps) {
  const sharedProps = {
    month,
    onMonthChange,
    disabled,
    classNames: DAY_CALENDAR_CLASS_NAMES,
    showOutsideDays: true,
  };
  if (mode === 'single') {
    return (
      <DayPicker
        mode="single"
        selected={selected as Date | undefined}
        onSelect={onSelect as (date: Date | undefined) => void}
        {...sharedProps}
      />
    );
  }
  return (
    <DayPicker
      mode="range"
      selected={selected as { from: Date | undefined; to: Date | undefined } | undefined}
      onSelect={onSelect as (range: { from: Date | undefined; to: Date | undefined } | undefined) => void}
      {...sharedProps}
    />
  );
}
```

#### `DAY_CALENDAR_CLASS_NAMES` — Tailwind classNames for DayPicker v10

```ts
const DAY_CALENDAR_CLASS_NAMES = {
  root: 'w-full px-4 pb-4',
  months: 'flex flex-col',
  month: 'space-y-3',
  month_caption: 'flex justify-center items-center relative h-10',
  caption_label: 'text-sm font-semibold text-foreground',
  nav: 'flex items-center gap-1',
  button_previous: 'absolute left-4 h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-transform text-foreground',
  button_next: 'absolute right-4 h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-transform text-foreground',
  weeks: 'w-full',
  weekdays: 'grid grid-cols-7 mb-1',
  weekday: 'h-9 flex items-center justify-center text-xs font-medium text-muted-foreground',
  week: 'grid grid-cols-7',
  // Day cell — minimum 44px touch target
  day: 'h-11 w-full flex items-center justify-center',
  // Day button — the interactive element
  day_button: 'h-10 w-10 rounded-full text-sm font-medium transition-colors active:scale-95 text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
  selected: 'bg-primary text-white rounded-full hover:bg-primary',
  today: 'font-bold text-primary',
  outside: 'text-muted-foreground opacity-40',
  disabled: 'text-muted-foreground opacity-30 pointer-events-none',
  range_start: 'bg-primary text-white rounded-full',
  range_end: 'bg-primary text-white rounded-full',
  range_middle: 'bg-primary/10 text-foreground rounded-none',
  hidden: 'invisible',
};
```

**Mobile sizing notes:**
- `h-11` on the day cell = 44px — meets the Apple HIG minimum touch target
- `active:scale-95` on the day button — provides tactile press feedback without Framer Motion
- `h-10 w-10 rounded-full` on the day button — circular hit area that is visually distinct

**Note for Codex on DayPicker v10 classNames keys**: The exact key names in v10 differ from v8/v9. If the `classNames` prop produces TypeScript errors, refer to the `ClassNames` type exported from `react-day-picker` to find the correct keys. The intent above is correct; the exact key strings may need adjustment per the installed version.

---

### Step 3 — `src/components/primitives/date/DateRangeSelectionTabs.tsx`

The FROM / TO selection tabs shown at the top of the range calendar sheet. This is a pure display + interaction primitive — no state of its own, no RHF.

#### Props

```ts
type DateRangeSelectionTabsProps = {
  fromLabel: string | undefined;     // formatted date string or undefined
  toLabel: string | undefined;       // formatted date string or undefined
  activeTarget: 'from' | 'to';
  onFromPress: () => void;           // user taps FROM → caller sets activeTarget
  onToPress: () => void;             // user taps TO → caller sets activeTarget
  fromPlaceholder?: string;          // defaults to "Select start"
  toPlaceholder?: string;            // defaults to "Select end"
};
```

#### Layout and UX

```
┌────────────────────────────────────────────┐
│  FROM               TO                     │
│  ──────────         ──────────             │
│  May 20, 2026       Select end             │
│  [active underline]                        │
└────────────────────────────────────────────┘
```

Two equal-width buttons side by side. The active target shows an underline indicator (CSS transition, not Framer Motion). Each button is a `<button type="button">` to avoid submitting any parent form.

```tsx
export function DateRangeSelectionTabs({ fromLabel, toLabel, activeTarget, onFromPress, onToPress, fromPlaceholder = 'Select start', toPlaceholder = 'Select end' }: DateRangeSelectionTabsProps) {
  return (
    <div className="grid grid-cols-2 border-b">
      <button
        type="button"
        onClick={onFromPress}
        className="relative px-4 py-3 text-left"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From</p>
        <p className={cn('mt-0.5 text-sm font-medium', fromLabel ? 'text-foreground' : 'text-muted-foreground')}>
          {fromLabel ?? fromPlaceholder}
        </p>
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-opacity duration-150',
            activeTarget === 'from' ? 'opacity-100' : 'opacity-0',
          )}
        />
      </button>
      <button
        type="button"
        onClick={onToPress}
        className="relative border-l px-4 py-3 text-left"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To</p>
        <p className={cn('mt-0.5 text-sm font-medium', toLabel ? 'text-foreground' : 'text-muted-foreground')}>
          {toLabel ?? toPlaceholder}
        </p>
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5 bg-primary transition-opacity duration-150',
            activeTarget === 'to' ? 'opacity-100' : 'opacity-0',
          )}
        />
      </button>
    </div>
  );
}
```

---

### Step 4 — `src/components/primitives/date/DateFieldTrigger.tsx`

The tappable field display for a single date. Looks like a form input (matches `TextInput` visual style) but is a `<button>` — never an `<input>`.

#### Props

```ts
type DateFieldTriggerProps = {
  value: string | undefined;         // formatted date string for display (already formatted by caller)
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  onPress: () => void;
  id?: string;
  className?: string;
};
```

#### CVA variant

```ts
const triggerVariants = cva(
  [
    'flex h-12 w-full items-center justify-between rounded-lg border bg-input px-3',
    'text-sm transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.99]',  // subtle press feedback
  ].join(' '),
  {
    variants: {
      invalid: {
        true: 'border-destructive ring-2 ring-destructive',
        false: 'border-border',
      },
    },
    defaultVariants: { invalid: false },
  },
);
```

#### Implementation

```tsx
export function DateFieldTrigger({ value, placeholder = 'Select date', invalid = false, disabled, onPress, id, className }: DateFieldTriggerProps) {
  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      onClick={onPress}
      aria-invalid={invalid || undefined}
      aria-haspopup="dialog"
      className={cn(triggerVariants({ invalid }), className)}
    >
      <span className={cn('flex-1 text-left', value ? 'text-foreground' : 'text-muted-foreground')}>
        {value ?? placeholder}
      </span>
      <CalendarIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
```

**`aria-haspopup="dialog"`**: Indicates to screen readers that activating this button opens a dialog (the calendar sheet). Screen readers announce this so keyboard users know what to expect.

Use the `Calendar` icon from `lucide-react` (already installed — used elsewhere in the app). Import as `CalendarIcon` to avoid confusion with DayPicker's internal component.

---

### Step 5 — `src/components/primitives/date/DateRangeFieldTrigger.tsx`

The tappable display for a date range. Shows FROM and TO in a two-column layout, both within one tappable area.

#### Props

```ts
type DateRangeFieldTriggerProps = {
  fromValue: string | undefined;
  toValue: string | undefined;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  onPress: () => void;
  id?: string;
  className?: string;
};
```

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  FROM              │  TO                          [📅]  │
│  May 20, 2026      │  Select end                        │
└─────────────────────────────────────────────────────────┘
```

The entire element is one `<button>`. The FROM/TO labels inside are visual dividers only — not interactive separately. Opening the range sheet is a single tap.

---

### Step 6 — `src/components/primitives/date/index.ts`

Public barrel for the date primitives:

```ts
export { DayCalendar } from './DayCalendar';
export { DateFieldTrigger } from './DateFieldTrigger';
export { DateRangeFieldTrigger } from './DateRangeFieldTrigger';
export { DateRangeSelectionTabs } from './DateRangeSelectionTabs';
export { parseISOToDate, serializeDateToISO, formatDateDisplay } from './date-utils';
// surfaces.ts is NOT exported here — it is imported directly in surface-registry.ts
```

---

### Step 7 — `src/pages/calendar/CalendarSinglePickerPage.tsx`

The surface content page for single date selection. This is what renders inside the `BottomSheetSurface` when `calendar-single-picker` is opened.

#### Surface props type

```ts
type CalendarSinglePickerSurfaceProps = {
  currentValue: string | null;
  onSelect: (isoString: string | null) => void;
  title?: string;       // optional — sets the sheet header title via SurfaceHeaderContext
  minDate?: Date;
  maxDate?: Date;
};
```

#### How it reads props

Surface pages read props from `SurfacePropsContext` (type is `Record<string, unknown>`). Cast to the expected type at the top of the component:

```tsx
import { useContext, useState } from 'react';
import { SurfacePropsContext, SurfaceHeaderContext } from '@/providers/SurfaceProvider';
import { DayCalendar } from '@/components/primitives/date';
import { parseISOToDate, serializeDateToISO } from '@/components/primitives/date';

export function CalendarSinglePickerPage() {
  const rawProps = useContext(SurfacePropsContext) as CalendarSinglePickerSurfaceProps;
  const header = useContext(SurfaceHeaderContext);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    parseISOToDate(rawProps.currentValue),
  );

  // Set sheet title if provided
  useEffect(() => {
    if (rawProps.title && header) {
      header.setTitle(rawProps.title);
    }
  }, [rawProps.title, header]);

  function handleSelect(date: Date | undefined) {
    setSelectedDate(date);
    rawProps.onSelect(date ? serializeDateToISO(date) : null);
    if (date) {
      header?.requestClose();  // auto-close on selection
    }
  }

  return (
    <DayCalendar
      mode="single"
      selected={selectedDate}
      onSelect={handleSelect}
    />
  );
}
```

**Why local state before committing**: The `selectedDate` local state drives DayPicker's visual selection (highlighted day). `onSelect` commits to RHF immediately, then `requestClose()` closes the sheet. The 350ms `BottomSheetSurface` close delay means the user sees the selected date highlighted briefly before the sheet animates away — good mobile UX feedback.

---

### Step 8 — `src/pages/calendar/CalendarRangePickerPage.tsx`

The surface content page for date range selection.

#### Surface props type

```ts
type CalendarRangePickerSurfaceProps = {
  currentFrom: string | null;
  currentTo: string | null;
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
  fromLabel?: string;         // label for FROM tab, defaults to "From"
  toLabel?: string;           // label for TO tab, defaults to "To"
};
```

#### State

```ts
const [activeTarget, setActiveTarget] = useState<'from' | 'to'>('from');
const [fromDate, setFromDate] = useState<Date | undefined>(parseISOToDate(rawProps.currentFrom));
const [toDate, setToDate] = useState<Date | undefined>(parseISOToDate(rawProps.currentTo));
```

#### Selection logic

```ts
function handleDaySelect(date: Date | undefined) {
  if (!date) return;

  if (activeTarget === 'from') {
    setFromDate(date);
    rawProps.onFromSelect(serializeDateToISO(date));  // immediate commit
    setActiveTarget('to');                            // auto-advance
  } else {
    setToDate(date);
    rawProps.onToSelect(serializeDateToISO(date));    // immediate commit
    header?.requestClose();                           // auto-close on TO selection
  }
}
```

#### Render structure

```
[ DateRangeSelectionTabs → FROM | TO ]
[ DayCalendar → mode="range" selected={{ from: fromDate, to: toDate }} ]
```

The DayPicker range selection visual (`range_start`, `range_middle`, `range_end`) is driven by `fromDate` and `toDate` local state for visual feedback. The RHF fields are updated via `onFromSelect`/`onToSelect` callbacks.

---

### Step 9 — `src/components/primitives/date/surfaces.ts`

Surface registrations for the two calendar pickers. These are `sheet` surfaces with no `path` — they are ephemeral overlays, not navigable states.

```ts
import { lazy } from 'react';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const calendarSurfaces: SurfaceRegistrations = {
  'calendar-single-picker': {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/calendar/CalendarSinglePickerPage').then((m) => ({
        default: m.CalendarSinglePickerPage,
      })),
    ),
  },
  'calendar-range-picker': {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/calendar/CalendarRangePickerPage').then((m) => ({
        default: m.CalendarRangePickerPage,
      })),
    ),
  },
};
```

**Why `surfaces.ts` lives in `components/primitives/date/` instead of a feature folder**: The calendar picker is not owned by any single business domain — it is shared infrastructure used by tasks, customers, and any future feature with date fields. Placing it in a feature folder would create a cross-feature import from `@/features/tasks/surfaces.ts` into other features, violating the feature boundary rule. The primitives folder is the correct home for shared presentation infrastructure.

---

### Step 10 — Register in `src/app/surface-registry.ts`

Open `src/app/surface-registry.ts` and add the calendar surfaces:

```ts
import { testSurfaces } from '@/features/test_feature';
import { calendarSurfaces } from '@/components/primitives/date/surfaces';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
```

---

### Step 11 — Task feature date types ✅ ALREADY IMPLEMENTED

`src/features/tasks/types.ts` already contains all three date fields. **No file changes required for this step.**

**What already exists:**
- `DateOnlySchema` is defined in `src/types/common.ts` as `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD.')` — this is the authoritative date-only schema for the entire app.
- `TaskSchema`, `CreateTaskInputSchema`, and `UpdateTaskInputSchema` all include `ready_by_at`, `scheduled_start_at`, and `scheduled_end_at` using `DateOnlySchema.nullable()` (and `.optional()` on the input schemas).

**What this means for Steps 12–13:**
The task field components bind to **flat paths** (`ready_by_at`, `scheduled_start_at`, `scheduled_end_at`) because `CreateTaskInputSchema` declares these fields at the top level — not nested under a `task:` namespace. If a future compound form wraps them under `task:`, the field paths must be updated to `task.ready_by_at` etc. Document this in a JSDoc comment on each component.

**`date-utils.ts` note:**
The `parseISOToDate` and `serializeDateToISO` utility functions in Step 1 operate on raw strings and do not need to import from `@/types/common`. If inline schema validation is ever needed inside a utility, import `DateOnlySchema` from `@/types/common` rather than redefining the regex. A separate `TaskDateFieldsSchema` is **not needed** — the fields are already part of the main task schemas.

---

### Step 12 — `src/features/tasks/components/fields/TaskReadyByDateField.tsx`

RHF-aware single date field. Binds to `task.ready_by_at`.

#### Complete implementation

```tsx
import { useFormContext, useController } from 'react-hook-form';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { DateFieldTrigger, formatDateDisplay } from '@/components/primitives/date';

export function TaskReadyByDateField() {
  const { control } = useFormContext();
  const { field, fieldState } = useController({
    name: 'ready_by_at',
    control,
  });
  const invalid = Boolean(fieldState.error);

  function handlePress() {
    useSurfaceStore.getState().open('calendar-single-picker', {
      currentValue: field.value ?? null,
      onSelect: (iso: string | null) => field.onChange(iso),
      title: 'Select due date',
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="task-ready-by-date" className="text-sm font-medium text-foreground">
        Due date
      </label>
      <DateFieldTrigger
        id="task-ready-by-date"
        value={formatDateDisplay(field.value)}
        placeholder="Select due date"
        invalid={invalid}
        onPress={handlePress}
      />
      {fieldState.error?.message && (
        <p className="text-xs text-destructive" role="alert">
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}
```

**Field path**: `ready_by_at` — flat path matching `CreateTaskInputSchema`. If this component is ever used inside a compound form schema that wraps task fields under a `task:` namespace, update to `task.ready_by_at`. Document in a JSDoc comment on the component.

---

### Step 13 — `src/features/tasks/components/fields/TaskDeliveryDateField.tsx`

RHF-aware range date field. Binds to both `task.scheduled_start_at` and `task.scheduled_end_at`.

#### Complete implementation

```tsx
import { useFormContext, useController } from 'react-hook-form';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { DateRangeFieldTrigger, formatDateDisplay } from '@/components/primitives/date';

export function TaskDeliveryDateField() {
  const { control } = useFormContext();
  const { field: startField, fieldState: startState } = useController({
    name: 'scheduled_start_at',
    control,
  });
  const { field: endField, fieldState: endState } = useController({
    name: 'scheduled_end_at',
    control,
  });
  const invalid = Boolean(startState.error) || Boolean(endState.error);

  function handlePress() {
    useSurfaceStore.getState().open('calendar-range-picker', {
      currentFrom: startField.value ?? null,
      currentTo: endField.value ?? null,
      onFromSelect: (iso: string | null) => startField.onChange(iso),
      onToSelect: (iso: string | null) => endField.onChange(iso),
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="task-delivery-range" className="text-sm font-medium text-foreground">
        Delivery window
      </label>
      <DateRangeFieldTrigger
        id="task-delivery-range"
        fromValue={formatDateDisplay(startField.value)}
        toValue={formatDateDisplay(endField.value)}
        fromPlaceholder="Start date"
        toPlaceholder="End date"
        invalid={invalid}
        onPress={handlePress}
      />
      {(startState.error?.message || endState.error?.message) && (
        <p className="text-xs text-destructive" role="alert">
          {startState.error?.message ?? endState.error?.message}
        </p>
      )}
    </div>
  );
}
```

**Two `useController` calls in one component**: This is intentional. The delivery range is a single UI concept (one tappable field, one calendar surface) but two RHF fields. Each `useController` call is stable — RHF hooks follow the same rules as regular hooks.

---

### Step 14 — Export task date fields from `src/features/tasks/index.ts`

Add to the existing `index.ts`:

```ts
export { TaskReadyByDateField } from './components/fields/TaskReadyByDateField';
export { TaskDeliveryDateField } from './components/fields/TaskDeliveryDateField';
```

**Note**: `TaskDateFieldsSchema` is not exported — the date fields exist as part of `CreateTaskInputSchema` and `TaskSchema` directly (see Step 11). Import `DateOnlySchema` from `@/types/common` if a consumer needs the date-string validator.

---

### Step 15 — Typecheck

```bash
npm run typecheck
```

Expected: zero errors.

---

## Full file tree produced by this plan

```
src/
  components/primitives/date/
    date-utils.ts                     ← parseISOToDate, serializeDateToISO, formatDateDisplay
    DayCalendar.tsx                   ← styled DayPicker v10 wrapper
    DateRangeSelectionTabs.tsx        ← FROM / TO interactive tabs
    DateFieldTrigger.tsx              ← single date tappable display (button)
    DateRangeFieldTrigger.tsx         ← range date tappable display (button)
    surfaces.ts                       ← calendarSurfaces registrations
    index.ts                          ← public barrel
  pages/calendar/
    CalendarSinglePickerPage.tsx      ← sheet surface page for single date
    CalendarRangePickerPage.tsx       ← sheet surface page for date range
  app/
    surface-registry.ts               ← add calendarSurfaces spread (MODIFIED)
  features/tasks/
    types.ts                          ← no changes (date fields already present)
    index.ts                          ← add date field component exports (MODIFIED)
    components/fields/
      TaskReadyByDateField.tsx        ← ready_by_at field (flat path)
      TaskDeliveryDateField.tsx       ← scheduled_start_at + scheduled_end_at (flat paths)
```

---

## Mobile UX strategy

**Thumb reachability**: The calendar header (month nav) is at the top of the sheet, naturally close to where the thumb rests after opening. The day grid is below, within thumb reach. No interactive controls are placed in the very top of the sheet (above the drag handle) since that area is difficult to reach with a thumb.

**Touch target size**: DayPicker day cells are sized at `h-11` (44px) — meeting Apple HIG minimum. The month navigation buttons are `h-9 w-9` (36px) — slightly below minimum but acceptable for secondary controls. If 44px is required for navigation buttons, increase to `h-11 w-11`.

**Active press states**: `active:scale-95` on day buttons, `active:scale-[0.99]` on date field triggers. Both use CSS transforms — no JavaScript involved, so they are responsive even before React re-renders.

**Landscape handling**: On landscape mobile devices, `max-h-[90dvh]` on the sheet content allows the calendar to scroll internally. DayPicker's grid is always at least 380px wide — on narrow landscape devices (below 400px width), the calendar may require horizontal scroll. This is an edge case; document it rather than solving it now.

**iOS safe area**: The existing `BottomSheetSurface` adds `pb-[var(--safe-bottom)]` to its content area. The calendar pages will benefit from this automatically since they render inside the existing surface.

**Keyboard/IME coexistence**: Date fields are `<button>` elements — tapping them does NOT trigger the software keyboard. This is a significant UX advantage over native `<input type="date">` fields, which open a system picker (unpredictable cross-platform behavior).

---

## Accessibility

| Concern | Implementation |
|---|---|
| Field role | `<button aria-haspopup="dialog">` announces that tapping opens a dialog |
| Sheet dialog | `BottomSheetSurface` → `Drawer.Content` sets `role="dialog"` and `aria-modal` via Vaul |
| Sheet title | `SurfaceHeaderContext.setTitle(...)` → announced when sheet opens via `aria-labelledby` |
| Date selection announcement | DayPicker v10 announces selected dates via `aria-pressed` and `aria-selected` on day buttons |
| Range active target | `DateRangeSelectionTabs` uses `aria-pressed` (or `aria-selected` on tab role) to indicate the active target |
| Error messages | `role="alert"` on error `<p>` → announced immediately by screen readers on appearance |
| Keyboard navigation | DayPicker handles arrow keys, Tab, Enter/Space for date selection — no custom keyboard handling needed |
| Focus on open | Vaul focuses `Drawer.Content` on open — first interactive element (drag handle region) receives focus; Tab navigates into the calendar |

**`DateRangeSelectionTabs` ARIA**: Add `role="tablist"` to the container div and `role="tab"` + `aria-selected` to each button. This communicates the tab pattern to screen readers.

---

## Future extensibility

The architecture is built to support these future enhancements without breaking changes:

| Future need | Extension point |
|---|---|
| Datetime selection | Add `mode="datetime"` to `DayCalendar`; add a time slot picker below the calendar grid in the sheet page |
| Blocked/unavailable dates | `disabled` prop on `DayCalendar` → pass via `SurfacePropsContext` |
| Multi-date selection | Add `mode="multiple"` branch to `DayCalendar` |
| Recurring schedules | New surface page `CalendarRecurringPickerPage` — existing infrastructure unchanged |
| Different field paths | Only the task field components have hardcoded paths; other feature fields (e.g., `CustomerDobField`) import the same primitives and surface IDs |
| Forced timezone display | Replace `Intl.DateTimeFormat(undefined, ...)` with `Intl.DateTimeFormat('en-US', { timeZone: VITE_APP_TIMEZONE })` in `formatDateDisplay` |

---

## Risks and mitigations

- Risk: `DayCalendar` classNames keys do not exactly match DayPicker v10's exported `ClassNames` type
  Mitigation: TypeScript will error at the `classNames` prop if any key is wrong. Fix by importing and referencing `ClassNames` from `react-day-picker` as the type for `DAY_CALENDAR_CLASS_NAMES`.

- Risk: `SurfacePropsContext` cast from `Record<string, unknown>` to a specific props type loses type safety
  Mitigation: This is a known limitation of the current surface system. The cast is explicit and the prop type is defined in the same file as the surface page — both sides are visible together. A future improvement would be to add generic typing to the surface registration system.

- Risk: `useSurfaceStore.getState().open(...)` is called directly (outside React lifecycle) — potential stale closure on the `onSelect` callback
  Mitigation: `useController`'s `field.onChange` is a stable reference (guaranteed by RHF). The closure captures a stable function reference. No stale closure risk.

- Risk: `header?.requestClose()` after TO selection fires before `field.onChange(iso)` processes in React
  Mitigation: `field.onChange(iso)` is synchronous (updates RHF's internal ref store, not React state). The `requestClose()` call is safe immediately after. The 350ms close delay in `BottomSheetSurface` ensures the visual update completes before the sheet animates away.

- Risk: `new Date("2026-05-20")` is parsed as UTC midnight, but `Intl.DateTimeFormat` without `timeZone: 'UTC'` would render it as `May 19` for users in UTC-5 or earlier offsets.
  Mitigation: `formatDateDisplay` always passes `{ timeZone: 'UTC' }` — already encoded in this plan. `serializeDateToISO` uses `getUTCFullYear/Month/Date` for the same reason. Both ends are locked to UTC for date-only handling.

---

## Validation plan

- `npm run typecheck`: zero errors
- Manual: open a form with `<FormProvider>`; tap `TaskReadyByDateField` → bottom sheet calendar opens; select a date → sheet closes; field shows `"May 20, 2026"` format
- Manual: tap `TaskDeliveryDateField` → range sheet opens with FROM tab active; select FROM date → FROM tab shows date, TO tab becomes active; select TO date → sheet closes; both field triggers show dates
- Manual: open range sheet; select FROM; swipe down → sheet closes; FROM field shows selected date, TO field is unchanged
- Manual: open range sheet; tap TO tab first → TO becomes active; select date; TO commits; sheet does NOT auto-close (because FROM was not yet set) — wait, actually per the UX spec, TO-only is valid and should close. Adjust: auto-close fires whenever TO is explicitly selected, regardless of FROM state.
- Manual (iOS): tap date field → software keyboard does NOT appear

---

## Review log

Updated 2026-05-20: Implemented the shared date primitive system, calendar sheet pages, task date fields, lazy surface registrations, and stable `data-testid` attributes for triggers, sheets, tabs, and task field wrappers.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
