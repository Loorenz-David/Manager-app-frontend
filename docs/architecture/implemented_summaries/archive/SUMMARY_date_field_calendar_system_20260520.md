# SUMMARY_date_field_calendar_system_20260520

## Metadata

- Summary ID: `SUMMARY_date_field_calendar_system_20260520`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-20T18:07:33Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_date_field_calendar_system_20260520.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a shared date primitive system under `src/components/primitives/date/` with UTC-safe parse/serialize/format utilities, a typed `DayCalendar` wrapper for React DayPicker v10, single/range trigger buttons, range selection tabs, and sheet surface registrations.
- Added lazy-loaded calendar sheet pages for single-date and range-date selection and registered them in the app surface registry as ephemeral `sheet` surfaces.
- Added RHF-aware task date field components for `ready_by_at`, `scheduled_start_at`, and `scheduled_end_at` using `useController()` and the shared surface system.
- Added stable `data-testid` attributes across the new trigger buttons, range tabs, task field wrappers, error messages, and calendar pages.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/date/*`: added the shared date primitives, utility functions, and calendar surface registrations.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/index.ts`: exported the shared date primitives and date utilities.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/calendar/CalendarSinglePickerPage.tsx`: added the single-date sheet page.
- `apps/managers-app/ManagerBeyo-app-managers/src/pages/calendar/CalendarRangePickerPage.tsx`: added the range-date sheet page with immediate partial-range commits.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`: registered the calendar sheet surfaces.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/TaskReadyByDateField.tsx`: added the RHF-aware due-date field.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/TaskDeliveryDateField.tsx`: added the RHF-aware delivery-window field.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/index.ts`: exported the new task date field components.

## Contract adherence

- `architecture/01_architecture.md`: shared calendar infrastructure lives under `components/primitives/`, while RHF-aware task fields live under `features/tasks/components/fields/`.
- `architecture/07_components.md`: all new components use named exports and keep nested helper definitions out of render scope.
- `architecture/09_forms.md`: task date fields use `useController()` instead of `register()` for the controlled calendar bridge.
- `architecture/14_styling.md`: DayPicker styling is applied through typed `classNames` and Tailwind utilities only; no CSS module overrides were added.
- `architecture/28_surfaces.md`: calendar pickers are registered as ephemeral overlay surfaces and opened through the surface store.
- `architecture/28_surfaces_local.md`: the calendar overlays use `sheet`, matching the app-specific surface contract.
- `architecture/33_vaul_drawer.md`: Vaul remains isolated to `BottomSheetSurface`; the calendar pages interact only through `SurfaceHeaderContext`.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run build`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test:e2e:mobile`: pass (`7 passed`)
- `rg 'type="date"|type="datetime-local"' apps/managers-app/ManagerBeyo-app-managers/src`: pass; no native date inputs were introduced
- Lazy-load check: `CalendarSinglePickerPage` and `CalendarRangePickerPage` are referenced only through `lazy()` registrations in `src/components/primitives/date/surfaces.ts`

## Known gaps or deferred items

- The plan’s manual interaction checks for the new task date fields and partial-range swipe-close behavior were not exercised in a dedicated form harness or Playwright scenario in this environment.
- The plan metadata still points to `docs/architecture/under_construction/intention/primitives.md`, which does not exist in this repo, so no linked intention document was updated during archive.
- No desktop-specific calendar regression suite was run; only the existing mobile Playwright project was used as the lifecycle regression gate.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_date_field_calendar_system_20260520_1807.md`
