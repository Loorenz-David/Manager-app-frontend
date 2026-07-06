# PLAN_seller_home_items_ready_button_20260704

## Metadata

- Plan ID: `PLAN_seller_home_items_ready_button_20260704`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-07-04T00:00:00Z`
- Last updated at (UTC): `2026-07-04T07:53:36Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Create a `home` feature in the seller app with a `HomeView` component that renders a single "Items Ready (N)" button. The button displays the pending post-handling count and opens `TaskPostHandlingSlidePage` on tap.
- Business/user intent: Sellers need a dedicated home screen entry point to review and action pending post-handling tasks without any manager-only UI (upholstery, ordering, quick-assign boxes).
- Non-goals: Pre-orders / Returns quick-assign boxes; Select Upholstery and Ordering buttons; manager-specific role switching inside the view; any new surface registrations.

## Scope

- In scope:
  - `features/home/` feature skeleton — `types.ts`, `lib/`, `controllers/`, `providers/`, `components/`, `index.ts`
  - `usePostHandlingCountsQuery("pending")` wired through controller → context → view
  - "Items Ready (N)" button opening `TASK_POST_HANDLING_SLIDE_SURFACE_ID` with all required surface openers (mirrors manager `HomeView.tsx` but with `defaultTab: "pending"` fixed)
  - `pages/home/HomePage.tsx` updated to render `HomeViewProvider > HomeView`
- Out of scope:
  - Changes to `surface-registry.ts` (all required surfaces already registered)
  - Any new `@beyo/*` packages
  - Manager app changes
- Assumptions:
  - All surfaces opened from the "Items Ready" button are already registered in `surface-registry.ts` via `taskSurfaces`, `imageSurfaces`, and `taskCreationSurfaces`.
  - `preloadPinNotificationsSlideSurface` and `preloadTaskPostHandlingPendingWarningSheetSurface` are already exported from `@/features/tasks/surfaces`.
  - `CALENDAR_RANGE_PICKER_SURFACE_ID` is exported from `@beyo/task-creation` and registered in the seller app via `taskCreationSurfaces`.

## Clarifications required

(none — all required surfaces are registered, pattern mirrors the established manager `HomeView.tsx`)

## Acceptance criteria

1. `HomeView` renders an "Items Ready (N)" button where N is `postHandlingCounts.pending`; the label suffix is omitted while loading.
2. Tapping the button opens `TASK_POST_HANDLING_SLIDE_SURFACE_ID` with `defaultTab: "pending"` and all nested surface openers wired correctly.
3. `HomePage` wraps `HomeView` inside `HomeViewProvider`.
4. `npm run typecheck` reports zero TypeScript errors.

## Contracts and skills

### Contracts loaded

- `../architecture/01_architecture.md`: app-level folder structure and naming rules
- `../architecture/02_types.md`: type conventions
- `../architecture/05_server_state.md`: query hook pattern (`useQuery`, `queryKey`, `queryFn`)
- `../architecture/08_hooks.md`: controller aggregation — derives display values from queries; returns a typed view model
- `../architecture/15_feature_structure.md`: feature folder layout (`types`, `lib`, `controllers`, `providers`, `components`, `index.ts`)
- `../architecture/23_providers.md`: context provider shell — `createContext`, null guard, `useXxxContext`, `XxxProvider`
- `../architecture/28_surfaces.md`: surface opener pattern — `useSurface`, `surface.open(SURFACE_ID, props)`

### Local extensions loaded

- `../architecture/28_surfaces_local.md`: active surface types for this app are `slide`, `sheet`, `modal` — `drawer` is excluded

### File read intent — pattern vs. relational

Relational reads taken (understanding what already exists):
- `apps/managers-app/.../features/home/components/HomeView.tsx` — exact surface opener shape and count derivation for the "Items Ready" button
- `apps/managers-app/.../features/home/controllers/use-home-view.controller.ts` — baseline controller structure to mirror
- `apps/managers-app/.../features/home/providers/HomeViewProvider.tsx` — context shell to mirror
- `apps/selleres-app/.../features/tasks/surfaces.ts` — verified which surface IDs and preload helpers are exported
- `packages/tasks/src/api/use-post-handling-counts-query.ts` — confirmed `usePostHandlingCountsQuery(postHandlingStates?: string)` signature
- `packages/tasks/src/api/get-post-handling-counts.ts` — confirmed `PostHandlingCounts.pending: number | undefined`
- `apps/managers-app/.../features/pending-upholstery/lib/format-compact-count.ts` — copied utility implementation
- `packages/tasks/src/surface-ids.ts` — confirmed `openCalendarRangePicker` is optional in `TaskPostHandlingSlideSurfaceProps`

Prohibited pattern reads not taken: no unrelated action hooks, query hooks, or providers opened to understand how-to-write patterns.

### Skill selection

- Primary skill: `16_feature_workflow.md` (feature build order: types → query keys → api/hooks → controllers → providers → components → pages → public API)
- Excluded alternatives: none

## Implementation plan

All paths are relative to `apps/selleres-app/ManagerBeyo-app-sellers/src/`.

---

### Step 1 — CREATE `features/home/types.ts`

```ts
export type HomeState = {
  postHandlingCount: number | null;
  postHandlingCountLabel: string;
};
```

---

### Step 2 — CREATE `features/home/lib/format-compact-count.ts`

```ts
export function formatCompactCount(count: number): string {
  if (count < 1000) return String(count);
  return `${Math.round(count / 100) / 10}k`;
}
```

---

### Step 3 — CREATE `features/home/controllers/use-home-view.controller.ts`

```ts
import { usePostHandlingCountsQuery } from "@beyo/tasks";

import { formatCompactCount } from "../lib/format-compact-count";
import type { HomeState } from "../types";

export type HomeViewController = HomeState;

export function useHomeViewController(): HomeViewController {
  const postHandlingCountsQuery = usePostHandlingCountsQuery("pending");

  const postHandlingCount =
    postHandlingCountsQuery.data?.pending ?? null;

  const postHandlingCountLabel =
    postHandlingCount !== null
      ? ` (${formatCompactCount(postHandlingCount)})`
      : "";

  return { postHandlingCount, postHandlingCountLabel };
}
```

---

### Step 4 — CREATE `features/home/providers/HomeViewProvider.tsx`

Standard context shell following `23_providers.md`:

```tsx
import { createContext, useContext, type ReactNode } from "react";

import {
  useHomeViewController,
  type HomeViewController,
} from "../controllers/use-home-view.controller";

const HomeViewContext = createContext<HomeViewController | null>(null);

type Props = { children: ReactNode };

export function useHomeViewContext(): HomeViewController {
  const context = useContext(HomeViewContext);
  if (context === null) {
    throw new Error("useHomeViewContext must be used inside HomeViewProvider");
  }
  return context;
}

export function HomeViewProvider({ children }: Props): React.JSX.Element {
  const controller = useHomeViewController();
  return (
    <HomeViewContext.Provider value={controller}>
      {children}
    </HomeViewContext.Provider>
  );
}
```

---

### Step 5 — CREATE `features/home/components/HomeView.tsx`

- Consume `useHomeViewContext()` for `postHandlingCountLabel`
- Call `useSurface()` from `@/hooks/use-surface`
- Define `openTaskPostHandlingSurface()` mirroring the manager's `HomeView.tsx` exactly, with `defaultTab: "pending"` hard-coded (no role switch needed — this is always the seller app)
- Use `satisfies TaskPostHandlingSlideSurfaceProps` for compile-time prop shape validation
- Import surface IDs, prop types, and preloaders from `@/features/tasks/surfaces`
- Import `IMAGE_VIEWER_SURFACE_ID`, `type ImageLinkEntityType`, `type ImageViewModel` from `@beyo/images`
- Import `CALENDAR_RANGE_PICKER_SURFACE_ID` from `@beyo/task-creation`
- Import `PostHandlingIcon` from `@beyo/tasks`

```tsx
import { type ImageLinkEntityType, type ImageViewModel, IMAGE_VIEWER_SURFACE_ID } from "@beyo/images";
import { CALENDAR_RANGE_PICKER_SURFACE_ID } from "@beyo/task-creation";
import { PostHandlingIcon } from "@beyo/tasks";

import { useSurface } from "@/hooks/use-surface";
import {
  preloadPinNotificationsSlideSurface,
  preloadTaskPostHandlingPendingWarningSheetSurface,
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID,
  TASK_POST_HANDLING_SLIDE_SURFACE_ID,
  type TaskPostHandlingPendingWarningSheetSurfaceProps,
  type TaskPostHandlingSlideSurfaceProps,
} from "@/features/tasks/surfaces";

import { useHomeViewContext } from "../providers/HomeViewProvider";

export function HomeView(): React.JSX.Element {
  const { postHandlingCountLabel } = useHomeViewContext();
  const surface = useSurface();

  function openTaskPostHandlingSurface(): void {
    surface.open(TASK_POST_HANDLING_SLIDE_SURFACE_ID, {
      defaultTab: "pending",
      surfaceOpeners: {
        closeSurface: () => surface.close(TASK_POST_HANDLING_SLIDE_SURFACE_ID),
        openTaskDetail: (taskId) =>
          surface.open(TASK_DETAIL_SURFACE_ID, { taskId }),
        openTaskActions: (taskId, itemId) => {
          preloadPinNotificationsSlideSurface();
          surface.open(TASK_ACTIONS_SHEET_SURFACE_ID, { taskId, itemId });
        },
        openImageViewer: (taskId, itemClientId, images) => {
          if (!images.length) return;
          const viewModels: ImageViewModel[] = images.map((img, index) => ({
            clientId: img.client_id,
            linkClientId: null,
            entityType: "item" as ImageLinkEntityType,
            entityClientId: itemClientId ?? taskId,
            imageUrl: img.image_url,
            localObjectUrl: null,
            displayOrder: index,
            widthPx: null,
            heightPx: null,
            fileSizeBytes: null,
            createdAt: null,
            uploadState: "completed",
            isOptimistic: false,
            isDeleted: false,
            pendingUploadClientId: null,
            uploadError: null,
            annotation: null,
            annotations: [],
          }));
          surface.open(IMAGE_VIEWER_SURFACE_ID, {
            images: viewModels,
            initialImageClientId: viewModels[0].clientId,
            entityType: "item",
            entityClientId: itemClientId ?? taskId,
            mode: "preview-only",
          });
        },
        openPendingWarning: (props) => {
          surface.open(
            TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID,
            props satisfies TaskPostHandlingPendingWarningSheetSurfaceProps,
          );
        },
        openCalendarRangePicker: (props) => {
          surface.open(CALENDAR_RANGE_PICKER_SURFACE_ID, props);
        },
        preloadPendingWarningSheet:
          preloadTaskPostHandlingPendingWarningSheetSurface,
      },
    } satisfies TaskPostHandlingSlideSurfaceProps);
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-10">
      <h1 className="text-2xl font-bold">Home</h1>
      <button
        className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3.5 text-left text-lg font-medium text-primary shadow-sm disabled:opacity-50"
        data-testid="home-post-handling-box"
        type="button"
        onClick={openTaskPostHandlingSurface}
      >
        <span>Items Ready{postHandlingCountLabel}</span>
        <div className="ml-auto flex">
          <PostHandlingIcon aria-hidden="true" className="size-8 shrink-0" />
        </div>
      </button>
    </div>
  );
}
```

---

### Step 6 — CREATE `features/home/index.ts`

```ts
export { HomeView } from "./components/HomeView";
export { HomeViewProvider } from "./providers/HomeViewProvider";
```

---

### Step 7 — MODIFY `pages/home/HomePage.tsx`

Replace the placeholder with:

```tsx
import { HomeView, HomeViewProvider } from "@/features/home";

export function HomePage(): React.JSX.Element {
  return (
    <HomeViewProvider>
      <HomeView />
    </HomeViewProvider>
  );
}
```

## Risks and mitigations

- Risk: `formatCompactCount` is duplicated from the manager app's `pending-upholstery` feature.
  Mitigation: Acceptable — the function is three lines and trivial. No cross-app package extraction is warranted at this stage.
- Risk: `openImageViewer` shape in `TaskPostHandlingSlideSurfaceProps` drifts from what `ImageViewModel` expects.
  Mitigation: `satisfies TaskPostHandlingSlideSurfaceProps` catches this at compile time. The shape is copied verbatim from the manager `HomeView.tsx` which already passes typecheck.
- Risk: `openCalendarRangePicker` prop shape may evolve in `@beyo/task-creation`.
  Mitigation: `openCalendarRangePicker` is optional in `TaskPostHandlingSlideSurfaceProps`; passing the raw `props` argument through is type-safe.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual (seller app, home tab): "Items Ready (N)" button is visible with the pending count loaded from `/api/v1/tasks/post-handling/counts?post_handling_states=pending`
- Manual: tap button → `TaskPostHandlingSlidePage` opens on the "pending" tab
- Manual: count label is absent while the query is loading and present once resolved

## Review log

(none yet)

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
