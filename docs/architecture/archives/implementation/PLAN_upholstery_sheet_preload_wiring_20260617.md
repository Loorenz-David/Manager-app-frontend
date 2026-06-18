# PLAN_upholstery_sheet_preload_wiring_20260617

## Metadata

- Plan ID: `PLAN_upholstery_sheet_preload_wiring_20260617`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-17T00:00:00Z`
- Last updated at (UTC): `2026-06-17T13:25:19Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Wire `preloadUpholsteryWarningSheetSurface` and `preloadUpholsterySelectionMissingSheetSurface` into the workers-app prefetch lifecycle so both sheet bundles are warmed before the worker can trigger them.
- Business/user intent: Both upholstery guard sheets are lazy-loaded but their preload functions are never called, so the first time a worker hits the guard there is a visible bundle-load delay before the sheet appears. Wiring the preloads eliminates that cold-load hit.
- Non-goals: Changing guard logic, sheet content, or surface registration — those were handled in `PLAN_upholstery_amount_without_selection_20260617`.

## Scope

- In scope:
  - **`use-working-sections-home.controller.ts`** (`features/working_sections/controllers/`, workers app) — add both preload calls to the existing `usePrefetchOnCondition` Promise.all. This is the established pattern for prefetching task-step surfaces when section data first arrives.
  - **`features/task_steps/index.ts`** (workers app) — export both new preload functions to close the public-API gap; currently only a subset of preloads are re-exported and neither upholstery preload is listed.
- Out of scope:
  - Adding `usePreloadSurface` at component level (e.g. `TaskStepActionButton`) — the controller-level `usePrefetchOnCondition` is sufficient; the component-level hook is reserved for surfaces tightly coupled to a single component.
  - Changes to `surfaces.ts`, `surface-ids.ts`, or the sheet pages themselves.

- Assumptions:
  - `usePrefetchOnCondition` fires the callback once when `allSections.length > 0` becomes true. Adding two lightweight lazy-import calls to the Promise.all has negligible impact on page-load time.
  - Both preload functions are already exported from `features/task_steps/surfaces.ts`; no change to `surfaces.ts` is required.
  - `use-working-sections-home.controller.ts` already imports directly from `"../../task_steps/surfaces"` (not from `index.ts`) — the new imports follow the same direct path.

## Clarifications required

*(none — pattern confirmed from code inspection)*

## Acceptance criteria

1. After the workers-app home section data loads, both `UpholsteryWarningSheetPage` and `UpholsterySelectionMissingSheetPage` bundles are prefetched.
2. `preloadUpholsteryWarningSheetSurface` and `preloadUpholsterySelectionMissingSheetSurface` are exported from `features/task_steps/index.ts`.
3. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/16_feature_workflow.md`
- `task_system/frontend_contract_goal_mapping_guide.md`

### Local extensions loaded

- *(none)*

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate

Permitted relational reads:
- `features/working_sections/controllers/use-working-sections-home.controller.ts` — the file being changed; confirm current `usePrefetchOnCondition` shape before editing
- `features/task_steps/surfaces.ts` — to confirm exact export names for both preload functions
- `features/task_steps/index.ts` — the file being changed; confirm which exports are currently present

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`

## Implementation plan

### Step 1 — Wire preloads in the home controller

**Edit `features/working_sections/controllers/use-working-sections-home.controller.ts`:**

1. Add two imports at the top alongside the existing task_steps surface imports:
   ```typescript
   import {
     preloadItemIssueSelectionSheetSurface,
     preloadTaskDetailSlideSurface,
     preloadUpholsterySelectionMissingSheetSurface,  // add
     preloadUpholsteryWarningSheetSurface,            // add
   } from "../../task_steps/surfaces";
   ```

2. Add both preload calls to the `usePrefetchOnCondition` Promise.all, alongside the two existing surface preloads:
   ```typescript
   usePrefetchOnCondition(allSections.length > 0, () =>
     Promise.all([
       preloadTaskDetailSlideSurface(),
       preloadItemIssueSelectionSheetSurface(),
       preloadUpholsteryWarningSheetSurface(),            // add
       preloadUpholsterySelectionMissingSheetSurface(),   // add
       ...activeSections.map(...),
       queryClient.prefetchQuery(...),
     ]),
   );
   ```

### Step 2 — Export from the feature public API

**Edit `features/task_steps/index.ts`:**

Add both preload functions to the existing `surfaces` re-export block:
```typescript
export {
  preloadItemIssueSelectionSheetSurface,
  preloadPauseReasonSheetSurface,
  preloadStepStateFilterSheetSurface,
  preloadUpholsteryWarningSheetSurface,            // add
  preloadUpholsterySelectionMissingSheetSurface,   // add
  taskStepSurfaces,
} from "./surfaces";
```

## Risks and mitigations

- Risk: The two added preload calls marginally increase the number of microtasks in the startup Promise.all.
  Mitigation: Both are lazy dynamic imports — they resolve immediately if the chunk is already cached, and only trigger a single small network request each on first load. Net impact is negligible.

- Risk: Import name typo causes a TypeScript error.
  Mitigation: `npm run typecheck` catches this; exact names are `preloadUpholsteryWarningSheetSurface` and `preloadUpholsterySelectionMissingSheetSurface` confirmed from `surfaces.ts`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open the workers app home screen; open browser DevTools → Network tab; confirm both `UpholsteryWarningSheetPage` and `UpholsterySelectionMissingSheetPage` chunk requests appear shortly after the section list loads, before any step transition is attempted.

## Review log

- Implemented by Codex on `2026-06-17T13:25:19Z`.
- Validation: `npm run typecheck` passed.
- Summary: `docs/architecture/implemented_summaries/SUMMARY_upholstery_sheet_preload_wiring_20260617.md`
- Archive record: `docs/architecture/archives/ARCHIVE_upholstery_sheet_preload_wiring_20260617_1325.md`

## Lifecycle transition

- Current state: `archived`
- Next state: —
- Transition owner: `Codex`
