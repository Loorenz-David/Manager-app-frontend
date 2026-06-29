# PLAN_cases_schema_fab_corrections_20260629

## Metadata

- Plan ID: `PLAN_cases_schema_fab_corrections_20260629`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-29T00:00:00Z`
- Last updated at (UTC): `2026-06-29T06:16:03Z`
- Related plan: `PLAN_cases_schema_fab_creation_20260628` (source of the issues corrected here)

## Goal and intent

- Goal: Fix two bugs and one gap found in the post-implementation audit of `PLAN_cases_schema_fab_creation_20260628`. B1 (incomplete FAB offset class) has already been corrected by the user; this plan covers B2 and G1.
- Business/user intent: Workers-app users should be able to create standalone cases via the FAB (same as managers). The public API of `@beyo/cases` should expose the `CreateCaseResponseData` type so callers can type the awaited result of `createCaseAsync`.
- Non-goals: D1/D2 design drift (moving `createFabBottomOffsetClassName` out of `CasesViewSurfaceOpeners` and out of the controller) — separate refactor, not blocking. P1 (§14 loader-function drift for RouteEntry components) — pre-existing, separate plan.

## Scope

- In scope:
  - **B2** — Wire `openCaseCreation` in workers-app `CasesPage` so the FAB opens the case creation slide with fully-assembled `CaseCreationSurfaceOpeners`
  - **G1** — Re-export `CreateCaseResponseData` from `packages/cases/src/index.ts`
- Out of scope:
  - Any changes to `CasesViewSurfaceOpeners` type shape or controller return type (D1/D2)
  - Any new surfaces in workers-app (all required surfaces are already registered)
  - Managers-app (already correct from the original plan)

## File manifest

### Existing files to edit

| Path | Change summary |
|---|---|
| `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CasesPage.tsx` | Import `CASE_CREATION_SLIDE_SURFACE_ID`, `CASE_TYPE_PICKER_SHEET_SURFACE_ID`, `PARTICIPANT_PICKER_SLIDE_SURFACE_ID`, `CaseCreationSurfaceOpeners` from `@beyo/cases`; build `caseCreationSurfaceOpeners`; add `openCaseCreation` to `viewSurfaceOpeners` |
| `packages/cases/src/index.ts` | Add `export type { CreateCaseResponseData } from "./api/create-case"` |

### New files to create

None.

## Clarifications required

None.

## Acceptance criteria

1. In the workers-app, tapping the cases FAB opens the case creation slide; the case type picker and participant picker are accessible from inside it.
2. `CreateCaseResponseData` is importable from `@beyo/cases` without referencing internal package paths.
3. `npm run typecheck` passes with zero errors across `packages/cases` and `apps/workers-app`.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md §13`: surfaceOpeners assembly pattern — `openSurface` calls only in the app controller/page, not in the package

### Skill selection

- Primary skill: correction/patch — two isolated, small edits

## Implementation plan

### Step 1 — `packages/cases/src/index.ts`

Add one line alongside the existing `CreateCaseAction` export:

```ts
export type { CreateCaseResponseData } from "./api/create-case";
```

Place it next to the `CreateCaseAction` type export (currently the last line of the `actions/` block) so related exports stay grouped.

---

### Step 2 — `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CasesPage.tsx`

**Imports** — extend the existing `@beyo/cases` import to add the three surface IDs and the openers type:

```ts
import {
  CASE_FILTER_SHEET_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  type CaseCreationSurfaceOpeners,
  type CasesViewSurfaceOpeners,
} from "@beyo/cases";
```

**Inside `CasesPage`**, before `viewSurfaceOpeners`, add:

```ts
const caseCreationSurfaceOpeners: CaseCreationSurfaceOpeners = {
  openCaseTypePicker: (props) =>
    openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props),
  openParticipantPicker: (props) =>
    openSurface(PARTICIPANT_PICKER_SLIDE_SURFACE_ID, props),
};
```

**Extend `viewSurfaceOpeners`** — add `openCaseCreation` alongside the existing keys:

```ts
const viewSurfaceOpeners: CasesViewSurfaceOpeners = {
  openCaseFilters: (props) =>
    openSurface(CASE_FILTER_SHEET_SURFACE_ID, props),
  openCaseCreation: () =>
    openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
      surfaceOpeners: caseCreationSurfaceOpeners,
    }),
  createFabBottomOffsetClassName: hasLastActiveStepCard
    ? LAST_ACTIVE_STEP_CARD_FAB_OFFSET_CLASS
    : undefined,
};
```

The `createFabBottomOffsetClassName` line that was already there must be preserved exactly as-is.

---

## Risks and mitigations

- Risk: `PARTICIPANT_PICKER_SLIDE_SURFACE_ID` and `CASE_TYPE_PICKER_SHEET_SURFACE_ID` were already registered in workers-app surfaces before this plan — confirmed in the audit. No surface registration changes required.
  Mitigation: Verified in `apps/workers-app/.../features/cases/surfaces.ts`.

## Validation plan

- `npm run typecheck` (from `frontend/`): zero errors in `packages/cases` and `apps/workers-app`
- Manual smoke test (workers-app): Cases tab → FAB visible → tap → case creation slide opens → case type picker opens on tap → participant picker opens on tap → submit creates case → list refreshes

## Review log

_(empty)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
