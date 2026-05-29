# PLAN_29_case_creation_slide_entry_20260529

## Metadata

- Plan ID: `PLAN_29_case_creation_slide_entry_20260529`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Last updated at (UTC): `2026-05-29T10:53:58Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/case_creation.md`

## Goal and intent

- Goal: Add a case creation entry point — a `slide` surface in the `@beyo/cases` package — reachable by tapping a new icon button in `TaskStepDetailHeader` (right of the `StatePill`).
- Business/user intent: Workers need a fast path to open a case while reviewing a task step, without leaving the task detail slide.
- Non-goals: Form fields, validation, API mutation, case linking — all deferred. This plan delivers only the empty scaffold: surface registration, routing, route entry, and the trigger button.

## Scope

- In scope:
  - `CASE_CREATION_SLIDE_SURFACE_ID` and `CaseCreationSlideSurfaceProps` added to `packages/cases/src/surface-ids.ts`
  - `CaseCreationView` — minimal placeholder component in `packages/cases/src/components/CaseCreationView.tsx`
  - `CaseCreationRouteEntry` — thin route entry in `packages/cases/src/components/CaseCreationRouteEntry.tsx`
  - Public API exports in `packages/cases/src/index.ts`
  - `ROUTES.caseCreation` constant and `buildCaseCreationRoute()` helper in workers app `lib/routes.ts`
  - `CaseCreationSlidePage` wrapper in workers app `pages/cases/CaseCreationSlidePage.tsx`
  - Surface registration in workers app `features/cases/surfaces.ts` (using `lazyWithPreload`)
  - Route in workers app `app/router.tsx`
  - `handleOpenCaseCreation` on `TaskStepDetailController` (type + implementation)
  - `MessageSquareMore` icon button in `TaskStepDetailHeader` (between `StatePill` and `ThreeDotIcon`)
- Out of scope:
  - Form fields, mutation, error handling — deferred
  - Linking the created case to a task — deferred
  - Preloading the surface on task detail open — deferred
  - Playwright tests — deferred to follow-up plan once form is in place
- Assumptions:
  - `@beyo/cases` is already a workspace package consumed by the workers app (`package.json` and `tsconfig` wiring already in place).
  - `lazyWithPreload` is imported from `@beyo/ui` in surfaces files (confirmed in existing `features/cases/surfaces.ts` and `features/task_steps/surfaces.ts`).
  - Slide surfaces always receive a `path` in this app (`28_surfaces_local.md`).

## Clarifications required

- [ ] Should the case icon button be hidden or disabled when the task step is in a terminal state (`completed`, `cancelled`, `skipped`, `failed`)? — Determines whether the `handleOpenCaseCreation` guard reads `isStepTerminal`.
- [ ] Are any surface props required by the creation page now (e.g., `taskClientId` for future linking)? — Determines whether `CaseCreationSlideSurfaceProps` stays empty or carries optional entity context from the start.

## Acceptance criteria

1. Tapping the `MessageSquareMore` button in `TaskStepDetailHeader` opens a right-to-left slide surface.
2. The slide surface renders a placeholder screen with `data-testid="case-creation-view"`.
3. Navigating directly to `/cases/new` renders the same view as a full page (no surface chrome).
4. `npm run typecheck` passes with zero errors across the monorepo.
5. `npm run build` succeeds for the workers app.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md` + `01_architecture_local.md`: monorepo structure, package boundary rules, `route-entry.tsx` pattern for primary tab routes
- `architecture/02_types.md`: Zod schema + TypeScript type authoring rules
- `architecture/07_components.md`: feature component structure, `data-testid` conventions, context-only consumption rule
- `architecture/08_hooks.md`: controller hook shape; action hooks are data-only; surface calls belong in controllers
- `architecture/10_pages.md`: page wrapper conventions, `Suspense` + skeleton fallback pattern
- `architecture/11_routing.md`: `createBrowserRouter` structure, `lazyRoute` usage, route constant pattern
- `architecture/15_feature_structure.md`: package and feature folder layout
- `architecture/16_feature_workflow.md`: build order — Types → API → Actions → Controllers → Providers → Components → Pages → Routes
- `architecture/23_providers.md`: provider + context shell pattern (route entry wires provider around view)
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: surface types (`slide`, `sheet`, `modal`); `slide` always has URI; `lazyWithPreload` required; surface IDs and props live in the package's `surface-ids.ts`
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload` from `@beyo/ui`; bare `React.lazy()` prohibited for surfaces; `preload` export pattern
- `architecture/35_shared_packages.md`: shared package conventions — raw TypeScript source, no `dist/`, peer dependencies, `index.ts` barrel exports only public API

### Local extensions loaded

- `28_surfaces_local.md`: `slide` replaces `drawer`; surface types are `slide | sheet | modal`; `SURFACE_SHELLS` uses `SlidePageSurface`
- `30_dynamic_loading_local.md`: `lazyWithPreload` lives in `@beyo/ui` (not `@/utils/`); surfaces file exports `preload*` function for external callers; `usePreloadSurface` available from `@beyo/hooks`
- `01_architecture_local.md`: `route-entry.tsx` pattern governs how packages expose mountable surfaces to apps

### File read intent — pattern vs. relational

Prohibited (pattern reads — already covered by contracts above):
- Reading another surface registration file to understand `lazyWithPreload` shape → `30_dynamic_loading_local.md`
- Reading another provider to understand context shell → `23_providers.md`
- Reading another route entry to understand provider-wrapping pattern → `01_architecture_local.md`

Permitted (relational reads — understanding what exists):
- `packages/cases/src/surface-ids.ts` — to see existing surface IDs and avoid name collision ✓ (read)
- `packages/cases/src/index.ts` — to know what is already exported ✓ (read)
- `packages/cases/src/types.ts` — to confirm `CASE_LINK_ENTITY_TYPE` values for future props ✓ (read)
- `apps/workers-app/.../features/task_steps/surface-ids.ts` — to confirm existing IDs ✓ (read)
- `apps/workers-app/.../features/task_steps/controllers/use-task-step-detail.controller.ts` — to know `TaskStepDetailController` shape and confirm import pattern for cross-feature surface IDs ✓ (read)
- `apps/workers-app/.../features/task_steps/components/detail/TaskStepDetailHeader.tsx` — to understand exact DOM structure for button placement ✓ (read)
- `apps/workers-app/.../lib/routes.ts` — to confirm route constant pattern ✓ (read)
- `apps/workers-app/.../app/router.tsx` — to confirm route registration pattern ✓ (read)
- `apps/workers-app/.../app/surface-registry.ts` — to confirm `caseSurfaces` is already spread ✓ (read)
- `apps/workers-app/.../features/cases/surfaces.ts` — to understand existing case surface registration ✓ (read)

### Skill selection

- Primary skill: none — this is a new feature scaffold, no existing skill applies
- Trigger terms: `surface`, `slide`, `lazyWithPreload`, `route-entry`
- Excluded alternatives: none

## Domain schemas consulted

- `packages/cases/src/types.ts`: `CASE_LINK_ENTITY_TYPE = ["task", "customer"]`, `CreateCaseInput = { client_id, case_type_id?, type_label? }` — referenced for future props design; not used in this plan's scope.

## Selected contracts summary

```
Core:            01, 01_local, 02, 07, 08, 10, 11, 15, 16, 23
Goal bundle:     new feature (CRUD) — partial; forms/dto/tests deferred
Trigger:         28, 28_local (surface/slide), 30, 30_local (lazyWithPreload)
Shared packages: 35
Excluded:        09_forms (no form), 24_dto (no view model), 17_testing, 34_runtime_validation (deferred)
```

## Implementation plan

Steps follow `16_feature_workflow.md` build order. Since there is no mutation in this scope, Steps 2 (query keys) and 3 (API / query hooks) and 4 (action hooks) are skipped.

---

### Step 1 — Surface ID and props type (`packages/cases/src/surface-ids.ts`)

Add to the **bottom** of the file (do not modify existing IDs):

```ts
export const CASE_CREATION_SLIDE_SURFACE_ID = "case-creation-slide";

export type CaseCreationSlideSurfaceProps = Record<string, never>;
```

`CaseCreationSlideSurfaceProps` is intentionally empty for this phase. When task-linking props are added, only the type needs to expand — the surface ID string stays stable.

---

### Step 2 — Placeholder view (`packages/cases/src/components/CaseCreationView.tsx`)

```tsx
export function CaseCreationView(): React.JSX.Element {
  return (
    <div
      className="flex h-full flex-col bg-background"
      data-testid="case-creation-view"
    >
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">New case</p>
      </div>
    </div>
  );
}
```

No controller, no provider — pure placeholder. This file grows in the next plan when the form is added.

---

### Step 3 — Route entry (`packages/cases/src/components/CaseCreationRouteEntry.tsx`)

```tsx
import { CaseCreationView } from "./CaseCreationView";

export function CaseCreationRouteEntry(): React.JSX.Element {
  return <CaseCreationView />;
}
```

No provider needed for the empty page. When the creation form controller is added, wrap here:
`<CaseCreationProvider> <CaseCreationView /> </CaseCreationProvider>`.

---

### Step 4 — Public API export (`packages/cases/src/index.ts`)

Append these exports (keep existing exports untouched):

```ts
export { CaseCreationRouteEntry } from "./components/CaseCreationRouteEntry";
export {
  CASE_CREATION_SLIDE_SURFACE_ID,
} from "./surface-ids";
export type { CaseCreationSlideSurfaceProps } from "./surface-ids";
```

---

### Step 5 — Route constant (`apps/workers-app/.../lib/routes.ts`)

Add to the `ROUTES` object:

```ts
caseCreation: "/cases/new",
```

Add builder function after the existing `buildCaseConversationRoute`:

```ts
export function buildCaseCreationRoute(): string {
  return ROUTES.caseCreation;
}
```

`/cases/new` must be declared before `/cases/:caseId` in the router to prevent the dynamic segment from matching the literal string `"new"`.

---

### Step 6 — App page wrapper (`apps/workers-app/.../pages/cases/CaseCreationSlidePage.tsx`)

```tsx
import { CaseCreationRouteEntry } from "@beyo/cases";

export function CaseCreationSlidePage(): React.JSX.Element {
  return <CaseCreationRouteEntry />;
}
```

No `useSurfaceProps` needed while `CaseCreationSlideSurfaceProps` is empty. When props are added, read them here and pass to the route entry.

---

### Step 7 — Surface registration (`apps/workers-app/.../features/cases/surfaces.ts`)

Add alongside the existing registrations:

```ts
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,          // ← new
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  type CaseConversationSurfaceProps,
} from "@beyo/cases";

import { buildCaseConversationRoute, buildCaseCreationRoute } from "@/lib/routes";  // ← add buildCaseCreationRoute

// ... existing loaders ...

function loadCaseCreationSlidePage() {
  return import("@/pages/cases/CaseCreationSlidePage").then((module) => ({
    default: module.CaseCreationSlidePage,
  }));
}

// ... existing lazyWithPreload calls ...

const caseCreationSlide = lazyWithPreload(loadCaseCreationSlidePage);

export const preloadCaseCreationSlideSurface = caseCreationSlide.preload;

export const caseSurfaces: SurfaceRegistrations = {
  [CASE_CONVERSATION_SURFACE_ID]: { ... },          // unchanged
  [CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID]: { ... }, // unchanged
  [CASE_CREATION_SLIDE_SURFACE_ID]: {               // ← new
    surface: "slide",
    path: () => buildCaseCreationRoute(),
    component: caseCreationSlide.Component,
  },
};
```

`path` is required for `slide` surfaces per `28_surfaces_local.md`. The surface registry already spreads `caseSurfaces` in `surface-registry.ts` — no change needed there.

---

### Step 8 — Router route (`apps/workers-app/.../app/router.tsx`)

Add **before** the `caseConversation` route (so `/cases/new` is matched before `/cases/:caseId`):

```tsx
{
  path: ROUTES.caseCreation,
  element: lazyRoute(() =>
    import("@/pages/cases/CaseCreationSlidePage").then((module) => ({
      default: module.CaseCreationSlidePage,
    })),
  ),
},
```

---

### Step 9 — Controller handler (`apps/workers-app/.../features/task_steps/controllers/use-task-step-detail.controller.ts`)

**Type additions to `TaskStepDetailController`:**

```ts
handleOpenCaseCreation: () => void;
```

**Import addition** (alongside existing `@beyo/cases` import if present, or new):

```ts
import {
  CASE_CREATION_SLIDE_SURFACE_ID,
} from "@beyo/cases";
```

**Implementation** (alongside existing `handleOpenActionsSheet`):

```ts
const handleOpenCaseCreation = useCallback(() => {
  openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {});
}, [openSurface]);
```

**Return object addition:**

```ts
handleOpenCaseCreation,
```

The import of `CASE_CREATION_SLIDE_SURFACE_ID` from `@beyo/cases` follows the same pattern already used for `IMAGE_VIEWER_SURFACE_ID` from `@beyo/images` in this controller.

---

### Step 10 — Icon button in header (`apps/workers-app/.../features/task_steps/components/detail/TaskStepDetailHeader.tsx`)

**Import addition:**

```ts
import { Calendar, ChevronLeft, MessageSquareMore, RotateCcw, ShoppingBag, Wrench } from "lucide-react";
```

**Context destructure addition:**

```ts
const { vm, handleOpenActionsSheet, handleOpenCaseCreation } = useTaskStepDetailContext();
```

**Button placement** — insert between `<StatePill>` and the existing `ThreeDotIcon` button, inside the `flex items-center gap-2` row:

```tsx
<StatePill
  label={humanizeSnakeCase(vm.state) || vm.state}
  variant={STEP_STATE_VARIANT[vm.state]}
/>

{/* new */}
<button
  type="button"
  aria-label="Open case creation"
  className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
  data-testid="task-step-detail-open-case-creation"
  onClick={handleOpenCaseCreation}
>
  <MessageSquareMore className="size-4" />
</button>

<button
  type="button"
  aria-label="Task actions"
  className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground"
  onClick={handleOpenActionsSheet}
>
  <ThreeDotIcon />
</button>
```

The button style matches the existing `ThreeDotIcon` button exactly (`size-7`, `rounded-full`, `text-muted-foreground`) for visual consistency.

---

## Risks and mitigations

- Risk: `/cases/new` route is registered after `/cases/:caseId` — React Router matches the dynamic segment first, causing a 404 or wrong page for the creation route.
  Mitigation: Step 8 explicitly places `caseCreation` **before** `caseConversation` in the router children array.

- Risk: `CaseCreationSlideSurfaceProps` starts empty and becomes a breaking change when props are added later (callers pass `{}` today, future callers will pass `{ taskClientId }`).
  Mitigation: Type it as `Record<string, never>` today so any spread of `{}` is valid; when expanding, widen to an interface with optional fields — no breaking change.

- Risk: `caseSurfaces` spread in `surface-registry.ts` already picks up new registrations automatically — but if the file import fails at runtime, the slide surface will be missing from the registry silently.
  Mitigation: `npm run typecheck` catches import errors; Step 8 router route provides a direct URL fallback.

## Validation plan

- `npm run typecheck` from `frontend/`: zero TypeScript errors across all packages and apps
- `npm run build` for workers app: bundle succeeds, no missing module errors
- Manual smoke test: open task detail slide → tap `MessageSquareMore` → case creation slide opens → placeholder text "New case" visible
- Manual smoke test: navigate directly to `/cases/new` → same placeholder renders as a full page

## Review log

_(empty — awaiting first review)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
