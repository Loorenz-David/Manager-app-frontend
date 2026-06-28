# PLAN_cases_schema_fab_creation_20260628

## Metadata

- Plan ID: `PLAN_cases_schema_fab_creation_20260628`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-28T00:00:00Z`
- Last updated at (UTC): `2026-06-28T21:16:02Z`
- Related issue/ticket: —

## Goal and intent

- Goal: Add `reference_number` + `scalar_id` to case schemas; update `CaseCard` to display the reference number and reposition the unread pill; add a FAB button in `CasesView` that opens the case creation form without an entity link; wire the case creation surfaces in the managers-app.
- Business/user intent: Managers can now create standalone cases (no task link) directly from the cases list page using a thumb-reachable FAB. Every case card displays its human-readable reference number so agents can identify cases at a glance.
- Non-goals: Workers-app case creation FAB (they already have it via task-step context). Any changes to the case creation form fields themselves.

## Scope

- In scope:
  - `reference_number` (string, nullable) and `scalar_id` (integer, nullable) added to `CaseListCardRawSchema` and `CaseDetailBaseSchema`
  - `create-case` API function updated to return response data (`case_client_id`, `reference_number`, `scalar_id`)
  - `use-create-case` mutation type updated accordingly
  - `CaseCard` shows `reference_number` beside the case type name in muted font; unread pill repositioned to `absolute -top-2 -right-2`
  - `CasesViewSurfaceOpeners` extended with `openCaseCreation?: () => void`
  - `CasesViewController` extended with `openCaseCreation: () => void`
  - `CasesView` renders a FAB button that calls `controller.openCaseCreation()`
  - Managers-app: 3 new page files (`CaseCreationSlidePage`, `CaseTypePickerSheetPage`, `ParticipantPickerSlidePage`) + surfaces registration + `CasesPage` updated to provide `openCaseCreation`
- Out of scope:
  - Displaying `scalar_id` anywhere in the UI (stored for future use)
  - Changing the `onCaseCreated` callback signature
  - Workers-app changes (already has case creation surfaces wired)
  - Any Playwright spec (no new flows added, only FAB entry point for existing creation flow)
- Assumptions:
  - Backend already returns `reference_number` (string) and `scalar_id` (integer) in the case list, detail, and create-case response bodies
  - Fields are optional/nullable on existing rows until the backend migration completes
  - The `CaseCreationRouteEntry`, `CaseTypePickerRouteEntry`, `ParticipantPickerRouteEntry` from `@beyo/cases` are self-contained and need no modification

## File manifest

### Existing files to edit

| Path | Change summary |
|---|---|
| `packages/cases/src/types.ts` | Add `reference_number: z.string().nullable().optional()` and `scalar_id: z.number().int().nullable().optional()` to `CaseListCardRawSchema` and `CaseDetailBaseSchema` |
| `packages/cases/src/api/create-case.ts` | Extend `CreateCaseResponseSchema` data object with `reference_number` and `scalar_id`; change return type from `Promise<void>` to `Promise<{ case_client_id: string; reference_number: string \| null; scalar_id: number \| null }>` |
| `packages/cases/src/actions/use-create-case.ts` | Update `useMutation` generic from `void` to the new create-case response shape |
| `packages/cases/src/surface-ids.ts` | Add `openCaseCreation?: () => void` to `CasesViewSurfaceOpeners` |
| `packages/cases/src/controllers/use-cases-view.controller.ts` | Add `openCaseCreation: () => void` to `CasesViewController` type; add `openCaseCreation()` function that calls `params.viewSurfaceOpeners?.openCaseCreation?.()` |
| `packages/cases/src/components/CaseCard.tsx` | Add `reference_number` display (lighter muted font, same row as case type name); make button `relative`; move unread pill to `absolute -top-2 -right-2` |
| `packages/cases/src/components/CasesView.tsx` | Add FAB button (`absolute bottom-[calc(var(--safe-bottom,0px)+0.75rem)] right-4 z-40 size-14 rounded-full bg-primary text-card`) with Plus icon; calls `controller.openCaseCreation()` |
| `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/surfaces.ts` | Import + register `CASE_CREATION_SLIDE_SURFACE_ID`, `CASE_TYPE_PICKER_SHEET_SURFACE_ID`, `PARTICIPANT_PICKER_SLIDE_SURFACE_ID` with their loader functions |
| `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CasesPage.tsx` | Import `CASE_CREATION_SLIDE_SURFACE_ID`, `CASE_TYPE_PICKER_SHEET_SURFACE_ID`, `PARTICIPANT_PICKER_SLIDE_SURFACE_ID`, `CaseCreationSurfaceOpeners` from `@beyo/cases`; add `openCaseCreation` to `viewSurfaceOpeners` |

### New files to create

| Path |
|---|
| `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseCreationSlidePage.tsx` |
| `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseTypePickerSheetPage.tsx` |
| `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/ParticipantPickerSlidePage.tsx` |

## Clarifications required

None — all required details are defined in the intention.

## Acceptance criteria

1. `CaseListCardRawSchema` and `CaseDetailBaseSchema` parse without error when `reference_number` and `scalar_id` are present, absent, or null in API responses.
2. `createCase()` returns `{ case_client_id, reference_number, scalar_id }` with correct types.
3. `CaseCard` renders the reference number (e.g. `#CASE-001`) to the right of the case type name in `text-muted-foreground`; the unread badge is absolutely positioned at `-top-2 -right-2` inside the card.
4. `CasesView` renders a FAB button (Plus icon, `bg-primary`, `text-card`, `rounded-full`, `size-14`) absolutely at the bottom-right of the scroll container.
5. Pressing the FAB in the managers-app opens the `CaseCreationSlidePage` surface with no entity link; the case type picker and participant picker are functional.
6. `npm run typecheck` passes with zero errors in both `packages/cases` and `apps/managers-app`.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo structure + layer rules
- `architecture/02_types.md`: Zod schema patterns, nullable/optional conventions
- `architecture/04_api_client.md`: API function return type conventions
- `architecture/05_server_state.md`: mutation/query hook patterns
- `architecture/06_client_state.md`: store patterns (not primary here but included as core)
- `architecture/08_hooks.md`: action hook / mutation patterns
- `architecture/13_errors.md`: error handling in mutations
- `architecture/15_feature_structure.md`: package source structure
- `architecture/07_components.md`: component patterns
- `architecture/14_styling.md`: Tailwind utility class conventions
- `architecture/28_surfaces.md`: surface registration and surface props
- `architecture/30_dynamic_loading.md`: `lazyWithPreload` and loader function pattern
- `architecture/35_shared_packages.md`: package boundary rules, `§13` surfaceOpeners injection, `§14` loader functions for page components

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types (slide, sheet, modal — no drawer)
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path, `usePreloadSurface` hook

### Skill selection

- Primary skill: `skills/implement/SKILL.md` (standard implementation)
- Trigger terms: `surface`, `surfaceOpeners`, `lazyWithPreload`, `package page`
- Excluded alternatives: none

## Implementation plan

### Step 1 — `packages/cases/src/types.ts`

Add to `CaseListCardRawSchema`:
```ts
reference_number: z.string().nullable().optional(),
scalar_id: z.number().int().nullable().optional(),
```

Add the same two fields to `CaseDetailBaseSchema`.

No changes to `CaseListCardViewModel`, `toCaseListCardViewModel`, or other derived types — the fields are spread through `...c` automatically.

---

### Step 2 — `packages/cases/src/api/create-case.ts`

Replace:
```ts
const CreateCaseResponseSchema = ApiEnvelopeSchema(
  z.object({ case_client_id: z.string() }),
).extend({ ok: z.literal(true) });

export async function createCase(input: CreateCaseInput): Promise<void> {
  await apiClient.post('/api/v1/cases', CreateCaseResponseSchema, input);
}
```

With:
```ts
const CreateCaseResponseDataSchema = z.object({
  case_client_id: z.string(),
  reference_number: z.string().nullable(),
  scalar_id: z.number().int().nullable(),
});

const CreateCaseResponseSchema = ApiEnvelopeSchema(CreateCaseResponseDataSchema).extend({
  ok: z.literal(true),
});

export type CreateCaseResponseData = z.infer<typeof CreateCaseResponseDataSchema>;

export async function createCase(input: CreateCaseInput): Promise<CreateCaseResponseData> {
  const response = await apiClient.post('/api/v1/cases', CreateCaseResponseSchema, input);
  return response.data;
}
```

---

### Step 3 — `packages/cases/src/actions/use-create-case.ts`

Import `CreateCaseResponseData` from `../api/create-case`.

Update `useMutation` generic:
```ts
const mutation = useMutation<CreateCaseResponseData, ApiRequestError, CreateCaseInput>({ ... });
```

Update the return object to expose the typed `mutate` and `mutateAsync`.

---

### Step 4 — `packages/cases/src/surface-ids.ts`

In `CasesViewSurfaceOpeners`, add:
```ts
openCaseCreation?: () => void;
```

---

### Step 5 — `packages/cases/src/controllers/use-cases-view.controller.ts`

In `CasesViewController` type, add:
```ts
openCaseCreation: () => void;
```

After the existing `openFilters` function, add:
```ts
function openCaseCreation(): void {
  params.viewSurfaceOpeners?.openCaseCreation?.();
}
```

Include `openCaseCreation` in the returned object.

---

### Step 6 — `packages/cases/src/components/CaseCard.tsx`

Three changes:

**a) `reference_number` display** — in the top row alongside the case type name, add a `<span>` after the case type name that renders `card.reference_number` when present:
```tsx
<div className="flex items-center gap-1.5 min-w-0">
  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
    {getCaseTypeName(card.case_type, card.type_label ?? "Case")}
  </span>
  {card.reference_number ? (
    <span className="shrink-0 text-xs text-muted-foreground">
      {card.reference_number}
    </span>
  ) : null}
</div>
```

**b) Add `relative` to the outer `<button>`** so the absolute pill is positioned relative to the card.

**c) Remove the inline unread pill** from the top row and replace with an absolutely-positioned badge:
```tsx
{unreadCount > 0 ? (
  <span
    className="absolute -top-2 -right-2 inline-flex min-w-5 items-center justify-center rounded-full bg-green-600 p-1 text-[11px] font-semibold leading-none text-card"
    data-testid={`case-card-unread-${card.client_id}`}
  >
    {unreadCount}
  </span>
) : null}
```

---

### Step 7 — `packages/cases/src/components/CasesView.tsx`

Import `Plus` from `lucide-react`.

Add FAB button inside the outer `<div>` (sibling to `PullToRefresh`, after it):
```tsx
<button
  aria-label="New case"
  className="absolute bottom-[calc(var(--safe-bottom,0px)+0.75rem)] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md transition-transform active:scale-95"
  data-testid="cases-view-create-fab"
  type="button"
  onClick={controller.openCaseCreation}
>
  <Plus aria-hidden="true" className="size-6" />
</button>
```

---

### Step 8 — CREATE `apps/managers-app/.../pages/cases/CaseCreationSlidePage.tsx`

```tsx
import { CaseCreationRouteEntry } from "@beyo/cases";

export function CaseCreationSlidePage(): React.JSX.Element {
  return <CaseCreationRouteEntry />;
}
```

---

### Step 9 — CREATE `apps/managers-app/.../pages/cases/CaseTypePickerSheetPage.tsx`

```tsx
import { CaseTypePickerRouteEntry } from "@beyo/cases";

export function CaseTypePickerSheetPage(): React.JSX.Element {
  return <CaseTypePickerRouteEntry />;
}
```

---

### Step 10 — CREATE `apps/managers-app/.../pages/cases/ParticipantPickerSlidePage.tsx`

```tsx
import { ParticipantPickerRouteEntry } from "@beyo/cases";

export function ParticipantPickerSlidePage(): React.JSX.Element {
  return <ParticipantPickerRouteEntry />;
}
```

---

### Step 11 — `apps/managers-app/.../features/cases/surfaces.ts`

Add three loader functions and register them. The existing 4 surfaces remain unchanged.

```ts
import {
  // existing imports …
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
} from "@beyo/cases";

function loadCaseCreationSlidePage() {
  return import("@/pages/cases/CaseCreationSlidePage").then((module) => ({
    default: module.CaseCreationSlidePage,
  }));
}

function loadCaseTypePickerSheetPage() {
  return import("@/pages/cases/CaseTypePickerSheetPage").then((module) => ({
    default: module.CaseTypePickerSheetPage,
  }));
}

function loadParticipantPickerSlidePage() {
  return import("@/pages/cases/ParticipantPickerSlidePage").then((module) => ({
    default: module.ParticipantPickerSlidePage,
  }));
}

const caseCreationSlide = lazyWithPreload(loadCaseCreationSlidePage);
const caseTypePickerSheet = lazyWithPreload(loadCaseTypePickerSheetPage);
const participantPickerSlide = lazyWithPreload(loadParticipantPickerSlidePage);
```

Add to `caseSurfaces`:
```ts
[CASE_CREATION_SLIDE_SURFACE_ID]: {
  surface: "slide",
  component: caseCreationSlide.Component,
},
[CASE_TYPE_PICKER_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: caseTypePickerSheet.Component,
},
[PARTICIPANT_PICKER_SLIDE_SURFACE_ID]: {
  surface: "slide",
  component: participantPickerSlide.Component,
},
```

---

### Step 12 — `apps/managers-app/.../pages/cases/CasesPage.tsx`

Add imports:
```ts
import {
  CASE_FILTER_SHEET_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  type CasesViewSurfaceOpeners,
  type CaseCreationSurfaceOpeners,
} from "@beyo/cases";
```

Update `viewSurfaceOpeners`:
```ts
const caseCreationSurfaceOpeners: CaseCreationSurfaceOpeners = {
  openCaseTypePicker: (props) =>
    openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props),
  openParticipantPicker: (props) =>
    openSurface(PARTICIPANT_PICKER_SLIDE_SURFACE_ID, props),
};

const viewSurfaceOpeners: CasesViewSurfaceOpeners = {
  openCaseFilters: (props) =>
    openSurface(CASE_FILTER_SHEET_SURFACE_ID, props),
  openCaseCreation: () =>
    openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
      surfaceOpeners: caseCreationSurfaceOpeners,
    }),
};
```

`caseCreationSurfaceOpeners` must be defined inside the component function (before the return) so `openSurface` is in scope.

---

## Risks and mitigations

- Risk: `CaseDetailBaseSchema` and `CaseListCardRawSchema` have existing runtime validation in production — adding `.nullable().optional()` is backward-compatible and will not cause parse failures on old rows.
  Mitigation: Fields are `.nullable().optional()` not `.required()`.

- Risk: The FAB overlaps the bottom-most case card on short viewports.
  Mitigation: `CasesView` already applies `pb-[calc(var(--safe-bottom,0)+5.5rem)]` to the list body, which is sufficient clearance for the FAB at `bottom-[calc(var(--safe-bottom,0px)+0.75rem)]`.

- Risk: `create-case.ts` response parsing may fail if the backend doesn't yet return `reference_number`/`scalar_id`.
  Mitigation: Use `.nullable()` in `CreateCaseResponseDataSchema` — absent values will map to `null`, not throw.

## Validation plan

- `npm run typecheck` (run from `frontend/`): zero TypeScript errors across both `packages/cases` and `apps/managers-app`
- Manual smoke test: open managers-app → Cases tab → FAB visible at bottom-right → tap FAB → case creation slide opens → select type + participants → submit → case created, list refreshes → new card shows reference number beside type name → unread badge (if applicable) appears at top-right corner of card

## Review log

_(empty)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
