# PLAN_43_predictive_prefetch_system_20260530

## Metadata

- Plan ID: `PLAN_43_predictive_prefetch_system_20260530`
- Status: `archived`
- Owner agent: `GitHub Copilot`
- Created at (UTC): `2026-05-30T00:00:00Z`
- Last updated at (UTC): `2026-05-30T14:54:05Z`
- Related issue/ticket: `N/A`
- Intention plan: `N/A`

## Goal and intent

- Goal: Build a condition-based predictive prefetch system that preloads JS bundles and warms the React Query data cache before the user navigates, based on observable signals and page-mount conditions.
- Business/user intent: App is used as a PWA on mobile. Perceived latency on opening cases, task step details, and task creation forms is high because code chunks and data load on demand. Pre-loading both the JS bundle and the API data for likely-next surfaces eliminates loading spinners and Suspense flashes for the most frequent user flows.
- Non-goals: Server-side rendering, background sync, push notifications, prefetching for routes that are speculative (no signal). Not replacing existing `usePreloadSurface` calls — extending the pattern to also cover data.

## Scope

- In scope:
  - New `usePrefetchOnCondition` hook in `packages/ui` (shared across both apps)
  - New `prefetchCasesData()` utility in `packages/cases`
  - Cases signal-based prefetch wired in both apps via `use-tab-badge-counts.controller.ts`
  - Switch both apps from `useGlobalCaseUnreadCountQuery` to `useUnreadCountsQuery` to obtain case IDs from the unread map
  - Bundle preload exports for case conversation surface (both apps) and task detail surface (workers app)
  - Working-section active-step signal prefetch wired in workers app `useWorkingSectionsHomeController`
  - Task creation form data prefetch wired in all three managers app form content components
  - Migration of managers app `task-creation/surfaces.ts` from bare `React.lazy()` to `lazyWithPreload`
  - Contract extension: add `prefetchXxx` pattern and `usePrefetchOnCondition` to `architecture/30_dynamic_loading_local.md`

- Out of scope:
  - Intent-based (hover/long-press) prefetch — separate plan
  - Idle-queue prefetch (`requestIdleCallback`) — separate plan
  - Workers app `task-creation` surfaces (workers app has no task creation forms)
  - Prefetching paginated message history for cases (too large; case metadata is sufficient)
  - Bulk backend endpoints for multi-case or multi-section prefetch (see Improvements section)

- Assumptions:
  - `GET /api/v1/cases/unread-counts` (per-case map) is live on backend. No new backend work is required for the cases signal — the map already contains case IDs as keys.
  - The `useUnreadCountsQuery` hook already exists in `packages/cases/src/api/use-unread-counts.ts` and returns `Record<string, number>`.
  - `WorkerWorkingSection.task_steps_counts` already contains `paused`, `working`, and `ended_shift` fields — the active-step condition is computable from data already fetched by the home controller.

## Clarifications required

- None blocking. Clarifications resolved during planning:
  - The unread-counts endpoint already returns case IDs as map keys — no backend change needed.
  - The `30_dynamic_loading_local.md` contract documents the managers-app path alias `@/utils/lazy-with-preload`. The canonical location is `packages/ui`, imported as `@beyo/ui`. Both apps already import `lazyWithPreload` from `@beyo/ui`. New code should follow the existing import pattern.

## Acceptance criteria

1. `usePrefetchOnCondition` is exported from `@beyo/ui` and can be imported in both apps.
2. Both `use-tab-badge-counts.controller.ts` files use `useUnreadCountsQuery` instead of `useGlobalCaseUnreadCountQuery`. The cases tab badge count still works correctly.
3. When the app loads and unread count > 0: the case conversation bundle is already in memory before the user taps the cases tab, and React Query cache contains case detail entries for each unread case ID.
4. Workers app home page: when sections load and any section has `paused + working + ended_shift > 0`, the task detail slide bundle is preloaded and steps data for qualifying sections is warm in cache.
5. Managers app: opening any of the three task creation forms does not trigger loading states for item categories or working sections pickers — data is already in cache.
6. `task-creation/surfaces.ts` uses `lazyWithPreload` for all three surfaces (no bare `React.lazy()`). Violation rule from `30_dynamic_loading_local.md` is resolved.
7. `TaskCreationFab` calls `usePreloadSurface` for all three task creation bundles on mount. Opening any form after the task list loads produces no Suspense flash.
8. `architecture/30_dynamic_loading_local.md` documents the `prefetchXxx` pattern and `usePrefetchOnCondition` for future implementors.
9. `npm run typecheck` passes with zero errors in both apps and all packages.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo layer rules, package boundaries
- `architecture/02_types.md`: shared type conventions
- `architecture/04_api_client.md`: `apiClient.get()` usage, response envelope shape
- `architecture/05_server_state.md`: `useQuery`, `queryClient.prefetchQuery`, `staleTime`, query key conventions
- `architecture/06_client_state.md`: Zustand store rules (no new stores needed but referenced for context)
- `architecture/08_hooks.md`: hook composition, `useEffect` rules, `useRef` for stable refs
- `architecture/13_errors.md`: not applicable (no error boundaries added)
- `architecture/15_feature_structure.md`: feature layer rules, where hooks live
- `architecture/18_performance.md`: memoization, prefetch strategy
- `architecture/30_dynamic_loading.md`: `lazyWithPreload`, code-split patterns, `usePreloadSurface`

### Local extensions loaded

- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` import path (`@beyo/ui`), `usePreloadSurface` hook location, StagedForm hoisting rule, surface registration pattern. **This plan extends it** with `prefetchXxx` function pattern and `usePrefetchOnCondition`.

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Prohibited (pattern reads — contract already covers these):
- Reading another action hook to understand cache snapshot / rollback shape → `08_hooks.md`
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another controller to understand aggregation shape → `08_hooks.md`
- Reading another provider to understand context shell → `23_providers.md`
- Reading another DTO file to understand view model transformer shape → `24_dto.md`

Permitted (relational reads — understanding what exists):
- Reading `packages/cases/src/api/use-unread-counts.ts` to confirm return type shape
- Reading `packages/cases/src/api/case-keys.ts` to verify query key structure for `detail(id)`
- Reading `packages/cases/src/api/get-case.ts` to verify `getCase()` params and return type
- Reading `apps/*/hooks/use-tab-badge-counts.controller.ts` to understand existing badge wiring
- Reading `apps/workers-app/.../features/task_steps/api/task-step-keys.ts` for step key structure
- Reading `apps/workers-app/.../features/working_sections/types.ts` for `TaskStepStateCounts` fields
- Reading `apps/managers-app/.../features/items/api/item-category-picker-keys.ts` for category key shape
- Reading `apps/managers-app/.../features/working-sections/api/working-section-keys.ts` for section key shape

### Skill selection

- Primary skill: N/A (implementation plan for Copilot)

## Implementation plan

---

### Step 1 — Add `usePrefetchOnCondition` to `packages/ui`

**File:** `packages/ui/src/lib/use-prefetch-on-condition.ts` (new file)

```ts
import { useEffect, useRef } from "react";

export function usePrefetchOnCondition(
  condition: boolean,
  prefetch: () => Promise<unknown>,
): void {
  const hasRun = useRef(false);
  const stablePrefetch = useRef(prefetch);

  useEffect(() => {
    if (condition && !hasRun.current) {
      hasRun.current = true;
      void stablePrefetch.current();
    }
  }, [condition]);
}
```

**Rules:**
- `hasRun` guard ensures the prefetch fires at most once per mount, regardless of how many times `condition` flips true (e.g. re-renders as data arrives).
- `stablePrefetch` ref prevents stale-closure issues without requiring `prefetch` in the deps array.
- Fires when `condition` becomes true. If condition is already true on mount, fires on the first effect run.

**File:** `packages/ui/src/index.ts`

Add export line (alongside existing `lazyWithPreload` export):

```ts
export { usePrefetchOnCondition } from "./lib/use-prefetch-on-condition";
```

---

### Step 2 — Extend `architecture/30_dynamic_loading_local.md`

Append the following section to the file at `architecture/30_dynamic_loading_local.md`:

```md
---

## Data prefetch pattern (`prefetchXxx`)

For every surface that loads data on mount, the feature's `surfaces.ts` (or a companion
`prefetch.ts`) must export a `prefetchXxxData(queryClient, params?)` function alongside the
`preloadXxx` bundle preload export.

### Naming convention

| Bundle preload | Data prefetch |
|---|---|
| `preloadCaseConversationSlideSurface` | `prefetchCasesData(queryClient, caseIds)` |
| `preloadTaskDetailSlideSurface` | `prefetchWorkingSectionStepsData(queryClient, sectionId)` |

### Where to put it

- If the data fetch function is already in the feature's `api/` layer, the prefetch function
  is a thin wrapper that calls `queryClient.prefetchQuery` with the existing key and fn.
- Place the wrapper in `features/<domain>/api/prefetch-<domain>.ts` or inline in `surfaces.ts`
  when it is short.
- Export from `features/<domain>/index.ts` when callers outside the feature need it.

### `usePrefetchOnCondition`

Imported from `@beyo/ui`. Fires once per mount when `condition` becomes true. Pair with both
a bundle preload and a data prefetch:

```tsx
import { usePrefetchOnCondition } from "@beyo/ui";

usePrefetchOnCondition(
  unreadCaseIds.length > 0,
  () => Promise.all([
    preloadCaseConversationSlideSurface(),
    prefetchCasesData(queryClient, unreadCaseIds),
  ]),
);
```

### `staleTime` for prefetched queries

Match `staleTime` to the query hook that owns the key. If the query hook uses
`staleTime: 30_000`, the prefetch call must also use `staleTime: 30_000`. Mismatched
`staleTime` causes an immediate refetch when the component mounts and reads the cache.

### `hasRun` behaviour and session semantics

`usePrefetchOnCondition` fires once per component lifecycle. It does **not** re-prefetch
if data is refreshed and new items qualify (e.g. new unread cases arrive after the initial
prefetch). This is intentional for session-based signals. For live-updated signals
(e.g. unread counts changing while the user is active), combine with the real-time
query invalidation layer — the surface data will be warm for the initial open and
refreshed via the query cache thereafter.
```

---

### Step 3 — Add `prefetchCasesData()` to `packages/cases`

**File:** `packages/cases/src/api/prefetch-cases.ts` (new file)

```ts
import type { QueryClient } from "@tanstack/react-query";
import type { CaseId } from "@beyo/lib";
import { getCase } from "./get-case";
import { caseKeys } from "./case-keys";

export async function prefetchCasesData(
  queryClient: QueryClient,
  caseIds: string[],
): Promise<void> {
  await Promise.all(
    caseIds.map((id) =>
      queryClient.prefetchQuery({
        queryKey: caseKeys.detail(id as CaseId),
        queryFn: () => getCase({ case_client_id: id as CaseId }),
        staleTime: 30_000,
      }),
    ),
  );
}
```

**File:** `packages/cases/src/index.ts`

Add to exports:

```ts
export { prefetchCasesData } from "./api/prefetch-cases";
```

---

### Step 4 — Switch both `use-tab-badge-counts.controller.ts` to `useUnreadCountsQuery`

Both apps have identical controllers at:
- `apps/managers-app/.../src/hooks/use-tab-badge-counts.controller.ts`
- `apps/workers-app/.../src/hooks/use-tab-badge-counts.controller.ts`

**Current:** `useGlobalCaseUnreadCountQuery()` → returns `number | undefined`
**New:** `useUnreadCountsQuery()` → returns `Record<string, number> | undefined`

Changes in both files:

1. Replace import:
   ```ts
   // remove
   import { useGlobalCaseUnreadCountQuery } from "@beyo/cases";
   // add
   import { useUnreadCountsQuery } from "@beyo/cases";
   ```

2. Replace the query call:
   ```ts
   // remove
   const { data: caseUnreadCount } = useGlobalCaseUnreadCountQuery();
   // add
   const { data: caseUnreadCountsMap } = useUnreadCountsQuery();
   ```

3. Derive total count from map (used for the badge number):
   ```ts
   const caseUnreadCount = caseUnreadCountsMap
     ? Object.values(caseUnreadCountsMap).reduce((sum, n) => sum + n, 0)
     : 0;
   ```

4. Derive case IDs for prefetch (used in Step 7):
   ```ts
   const unreadCaseIds = caseUnreadCountsMap ? Object.keys(caseUnreadCountsMap) : [];
   ```

All existing badge logic (`lastShownCountRef`, `setBadgeState`, `timersRef`) continues to use `caseUnreadCount` (the derived number) unchanged.

---

### Step 5 — Export `preloadCaseConversationSlideSurface` from managers-app cases surfaces

**File:** `apps/managers-app/.../src/features/cases/surfaces.ts`

The `caseConversationSlide` variable already exists. Add export:

```ts
export const preloadCaseConversationSlideSurface = caseConversationSlide.preload;
```

Place it directly after the `const caseConversationSlide = lazyWithPreload(...)` line, before `export const caseSurfaces`.

---

### Step 6 — Export `preloadCaseConversationSlideSurface` from workers-app cases surfaces

**File:** `apps/workers-app/.../src/features/cases/surfaces.ts`

Same pattern. The `caseConversationSlide` variable already exists. Add:

```ts
export const preloadCaseConversationSlideSurface = caseConversationSlide.preload;
```

Place it alongside the existing `preloadCaseCreationSlideSurface` export line.

---

### Step 7 — Wire cases prefetch in both `use-tab-badge-counts.controller.ts`

After the changes in Steps 4–6, add prefetch wiring to both controller files.

Add imports:
```ts
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchOnCondition } from "@beyo/ui";
import { prefetchCasesData } from "@beyo/cases";
import { preloadCaseConversationSlideSurface } from "@/features/cases/surfaces";
```

Inside `useTabBadgeCountsController`, after the unread count and IDs are derived (from Step 4):

```ts
const queryClient = useQueryClient();

usePrefetchOnCondition(
  unreadCaseIds.length > 0,
  () =>
    Promise.all([
      preloadCaseConversationSlideSurface(),
      prefetchCasesData(queryClient, unreadCaseIds),
    ]),
);
```

This fires once when `unreadCaseIds` first becomes non-empty (i.e. on first data arrival). It preloads the conversation bundle and warms the case detail cache for every unread case simultaneously.

---

### Step 8 — Export preload functions from workers-app `task_steps/surfaces.ts`

**File:** `apps/workers-app/.../src/features/task_steps/surfaces.ts`

Both `taskStepActionsSheet` and `taskDetailSlide` already exist. Add exports:

```ts
export const preloadTaskStepActionsSheetSurface = taskStepActionsSheet.preload;
export const preloadTaskDetailSlideSurface = taskDetailSlide.preload;
```

Place them before `export const taskStepSurfaces`.

---

### Step 9 — Wire working-sections prefetch in workers-app home controller

The condition is: any section has `counts.paused + counts.working + counts.ended_shift > 0`.

**File:** `apps/workers-app/.../src/features/working_sections/controllers/use-working-sections-home.controller.ts`

Add imports:
```ts
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchOnCondition } from "@beyo/ui";
import { fetchWorkingSectionSteps } from "../../task_steps/api/fetch-working-section-steps";
import { taskStepKeys } from "../../task_steps/api/task-step-keys";
import { preloadTaskDetailSlideSurface } from "../../task_steps/surfaces";
```

Inside the controller, after `sections` is computed from `query.data`:

```ts
const queryClient = useQueryClient();

const activeSections = useMemo(
  () =>
    (query.data?.working_sections ?? []).filter(
      (s) =>
        s.task_steps_counts.paused +
          s.task_steps_counts.working +
          s.task_steps_counts.ended_shift >
        0,
    ),
  [query.data?.working_sections],
);

usePrefetchOnCondition(
  activeSections.length > 0,
  () =>
    Promise.all([
      preloadTaskDetailSlideSurface(),
      ...activeSections.map((s) =>
        queryClient.prefetchQuery({
          queryKey: taskStepKeys.sectionList({
            working_section_id: s.client_id,
            limit: 50,
            offset: 0,
          }),
          queryFn: () =>
            fetchWorkingSectionSteps({
              working_section_id: s.client_id,
              limit: 50,
              offset: 0,
            }),
          staleTime: 30_000,
        }),
      ),
    ]),
);
```

**Note:** `activeSections` is derived from `query.data.working_sections` (the raw API items), not the view-model `sections` array, to avoid going through the view-model transform for a non-UI concern. The `client_id` field is on `WorkerWorkingSection`.

---

### Step 10 — Migrate `task-creation/surfaces.ts` to `lazyWithPreload`

**File:** `apps/managers-app/.../src/features/task-creation/surfaces.ts`

The current file uses bare `lazy()`. This violates the rule in `30_dynamic_loading_local.md`: "Every surface registration in this app **must** use `lazyWithPreload`."

Replace the entire file:

```ts
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { lazyWithPreload } from "@beyo/ui";

export const TASK_CREATION_RETURN_SURFACE_ID = "task-creation-return-slide";
export const TASK_CREATION_PRE_ORDER_SURFACE_ID = "task-creation-pre-order-slide";
export const TASK_CREATION_INTERNAL_SURFACE_ID = "task-creation-internal-slide";

function loadReturnTaskSlidePage() {
  return import("@/pages/task-creation/ReturnTaskSlidePage").then((module) => ({
    default: module.ReturnTaskSlidePage,
  }));
}

function loadPreOrderTaskSlidePage() {
  return import("@/pages/task-creation/PreOrderTaskSlidePage").then((module) => ({
    default: module.PreOrderTaskSlidePage,
  }));
}

function loadInternalTaskSlidePage() {
  return import("@/pages/task-creation/InternalTaskSlidePage").then((module) => ({
    default: module.InternalTaskSlidePage,
  }));
}

const returnTaskSlide = lazyWithPreload(loadReturnTaskSlidePage);
const preOrderTaskSlide = lazyWithPreload(loadPreOrderTaskSlidePage);
const internalTaskSlide = lazyWithPreload(loadInternalTaskSlidePage);

export const preloadReturnTaskSlideSurface = returnTaskSlide.preload;
export const preloadPreOrderTaskSlideSurface = preOrderTaskSlide.preload;
export const preloadInternalTaskSlideSurface = internalTaskSlide.preload;

export const taskCreationSurfaces: SurfaceRegistrations = {
  [TASK_CREATION_RETURN_SURFACE_ID]: {
    surface: "slide",
    component: returnTaskSlide.Component,
  },
  [TASK_CREATION_PRE_ORDER_SURFACE_ID]: {
    surface: "slide",
    component: preOrderTaskSlide.Component,
  },
  [TASK_CREATION_INTERNAL_SURFACE_ID]: {
    surface: "slide",
    component: internalTaskSlide.Component,
  },
};
```

---

### Step 11 — Add `prefetchTaskCreationFormData()` to managers-app `task-creation` feature

**File:** `apps/managers-app/.../src/features/task-creation/lib/prefetch-task-creation-form-data.ts` (new file)

```ts
import type { QueryClient } from "@tanstack/react-query";
import { fetchItemCategoriesPicker } from "@/features/items/api/fetch-item-categories-picker";
import { itemCategoryPickerKeys } from "@/features/items/api/item-category-picker-keys";
import { fetchWorkingSectionsPicker } from "@/features/working-sections/api/fetch-working-sections-picker";
import { workingSectionKeys } from "@/features/working-sections/api/working-section-keys";

export async function prefetchTaskCreationFormData(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: itemCategoryPickerKeys.list(),
      queryFn: () => fetchItemCategoriesPicker(),
      staleTime: 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: workingSectionKeys.list(),
      queryFn: () => fetchWorkingSectionsPicker(),
      staleTime: 60_000,
    }),
  ]);
}
```

`staleTime: 60_000` (1 min) is used here because categories and sections are relatively stable reference data that rarely change mid-session.

---

### Step 12 — Wire task creation form data prefetch in all three FormContent components

All three form content components (`InternalFormContent`, `PreOrderFormContent`, `ReturnFormContent`) already hoist `usePreloadSurface` calls. Add data prefetch alongside them using the same hoisting pattern.

Add to each of the three files:

**New imports:**
```ts
import { useQueryClient } from "@tanstack/react-query";
import { usePrefetchOnCondition } from "@beyo/ui";
import { prefetchTaskCreationFormData } from "../lib/prefetch-task-creation-form-data";
```

**Inside the form content function body, alongside the existing `usePreloadSurface` calls:**
```ts
const queryClient = useQueryClient();
usePrefetchOnCondition(true, () => prefetchTaskCreationFormData(queryClient));
```

`condition: true` means "fire once on mount, unconditionally" — the form is already open by the time this component renders, so there is no condition to gate on. The `hasRun` guard inside `usePrefetchOnCondition` ensures it fires exactly once.

This applies to:
- `apps/managers-app/.../src/features/task-creation/components/InternalFormContent.tsx`
- `apps/managers-app/.../src/features/task-creation/components/PreOrderFormContent.tsx`
- `apps/managers-app/.../src/features/task-creation/components/ReturnFormContent.tsx`

---

### Step 13 — Preload all three task creation bundles from `TaskCreationFab`

`TaskCreationFab` mounts on the task list page and is the single entry point for all three task creation surfaces. When it mounts, all three form bundles should be in memory so opening any form is instant.

**File:** `apps/managers-app/.../src/features/task-creation/components/TaskCreationFab.tsx`

Add imports:
```ts
import { usePreloadSurface } from "@/hooks/use-preload-surface";
import {
  preloadInternalTaskSlideSurface,
  preloadPreOrderTaskSlideSurface,
  preloadReturnTaskSlideSurface,
} from "../surfaces";
```

Inside `TaskCreationFab`, before the return statement:
```ts
usePreloadSurface(preloadReturnTaskSlideSurface);
usePreloadSurface(preloadPreOrderTaskSlideSurface);
usePreloadSurface(preloadInternalTaskSlideSurface);
```

These three calls depend on the `lazyWithPreload` migration in Step 10. Without Step 10, the preload functions do not exist.

---

## Improvements and backend considerations

### 1. No backend change needed for cases signal (confirmed)

The user described needing "an endpoint that also brings the key of the case." The endpoint `GET /api/v1/cases/unread-counts` already fulfills this — the response map `{ "ca_01A": 4, "ca_01B": 1 }` has case IDs as its keys. The frontend needs to switch from the global total endpoint (`useGlobalCaseUnreadCountQuery`) to the per-case map endpoint (`useUnreadCountsQuery`) — which already exists in the codebase. No backend work is needed.

### 2. Improvement — Bulk case summary endpoint

**Current behavior:** `prefetchCasesData(queryClient, caseIds)` fires N parallel `GET /api/v1/cases/:id` requests (one per unread case). On a slow mobile connection with 5 unread cases, this is 5 concurrent HTTP requests.

**Improvement:** A bulk endpoint `GET /api/v1/cases?client_ids=ca_01,ca_02&include_messages=false` returning lightweight case summaries (no messages) would reduce this to 1 request. When implemented, `prefetchCasesData` can be updated to use it while maintaining the same query key structure (`caseKeys.detail(id)` per case after splitting the bulk response).

**Priority:** Medium. Current N-parallel approach is functional and fast for small unread counts (typical: 1–5).

### 3. Improvement — Bulk working-section steps endpoint

**Current behavior:** `prefetchWorkingSectionStepsData` fires one `GET /api/v1/working-sections/:id/steps` per qualifying section. With 3 active sections = 3 requests.

**Improvement:** A bulk endpoint or a modified `GET /api/v1/working-sections/me?include_steps=true` that returns sections with their first page of steps in one call would eliminate the waterfall.

**Priority:** Low. Workers typically have 1–3 sections; parallel requests are acceptable.

### 4. Improvement — `usePrefetchOnCondition` re-prefetch on session reset

The current `hasRun` guard fires once per component mount. If the component unmounts and remounts (e.g. user navigates away and back), the prefetch fires again — which is correct and desired. If the component stays mounted across the session and unread counts go from 0 → N → 0 → N, only the first transition fires the prefetch. For unread messages this is acceptable since the first prefetch covers the likely interaction. Document this in the contract extension (Step 2).

---

## Risks and mitigations

- Risk: `useUnreadCountsQuery` polls every 30s (staleTime). Switching from the global count to the per-case map changes the payload size.
  Mitigation: The per-case map is small (only cases with unread > 0 are returned). Payload difference is negligible for typical unread counts (1–10 cases).

- Risk: Prefetching N case details in parallel on app load increases initial network load.
  Mitigation: `prefetchQuery` uses the existing `staleTime`. If the cache is warm (user refreshed within 30s), the prefetch is a no-op. N is bounded by the number of unread cases, typically small.

- Risk: Working-section steps prefetch fires for multiple sections simultaneously, potentially saturating mobile network on app boot.
  Mitigation: Condition gates on `paused + working + ended_shift > 0` — sections with only `pending` steps are excluded. In practice, workers typically have 1–2 active sections. If saturation is observed, add a cap (e.g. prefetch at most 3 sections, ordered by `activeCount` descending).

- Risk: `task-creation/surfaces.ts` migration from `lazy()` to `lazyWithPreload()` — behavioral change.
  Mitigation: `lazyWithPreload` wraps `React.lazy()` and is identical in behavior when `.preload()` is never called. The migration is a drop-in replacement with zero behavioral change for the existing surface open flow. TypeScript will catch any import/type mismatches at build time.

---

## Validation plan

- `npm run typecheck` in `apps/managers-app`: zero TypeScript errors
- `npm run typecheck` in `apps/workers-app`: zero TypeScript errors
- `npm run typecheck` in `packages/cases`: zero TypeScript errors
- `npm run typecheck` in `packages/ui`: zero TypeScript errors
- Manual: Open app with unread cases → navigate to Cases tab → conversation slide should open instantly with no loading spinner
- Manual: Open workers app with active sections → navigate to a section → steps list should be instantly visible (no loading state)
- Manual: Open any task creation form in managers app → navigate to Assignment step → working sections picker should show immediately with no skeleton

---

## Review log

- `2026-05-30` Claude Sonnet 4.6: Plan authored. All target files and query keys verified against current implementation.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David (user approval)
