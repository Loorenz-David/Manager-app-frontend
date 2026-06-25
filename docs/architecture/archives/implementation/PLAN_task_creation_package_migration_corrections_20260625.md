# PLAN_task_creation_package_migration_corrections_20260625

## Metadata

- Plan ID: `PLAN_task_creation_package_migration_corrections_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T10:09:47Z`
- Related issue/ticket: —
- Parent plan: `docs/architecture/under_construction/implementation/PLAN_task_creation_package_migration_managers_20260625.md`

## Goal and intent

- Goal: Fix two issues discovered during the post-implementation review of the task-creation package migration. Both are consequences of the same root gap: after the migration, the `@beyo/task-creation` package owns the `"calendar-single-picker"` and `"calendar-range-picker"` surface registrations, but four app components still preload the local (now-orphaned) page chunks, and the surface registry still redundantly spreads the local `calendarSurfaces` object whose entries are always overwritten.
- Business/user intent: Restore correct preload behaviour so the chunk that warms up matches the chunk that renders. Remove inert dead code from the surface registry.
- Non-goals: Deleting the local `@/pages/calendar/` page files or `@/components/primitives/date/surfaces.ts` — those are orphaned but safe to leave for a separate cleanup. Fixing the package §13 `useSurface` contract drift — that is pre-existing package debt, out of scope here.

## Scope

- In scope:
  - Moving `preloadCalendarSinglePickerSurface` and `preloadCalendarRangePickerSurface` imports in 4 files from `@/components/primitives/date` to `@beyo/task-creation`
  - Removing the `calendarSurfaces` import and spread from `surface-registry.ts`
- Out of scope:
  - Deleting local calendar pages or local calendar surfaces file
  - Touching any file not listed in the implementation steps below
  - Changes to the `@beyo/task-creation` package

## Clarifications required

_None. All changes are surgical import replacements confirmed by reading the source files._

## Acceptance criteria

1. `npm run typecheck` reports zero TypeScript errors.
2. `preloadCalendarSinglePickerSurface` and `preloadCalendarRangePickerSurface` are imported from `@beyo/task-creation` in all four files.
3. Neither `preloadCalendarSinglePickerSurface` nor `preloadCalendarRangePickerSurface` is imported from `@/components/primitives/date` anywhere in the managers app `src/`.
4. `surface-registry.ts` no longer imports or spreads `calendarSurfaces`.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md §6`: consuming apps import from `@beyo/<name>`, not from the internal source. Preload functions are part of the package's public API.
- `architecture/30_dynamic_loading.md`: `usePreloadSurface` should receive the preload function of the chunk that is actually registered in the surface registry. Preloading the wrong chunk wastes bandwidth and eliminates the latency benefit.

### File read intent — pattern vs. relational

Permitted reads performed during planning:
- All four component files — relational: to determine the exact import line structure, which names share the `@/components/primitives/date` block and must remain, and which names must be split out to `@beyo/task-creation`
- `surface-registry.ts` — relational: to identify the exact import and spread lines to delete

## Implementation plan

### Step 1 — Fix TaskReadyByDateField.tsx

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/TaskReadyByDateField.tsx`

**Current import block (lines 4–8):**
```ts
import {
  DateFieldTrigger,
  formatDateDisplay,
  preloadCalendarSinglePickerSurface,
} from '@/components/primitives/date';
```

**Replace with two separate imports:**
```ts
import {
  DateFieldTrigger,
  formatDateDisplay,
} from '@/components/primitives/date';
import { preloadCalendarSinglePickerSurface } from '@beyo/task-creation';
```

`DateFieldTrigger` and `formatDateDisplay` are local primitives — they remain on the `@/components/primitives/date` import. Only the preload function moves.

No other changes to this file.

### Step 2 — Fix TaskDeliveryDateField.tsx

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/TaskDeliveryDateField.tsx`

**Current import block (lines 4–8):**
```ts
import {
  DateRangeFieldTrigger,
  formatDateDisplay,
  preloadCalendarRangePickerSurface,
} from '@/components/primitives/date';
```

**Replace with two separate imports:**
```ts
import {
  DateRangeFieldTrigger,
  formatDateDisplay,
} from '@/components/primitives/date';
import { preloadCalendarRangePickerSurface } from '@beyo/task-creation';
```

`DateRangeFieldTrigger` and `formatDateDisplay` are local primitives — they remain. Only the preload function moves.

No other changes to this file.

### Step 3 — Fix TestingFormsContent.tsx

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/testing_forms/components/TestingFormsContent.tsx`

**Current import block (lines 11–14):**
```ts
import {
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
} from "@/components/primitives/date";
```

**Replace with:**
```ts
import {
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
} from "@beyo/task-creation";
```

This file imports nothing else from `@/components/primitives/date`, so the original import block is replaced entirely (source path changes, names are unchanged).

No other changes to this file.

### Step 4 — Fix TaskScheduledDateSheetPage.tsx

File: `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskScheduledDateSheetPage.tsx`

**Current import block (lines 4–7):**
```ts
import {
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
} from '@/components/primitives/date';
```

**Replace with:**
```ts
import {
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
} from '@beyo/task-creation';
```

This file imports nothing else from `@/components/primitives/date`, so the original import block is replaced entirely (source path changes, names are unchanged).

No other changes to this file.

### Step 5 — Remove dead calendarSurfaces from surface-registry.ts

File: `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`

**Remove line 1 (import):**
```ts
import { calendarSurfaces } from "@/components/primitives/date/surfaces";
```

**Remove line 21 (spread):**
```ts
  ...calendarSurfaces,
```

After this change the file opens with `import { caseSurfaces } from "@/features/cases/surfaces";` and the spread object starts with `...testSurfaces,` followed by `...caseSurfaces,`.

No other changes to this file.

### Step 6 — Typecheck

```bash
npm run typecheck
```

Expected: zero errors. The four changed files continue to compile because `preloadCalendarSinglePickerSurface` and `preloadCalendarRangePickerSurface` are exported from `@beyo/task-creation`'s public `index.ts`. The surface registry removal of `calendarSurfaces` reduces the registry size by two entries that were already being overwritten — no type change to the exported `SurfaceId` union is expected because those IDs are still present via `taskCreationSurfaces`.

## Risks and mitigations

- Risk: `DateFieldTrigger`, `formatDateDisplay`, `DateRangeFieldTrigger` are accidentally removed from their imports in Steps 1–2.
  Mitigation: The plan explicitly names which identifiers stay on `@/components/primitives/date` and which move. Read the before/after blocks carefully — only the preload function name moves.

- Risk: Removing `...calendarSurfaces` from the registry causes `SurfaceId` union to lose `"calendar-single-picker"` and `"calendar-range-picker"`.
  Mitigation: Both IDs remain in the registry via `taskCreationSurfaces` (which spreads after the now-removed `calendarSurfaces` anyway). `SurfaceId = keyof typeof surfaceRegistry` will still include them. Confirmed by the fact that the entries were already being overwritten before removal.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Verify grep: `grep -rn "preloadCalendar" src/` — all results should now show `from '@beyo/task-creation'` or `from "@beyo/task-creation"`, with none from `@/components/primitives/date`
- Verify grep: `grep -n "calendarSurfaces" src/app/surface-registry.ts` — no output expected

## Review log

_None yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
