# PLAN_primary_nav_features_scaffold_20260519

## Metadata

- Plan ID: `PLAN_primary_nav_features_scaffold_20260519`
- Status: `archived`
- Owner agent: `codex-gpt-5`
- Created at (UTC): `2026-05-19T00:00:00Z`
- Last updated at (UTC): `2026-05-19T18:52:19Z`
- Related issue/ticket: `—`
- Intention plan: `—`

---

## Goal and intent

- **Goal:** Scaffold five primary feature verticals (`home`, `tasks`, `cases`, `stats`, `settings`) following the full `01_architecture.md` folder structure, wire them as lazy routes, connect them to a refactored five-tab `BottomTabBar`, and implement a directional carousel transition (`TabOutlet`) so navigating between tabs slides the pages horizontally in the direction of the tapped tab's position on the nav bar.
- **User intent:** Establish the final primary navigation skeleton before any real business logic lands. Every primary feature must have its architecture folder structure in place so future feature work can plug directly into the correct layer without restructuring.
- **Non-goals:** Any real domain data, API calls, TanStack Query hooks, mutations, forms, or Zod schemas. These features are scaffolds only. Auth integration beyond the current DEV-passthrough guard. Playwright tests.

---

## Scope

- **In scope:**
  - Five feature verticals: `home`, `tasks`, `cases`, `stats`, `settings`. Each gets: `controllers/`, `providers/`, `components/`, `types.ts`, `index.ts`. No `api/` or `actions/` folders — those are created when the first real endpoint lands per feature.
  - Five matching page files in `src/pages/<feature>/`.
  - Five routes (`/`, `/tasks`, `/cases`, `/stats`, `/settings`), all lazy-loaded, all protected behind `ProtectedRoute`.
  - A `TabOutlet` component in `src/app/` that wraps `<Outlet>` with `AnimatePresence` and a direction-aware horizontal slide variant.
  - A refactored `BottomTabBar` with five tabs in the order `[tasks, cases, home, stats, settings]` that computes slide direction and passes it via React Router `location.state`.
  - A `tab` transition token added to `src/lib/animation.ts`.
  - `ROUTES` constant extended with the four new paths.
  - Old `src/pages/HomePage.tsx` deleted; replaced by `src/pages/home/HomePage.tsx`.

- **Out of scope:**
  - A new Surface Manager surface type — the carousel is primary navigation, not an overlay. It lives at the `AppShell` level and is NOT registered in `surface-registry.ts`.
  - `api/` and `actions/` folders inside any feature — added when real endpoints exist.
  - `surfaces.ts` inside any feature — added when the first surface registration is needed.
  - Gesture-driven swipe detection — only tap-driven for now.
  - Active-tab highlight beyond simple text color change.

- **Assumptions:**
  - The `SurfaceProvider.tsx` null-guard bug was already fixed; `AnimatePresence` always renders.
  - `ProtectedRoute` is permissive in DEV — no auth blocker.
  - Safe-area CSS custom properties (`--safe-top`, `--safe-bottom`) from `PLAN_pwa_mobile_root_scroll_lock_20260519` are applied. If not, the AppShell step still works — safe-area classes resolve to `0px` on desktop.
  - The `test_feature` code remains untouched. The old `pages/HomePage.tsx` (which renders `TestSurfaceProvider + TestLauncher`) is deleted and the `home` feature takes over `/`. The test surfaces remain in `surface-registry.ts` for manual testing.

---

## Clarifications required

*(None — all decisions resolved in this plan.)*

---

## Acceptance criteria

1. Navigating to `/` shows a page with a large "Home" heading.
2. Five tabs appear at the bottom in the order: **Tasks · Cases · Home · Stats · Settings**.
3. Tapping **Cases** from Home: Home slides out to the RIGHT, Cases slides in from the LEFT (Cases is left of Home in the nav).
4. Tapping **Tasks** from Cases: Cases slides out to the RIGHT, Tasks slides in from the LEFT.
5. Tapping **Stats** from Tasks: Tasks slides out to the LEFT, Stats slides in from the RIGHT (Stats is right of Tasks).
6. Tapping **Cases** from Stats: Stats slides out to the RIGHT, Cases slides in from the LEFT.
7. Tapping **Settings** from Cases: Cases slides out to the LEFT, Settings slides in from the RIGHT.
8. Tapping the currently active tab does nothing (no re-navigation, no animation).
9. The active tab label is visually distinct from inactive tabs.
10. On first app load, the Home page renders with NO slide-in animation (direct render).
11. Each feature page renders its feature name as an `<h1>` heading.
12. `npm run typecheck`: zero errors.
13. `npm run build`: clean.

---

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: folder structure, hard dependency rules, layer map, provider/controller/component chain
- `architecture/11_routing.md`: lazy route helper, React Router 6 data router, `lazyRoute()` usage
- `architecture/15_feature_structure.md`: feature public API convention, `index.ts` exports
- `architecture/23_providers.md`: context/provider boundary, controller → provider → component chain
- `architecture/07_components.md`: feature component rules — consumes context only, no logic-layer imports
- `architecture/31_animations.md`: Framer Motion `AnimatePresence`, `variants`, `custom` prop, exit animation rules
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md`: confirms that the tab carousel is NOT a surface — surfaces are overlays registered in `surface-registry.ts`; the tab carousel is primary route-level navigation handled at `AppShell` level

### Local extensions loaded

- `architecture/28_surfaces_local.md`: surface types for this app; confirms `page` is the surface type for primary route pages; tab carousel uses the `page` type route system, not the overlay surface system

### File read intent — pattern vs. relational

Permitted relational reads before coding:
- `src/lib/animation.ts` — to see the exact `transitions` and `easings` object before adding `tab` token
- `src/app/AppShell.tsx` — to see exact className before updating to `TabOutlet`
- `src/app/router.tsx` — to see current route tree before inserting five new lazy routes
- `src/lib/routes.ts` — to see current `ROUTES` before extending
- `src/components/shell/BottomTabBar.tsx` — to see current nav structure before full refactor
- `src/pages/HomePage.tsx` — to confirm it can be deleted safely before deleting

Prohibited:
- Reading other feature folders' controllers/providers to understand the pattern → `architecture/23_providers.md` defines it
- Reading another animation component to understand `AnimatePresence` custom prop → `architecture/31_animations.md` defines it

### Domain grounding rule note

These are infrastructure scaffolds with no domain data — the feature pages render only their feature name. No planning tables are required. When the first real feature logic is added to any of these features, the applicable planning table MUST be consulted before naming any entity, field, or type.

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`
- Trigger terms: `feature`, `scaffold`, `routes`, `tab`, `animation`, `carousel`

---

## Architecture decision: why the tab carousel is NOT a Surface Manager surface

The Surface Manager (`SurfaceProvider` + `surface-registry.ts`) governs **overlays** that sit on top of the primary view: slides, sheets, and modals. These have:
- An `open(id)` / `close(id)` lifecycle driven by `useSurface()`
- Optional URI integration
- A z-index stack above the primary content

The primary tab navigation is the **opposite**:
- It IS the primary view — nothing sits below it
- Its lifecycle is driven by `useNavigate()` + React Router, not `useSurface()`
- It has no z-index stacking
- Direction is determined by relative tab position, not by a registration prop

Therefore: the tab carousel is implemented as a `TabOutlet` component at the `AppShell` level. It is invisible to the Surface Manager. The `SurfaceType` union is NOT extended with a `tab` type.

---

## Implementation plan

### Part A — Animation token

**Step 1 — Add `tab` transition to `src/lib/animation.ts`**

Append a `tab` entry to the `transitions` object. The tab carousel uses the same duration as `slide` but applies `easings.standard` (linear ease-in-out) to feel responsive and immediate, not springy.

```ts
// ADD to transitions object:
tab: {
  duration: durations.slide,   // 0.24s — same as push slide
  ease: easings.standard,      // [0.2, 0, 0, 1] — smooth, non-bouncy
},
```

Also export the tab direction variants that `TabOutlet` will import:

```ts
export const tabVariants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? '100%' : '-100%',
  }),
  center: {
    x: 0,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
  }),
} as const;
```

**Direction contract:**
| direction value | tapped tab relative to current | entering page | exiting page |
|---|---|---|---|
| `1` | to the RIGHT (higher index) | enters from RIGHT (`x: 100%`) | exits to LEFT (`x: -100%`) |
| `-1` | to the LEFT (lower index) | enters from LEFT (`x: -100%`) | exits to RIGHT (`x: 100%`) |
| `0` | same tab (never fires; `initial={false}`) | no animation | no animation |

---

### Part B — Routes constant

**Step 2 — Extend `src/lib/routes.ts`**

```ts
// AFTER
export const ROUTES = {
  signIn: '/sign-in',
  home: '/',
  tasks: '/tasks',
  cases: '/cases',
  stats: '/stats',
  settings: '/settings',
} as const;

export const TAB_ORDER = [
  ROUTES.tasks,
  ROUTES.cases,
  ROUTES.home,
  ROUTES.stats,
  ROUTES.settings,
] as const;

export type TabPath = (typeof TAB_ORDER)[number];
```

`TAB_ORDER` is the single source of truth for the visual left-to-right order of tabs on the nav bar. `BottomTabBar` and any future swipe gesture handler import this array to compute slide direction. Indices: tasks=0, cases=1, home=2, stats=3, settings=4.

---

### Part C — `TabOutlet` component

**Step 3 — Create `src/app/TabOutlet.tsx`**

`TabOutlet` replaces the plain `<Outlet>` in `AppShell`. It reads `direction` from `location.state` and drives `AnimatePresence` + `m.div` with the `tabVariants` above.

```tsx
import { m, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { tabVariants, transitions } from '@/lib/animation';

type LocationState = { direction?: number } | null;

export function TabOutlet(): React.JSX.Element {
  const location = useLocation();
  const direction = (location.state as LocationState)?.direction ?? 0;

  return (
    <AnimatePresence custom={direction} initial={false}>
      <m.div
        key={location.pathname}
        custom={direction}
        variants={tabVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transitions.tab}
        className="absolute inset-0 overflow-y-auto"
      >
        <Outlet />
      </m.div>
    </AnimatePresence>
  );
}
```

**Critical notes:**
- `initial={false}` on `AnimatePresence`: prevents the initial render of Home from animating in. On first app load the page appears directly with no slide.
- `absolute inset-0` on `m.div`: both the entering and exiting pages are positioned over the same area. This allows both to be visible simultaneously (carousel, not sequential).
- The parent container in `AppShell` must be `position: relative; overflow: hidden` so the exiting page is clipped when it slides out of bounds (see Step 5).
- `key={location.pathname}`: `AnimatePresence` tracks by key. When the pathname changes, the old `m.div` exits and the new one enters.
- `custom` on both `AnimatePresence` (for the exiting clone) and the `m.div` (for the entering element): Framer Motion requires `custom` on `AnimatePresence` to pass the correct value to the exiting element's variants.

---

### Part D — `BottomTabBar` refactor

**Step 4 — Rewrite `src/components/shell/BottomTabBar.tsx`**

The tab bar must:
1. Render five tabs in `TAB_ORDER` sequence.
2. Highlight the active tab.
3. On tap: compute direction from relative tab position, then navigate with `{ state: { direction } }`.
4. Guard: if tapping the current tab, return early (no navigation, no animation).

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { TAB_ORDER, type TabPath } from '@/lib/routes';

type Tab = {
  path: TabPath;
  label: string;
  icon: string;
};

const TABS: Tab[] = [
  { path: '/tasks',    label: 'Tasks',    icon: '✓' },
  { path: '/cases',    label: 'Cases',    icon: '◧' },
  { path: '/',         label: 'Home',     icon: '⊞' },
  { path: '/stats',    label: 'Stats',    icon: '▦' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
];
```

Navigation handler (write as a hook or inline in the component):

```ts
function useTabNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return function handleTabPress(targetPath: TabPath) {
    if (location.pathname === targetPath) return; // already here

    const fromIndex = TAB_ORDER.indexOf(location.pathname as TabPath);
    const toIndex = TAB_ORDER.indexOf(targetPath);
    const direction = toIndex > fromIndex ? 1 : -1;

    navigate(targetPath, { state: { direction } });
  };
}
```

Full component:

```tsx
export function BottomTabBar(): React.JSX.Element {
  const location = useLocation();
  const handleTabPress = useTabNav();

  return (
    <nav
      aria-label="Main navigation"
      className="flex-shrink-0 border-t bg-background"
      data-testid="bottom-tab-bar"
    >
      <div className="flex h-[60px] items-stretch">
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              ].join(' ')}
              data-testid={`tab-${tab.label.toLowerCase()}`}
              key={tab.path}
              onClick={() => handleTabPress(tab.path)}
              type="button"
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div aria-hidden="true" className="h-[var(--safe-bottom,0px)]" />
    </nav>
  );
}
```

**Notes:**
- `TAB_ORDER.indexOf(location.pathname as TabPath)` returns `-1` if the current pathname is not a primary tab (e.g., `/sign-in`, or a slide surface URI). In that case `fromIndex = -1` and the direction calculation still works: if `toIndex > -1` the direction is always `1` (enters from right, a safe fallback).
- `aria-current="page"` on the active tab for accessibility.
- The `useTabNav` helper function is defined in the same file (not exported). It is not a shared hook since it contains no reusable domain logic.

---

### Part E — `AppShell` update

**Step 5 — Update `src/app/AppShell.tsx`**

Replace the `<main>` content with `<TabOutlet>`. The `<main>` element becomes a `relative overflow-hidden` container so the exiting page is clipped during the transition.

```tsx
import { TabOutlet } from '@/app/TabOutlet';
import { BottomTabBar } from '@/components/shell/BottomTabBar';

export function AppShell(): React.JSX.Element {
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-background pt-[var(--safe-top,0px)]"
      data-testid="app-shell"
    >
      <main className="relative flex-1 overflow-hidden" id="main-content">
        <TabOutlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
```

**Why `overflow-hidden` on `<main>` matters:**
During the carousel transition, two `m.div` elements exist simultaneously (entering + exiting). Each is `absolute inset-0` so they are stacked over the same space. The entering element begins at `x: ±100%` (off-screen). Without `overflow-hidden` on the parent, the off-screen element would be visible as extra scroll content. `overflow-hidden` clips it. ✓

---

### Part F — Five feature scaffolds

All five features follow the same internal structure. The pattern below is shown once for `home` and then summarized as a table for the remaining four.

#### Pattern for each feature

**`src/features/<feature>/types.ts`**
```ts
// Stub — domain types will be added when real API integration lands.
export type <Feature>State = Record<string, never>;
```

**`src/features/<feature>/controllers/use-<feature>-view.controller.ts`**
```ts
import type { <Feature>State } from '../types';

export type <Feature>ViewController = <Feature>State;

export function use<Feature>ViewController(): <Feature>ViewController {
  return {};
}
```

**`src/features/<feature>/providers/<Feature>ViewProvider.tsx`**
```tsx
import { createContext, useContext, type ReactNode } from 'react';
import {
  use<Feature>ViewController,
  type <Feature>ViewController,
} from '../controllers/use-<feature>-view.controller';

const <Feature>ViewContext = createContext<<Feature>ViewController | null>(null);

export function use<Feature>ViewContext(): <Feature>ViewController {
  const ctx = useContext(<Feature>ViewContext);
  if (ctx === null) {
    throw new Error('use<Feature>ViewContext must be used inside <Feature>ViewProvider');
  }
  return ctx;
}

type Props = { children: ReactNode };

export function <Feature>ViewProvider({ children }: Props): React.JSX.Element {
  const ctrl = use<Feature>ViewController();
  return (
    <<Feature>ViewContext.Provider value={ctrl}>
      {children}
    </<Feature>ViewContext.Provider>
  );
}
```

**`src/features/<feature>/components/<Feature>View.tsx`**
```tsx
export function <Feature>View(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold"><Feature name></h1>
    </div>
  );
}
```

Note: `<Feature>View` does NOT call `use<Feature>ViewContext()` in this stub — there is no data to consume yet. When the first real controller output is added, the component will be updated to call the context hook.

**`src/features/<feature>/index.ts`**
```ts
export { <Feature>ViewProvider } from './providers/<Feature>ViewProvider';
export { <Feature>View } from './components/<Feature>View';
```

---

#### Step 6 — `home` feature

Files to create:

| Path | Content |
|---|---|
| `src/features/home/types.ts` | `export type HomeState = Record<string, never>;` |
| `src/features/home/controllers/use-home-view.controller.ts` | Stub controller returning `{}` |
| `src/features/home/providers/HomeViewProvider.tsx` | Context + provider + hook |
| `src/features/home/components/HomeView.tsx` | Renders `<h1>Home</h1>` |
| `src/features/home/index.ts` | Exports `HomeViewProvider`, `HomeView` |

`HomeView.tsx` heading text: `"Home"`.

---

#### Step 7 — `tasks` feature

Files to create:

| Path | Content |
|---|---|
| `src/features/tasks/types.ts` | `export type TasksState = Record<string, never>;` |
| `src/features/tasks/controllers/use-tasks-view.controller.ts` | Stub |
| `src/features/tasks/providers/TasksViewProvider.tsx` | Context + provider + hook |
| `src/features/tasks/components/TasksView.tsx` | Renders `<h1>Tasks</h1>` |
| `src/features/tasks/index.ts` | Exports `TasksViewProvider`, `TasksView` |

---

#### Step 8 — `cases` feature

| Path | Content |
|---|---|
| `src/features/cases/types.ts` | `export type CasesState = Record<string, never>;` |
| `src/features/cases/controllers/use-cases-view.controller.ts` | Stub |
| `src/features/cases/providers/CasesViewProvider.tsx` | Context + provider + hook |
| `src/features/cases/components/CasesView.tsx` | Renders `<h1>Cases</h1>` |
| `src/features/cases/index.ts` | Exports `CasesViewProvider`, `CasesView` |

---

#### Step 9 — `stats` feature

| Path | Content |
|---|---|
| `src/features/stats/types.ts` | `export type StatsState = Record<string, never>;` |
| `src/features/stats/controllers/use-stats-view.controller.ts` | Stub |
| `src/features/stats/providers/StatsViewProvider.tsx` | Context + provider + hook |
| `src/features/stats/components/StatsView.tsx` | Renders `<h1>Stats</h1>` |
| `src/features/stats/index.ts` | Exports `StatsViewProvider`, `StatsView` |

---

#### Step 10 — `settings` feature

| Path | Content |
|---|---|
| `src/features/settings/types.ts` | `export type SettingsState = Record<string, never>;` |
| `src/features/settings/controllers/use-settings-view.controller.ts` | Stub |
| `src/features/settings/providers/SettingsViewProvider.tsx` | Context + provider + hook |
| `src/features/settings/components/SettingsView.tsx` | Renders `<h1>Settings</h1>` |
| `src/features/settings/index.ts` | Exports `SettingsViewProvider`, `SettingsView` |

---

### Part G — Page files

Per `01_architecture.md`, pages are thin components in `src/pages/<feature>/`. They render the feature's provider + view component. No Suspense is needed here since there is no async data.

**Step 11 — Delete `src/pages/HomePage.tsx`**

This file currently renders `TestSurfaceProvider + TestLauncher`. It must be deleted. The `home` feature takes over the `/` route through the new `src/pages/home/HomePage.tsx` created below.

---

**Step 12 — Create five page files**

**`src/pages/home/HomePage.tsx`**
```tsx
import { HomeViewProvider, HomeView } from '@/features/home';

export function HomePage(): React.JSX.Element {
  return (
    <HomeViewProvider>
      <HomeView />
    </HomeViewProvider>
  );
}
```

**`src/pages/tasks/TasksPage.tsx`**
```tsx
import { TasksViewProvider, TasksView } from '@/features/tasks';

export function TasksPage(): React.JSX.Element {
  return (
    <TasksViewProvider>
      <TasksView />
    </TasksViewProvider>
  );
}
```

**`src/pages/cases/CasesPage.tsx`**
```tsx
import { CasesViewProvider, CasesView } from '@/features/cases';

export function CasesPage(): React.JSX.Element {
  return (
    <CasesViewProvider>
      <CasesView />
    </CasesViewProvider>
  );
}
```

**`src/pages/stats/StatsPage.tsx`**
```tsx
import { StatsViewProvider, StatsView } from '@/features/stats';

export function StatsPage(): React.JSX.Element {
  return (
    <StatsViewProvider>
      <StatsView />
    </StatsViewProvider>
  );
}
```

**`src/pages/settings/SettingsPage.tsx`**
```tsx
import { SettingsViewProvider, SettingsView } from '@/features/settings';

export function SettingsPage(): React.JSX.Element {
  return (
    <SettingsViewProvider>
      <SettingsView />
    </SettingsViewProvider>
  );
}
```

---

### Part H — Router update

**Step 13 — Update `src/app/router.tsx`**

Replace the single `home` lazy route with five lazy routes under `ProtectedRoute → AppShell`. Delete the import of the old `HomePage` path.

```tsx
{
  element: <ProtectedRoute />,
  children: [
    {
      element: <AppShell />,
      children: [
        {
          path: ROUTES.home,
          element: lazyRoute(() =>
            import('@/pages/home/HomePage').then((m) => ({ default: m.HomePage })),
          ),
        },
        {
          path: ROUTES.tasks,
          element: lazyRoute(() =>
            import('@/pages/tasks/TasksPage').then((m) => ({ default: m.TasksPage })),
          ),
        },
        {
          path: ROUTES.cases,
          element: lazyRoute(() =>
            import('@/pages/cases/CasesPage').then((m) => ({ default: m.CasesPage })),
          ),
        },
        {
          path: ROUTES.stats,
          element: lazyRoute(() =>
            import('@/pages/stats/StatsPage').then((m) => ({ default: m.StatsPage })),
          ),
        },
        {
          path: ROUTES.settings,
          element: lazyRoute(() =>
            import('@/pages/settings/SettingsPage').then((m) => ({
              default: m.SettingsPage,
            })),
          ),
        },
      ],
    },
  ],
},
```

The `lazyRoute()` helper already wraps each lazy import in `<Suspense fallback={<PageSkeleton />}>` and `<RouteErrorBoundary>`. No additional wrapping is needed in the page files.

---

## File manifest

| Action | Path |
|---|---|
| **MODIFY** | `src/lib/animation.ts` |
| **MODIFY** | `src/lib/routes.ts` |
| **MODIFY** | `src/app/AppShell.tsx` |
| **MODIFY** | `src/app/router.tsx` |
| **MODIFY** | `src/components/shell/BottomTabBar.tsx` |
| **DELETE** | `src/pages/HomePage.tsx` |
| **CREATE** | `src/app/TabOutlet.tsx` |
| **CREATE** | `src/features/home/types.ts` |
| **CREATE** | `src/features/home/controllers/use-home-view.controller.ts` |
| **CREATE** | `src/features/home/providers/HomeViewProvider.tsx` |
| **CREATE** | `src/features/home/components/HomeView.tsx` |
| **CREATE** | `src/features/home/index.ts` |
| **CREATE** | `src/features/tasks/types.ts` |
| **CREATE** | `src/features/tasks/controllers/use-tasks-view.controller.ts` |
| **CREATE** | `src/features/tasks/providers/TasksViewProvider.tsx` |
| **CREATE** | `src/features/tasks/components/TasksView.tsx` |
| **CREATE** | `src/features/tasks/index.ts` |
| **CREATE** | `src/features/cases/types.ts` |
| **CREATE** | `src/features/cases/controllers/use-cases-view.controller.ts` |
| **CREATE** | `src/features/cases/providers/CasesViewProvider.tsx` |
| **CREATE** | `src/features/cases/components/CasesView.tsx` |
| **CREATE** | `src/features/cases/index.ts` |
| **CREATE** | `src/features/stats/types.ts` |
| **CREATE** | `src/features/stats/controllers/use-stats-view.controller.ts` |
| **CREATE** | `src/features/stats/providers/StatsViewProvider.tsx` |
| **CREATE** | `src/features/stats/components/StatsView.tsx` |
| **CREATE** | `src/features/stats/index.ts` |
| **CREATE** | `src/features/settings/types.ts` |
| **CREATE** | `src/features/settings/controllers/use-settings-view.controller.ts` |
| **CREATE** | `src/features/settings/providers/SettingsViewProvider.tsx` |
| **CREATE** | `src/features/settings/components/SettingsView.tsx` |
| **CREATE** | `src/features/settings/index.ts` |
| **CREATE** | `src/pages/home/HomePage.tsx` |
| **CREATE** | `src/pages/tasks/TasksPage.tsx` |
| **CREATE** | `src/pages/cases/CasesPage.tsx` |
| **CREATE** | `src/pages/stats/StatsPage.tsx` |
| **CREATE** | `src/pages/settings/SettingsPage.tsx` |

All paths are relative to `apps/managers-app/ManagerBeyo-app-managers/src/` unless prefixed with `apps/`.

**Total: 5 modify, 1 delete, 31 create = 37 file operations.**

---

## Risks and mitigations

- **Risk:** `AnimatePresence` fires exit animation for the exiting page but the new page has already mounted inside the router. If both pages try to scroll to different positions simultaneously, the user may see a flash.
  **Mitigation:** Both pages use `absolute inset-0` positioning, so they are layered. The exiting page slides away while the entering page slides in. Neither affects the other's scroll position.

- **Risk:** `TAB_ORDER.indexOf(location.pathname as TabPath)` returns `-1` if the user is on a non-tab route (e.g., a slide surface has pushed a URI). Direction calculation with `fromIndex = -1` results in `toIndex > -1` being always true → direction always `1` (enter from right). This is an acceptable safe fallback.
  **Mitigation:** Document this behavior. When `SurfaceRouteFrame` is wired for real URI surfaces, the route structure must ensure the background route (the tab page) is still `location.pathname` for the primary route. This is deferred to that plan.

- **Risk:** `initial={false}` on `AnimatePresence` means the first page on app load does not animate in. If the user deep-links to `/tasks`, the Tasks page also renders without animation. This is correct behavior — no animation on direct URL load.
  **Mitigation:** This is intentional. Document it as expected.

- **Risk:** The `lazyRoute()` helper wraps each lazy route in `<Suspense fallback={<PageSkeleton />}>`. When switching tabs, if a page chunk is not yet loaded, the `PageSkeleton` appears during `AnimatePresence` transition. The skeleton would also animate in/out with the carousel transition.
  **Mitigation:** This is acceptable behavior for the scaffold phase. Future pre-loading via `preload.ts` per feature will eliminate the skeleton on tab press.

- **Risk:** Deleting `src/pages/HomePage.tsx` before `src/pages/home/HomePage.tsx` is created and `router.tsx` is updated causes a broken build state during implementation.
  **Mitigation:** Complete Steps 6 and 12 (home feature + home page file) before Step 11 (delete) and Step 13 (router update). Sequence: create all new files first, update router, then delete the old file last.

- **Risk:** `BottomTabBar` uses `useLocation()` and `useNavigate()`. These hooks require the component to be inside the React Router tree. `BottomTabBar` renders inside `AppShell` which renders inside `RootRoute` which is the router root element — this is always inside the router. ✓
  **Mitigation:** No action needed — the router tree nesting is already correct.

- **Risk:** `AnimatePresence` + `absolute inset-0` pages means the `<main>` element's height is driven by `flex-1` (from AppShell), not by its children's content height. Feature pages inside `m.div className="absolute inset-0 overflow-y-auto"` each fill the full available height and scroll independently.
  **Mitigation:** This is the intended behavior. Each feature page fills the viewport area between the top safe-area padding and the bottom tab bar. The `overflow-y-auto` on the `m.div` handles per-page scrolling.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all 37 operations.
- `npm run build`: clean build.
- Manual smoke test (`npm run dev`, browser at `http://localhost:5173`):
  1. App loads at `/`. Home page shows "Home" heading. No slide-in animation.
  2. Bottom bar shows five tabs: Tasks · Cases · Home · Stats · Settings. Home tab is highlighted.
  3. Tap Cases → Cases slides in from left. Cases tab highlights.
  4. Tap Tasks → Tasks slides in from left. Tasks tab highlights.
  5. Tap Stats → Stats slides in from right. Stats tab highlights.
  6. Tap Cases → Cases slides in from left. Cases tab highlights.
  7. Tap Settings → Settings slides in from right. Settings tab highlights.
  8. Tap Settings again → nothing happens (guard fires).
  9. Tap Home → Home slides in from left (Home is to the left of Settings). Home highlights.
  10. Surface test: from any tab page, the test surfaces can still be opened if a button is wired (they remain registered in `surface-registry.ts`).

---

## Review log

- `2026-05-19` `codex-gpt-5`: Implemented the five feature scaffolds, tab carousel, five-tab navigation, and lazy routes; validated with `npm run typecheck` and `npm run build`.

---

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `codex-gpt-5`
