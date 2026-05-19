# PLAN_app_shell_surface_architecture_20260519

## Metadata

- Plan ID: `PLAN_app_shell_surface_architecture_20260519`
- Status: `under_construction`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-19T00:00:00Z`
- Last updated at (UTC): `2026-05-19T00:00:00Z`
- Related issue/ticket: `—`
- Intention plan: `—` (foundational shell — no parent intention plan)

---

## Goal and intent

- **Goal:** Bootstrap the foundational application shell and surface runtime for the managers SPA — every subsequent feature is built on top of this.
- **Business/user intent:** The app is intentionally a one-page mobile app experience with overlay-driven navigation. No traditional route-heavy layout. Features open surfaces (slide pages, bottom sheets, modals) through a centralised surface system. The shell must support deep surface stacking so feature screens can open further screens, which can open sheets, which can open further screens — all without direct cross-feature coupling.
- **Non-goals:** No business features (tasks, customers, etc.). No authentication backend integration. No real API calls. No production-ready auth flow — only the guard components (ProtectedRoute / GuestRoute) that wrap routes.

---

## Scope

- **In scope:**
  - `src/` folder structure (all folders created)
  - `src/main.tsx` — vaul-drawer-wrapper, entry point
  - `src/app/` — App, providers, RootRoute, router, surface-registry, SurfaceRouteFrame, AppShell
  - `src/providers/` — SurfaceProvider (extended types), BreakpointProvider
  - `src/components/surfaces/` — SlidePageSurface, BottomSheetSurface, ModalSurface
  - `src/components/shell/` — BottomTabBar (stub)
  - `src/components/ui/` — SurfaceSkeleton, PageSkeleton, RouteErrorBoundary
  - `src/hooks/` — use-surface, use-surface-props, use-surface-header
  - `src/lib/` — animation, utils, lazy-route, routes
  - `src/store/` — auth.store
  - `src/types/` — common, api
  - `src/features/auth/` — ProtectedRoute, GuestRoute, index.ts
  - New local contract companion: `architecture/28_surfaces_local.md`

- **Out of scope:**
  - Any feature (invoices, tasks, customers, etc.)
  - Real authentication (token exchange, refresh)
  - API client wiring (no backend calls yet)
  - Playwright tests (deferred — runtime validation comes after first feature is built)
  - `src/pages/` (empty folder only — populated per feature)

- **Assumptions:**
  - `vaul`, `framer-motion`, `zustand`, `@tanstack/react-query`, `react-router-dom`, `zod`, `clsx`, `tailwind-merge` are already installed (confirmed via `package.json`).
  - Tailwind 4.x is already configured via `@tailwindcss/vite`.
  - React 19.x is used — no React.FC, use explicit return types.

---

## Clarifications required

*(none — all architectural decisions are resolved in this plan)*

---

## Acceptance criteria

1. `npm run typecheck` passes with zero TypeScript errors.
2. `npm run dev` starts and the app renders at `/` without console errors or uncaught exceptions.
3. The AppShell renders with a visible BottomTabBar stub.
4. `surface.open('example-slide', {})` (triggered from DevTools or a test button) opens a full-screen horizontal slide surface with back-navigation and correct z-index.
5. `surface.open('example-sheet', {})` opens a Vaul bottom sheet with drag-to-dismiss on mobile viewport.
6. Stacked surfaces render at correct z-index increments (50, 60, 70, ...).
7. Navigating directly to a URI-enabled surface URL renders the surface chrome correctly (no double-render or missing shell).
8. Programmatic `surface.closeAll()` dismisses all open surfaces.
9. `surface.open()` on an unregistered id logs a warning in DEV; does nothing in production.
10. `src/App.tsx` no longer exists — the root is `src/app/App.tsx`, imported from `src/main.tsx`.

---

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer map, folder structure, app bootstrap pattern, `AppProviders` vs `RootRoute` split
- `architecture/11_routing.md`: `createBrowserRouter`, `lazyRoute`, `ProtectedRoute`, route path constants
- `architecture/15_feature_structure.md`: feature vertical-slice layout, `index.ts` public API rule
- `architecture/23_providers.md`: provider pattern (controller → context → consumer hook)
- `architecture/27_responsive.md`: `BreakpointProvider` — single `matchMedia` source of truth, `useBreakpoint()`
- `architecture/28_surfaces.md`: Surface Manager — registry, store (`useSurfaceStore`), renderer, `SurfaceRouteFrame`, `useSurface`, `useSurfaceProps`, `useSurfaceHeader`, `SurfaceHeaderContext`, `SurfacePropsContext`
- `architecture/30_dynamic_loading.md`: `lazyRoute` helper, surface lazy loading, `Suspense` fallback taxonomy
- `architecture/31_animations.md`: `LazyMotion` + `domAnimation`, `MotionConfig reducedMotion="user"`, animation tokens, `AnimatePresence` pattern
- `architecture/33_vaul_drawer.md`: Vaul `Drawer.Root` API, `shouldScaleBackground`, `vaul-drawer-wrapper`, `Drawer.Handle`, `Drawer.Portal`, `Drawer.Overlay`, `Drawer.Content`, close animation pattern

### Local extensions loaded

- `architecture/28_surfaces_local.md` (**create this file — see step 1**): defines `slide` and `sheet` surface types, drops `drawer` for this app, documents close-animation contract for Vaul sheets

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

Prohibited (pattern reads — contract already covers these):
- Reading another surface component to understand animation shape → `31_animations.md`
- Reading another provider to understand context shell → `23_providers.md`
- Reading another Zustand store to understand store shape → `06_client_state.md`
- Reading another lazy route to understand lazyRoute usage → `30_dynamic_loading.md`

Permitted (relational reads — understanding what exists):
- Reading `package.json` to confirm installed packages
- Reading `src/main.tsx` to understand current entry point before editing
- Reading `src/App.tsx` before removing it
- Reading `index.css` to confirm Tailwind import is in place

### Skill selection

- Primary skill: `—` (foundational infrastructure — no feature-specific skill needed)
- Trigger terms: `surface`, `vaul`, `slide`, `sheet`, `app shell`, `stacking`, `animation`
- Excluded alternatives: `—`

---

## Extended surface types (local architecture decision)

This app extends the canonical `SurfaceType = 'page' | 'drawer' | 'modal'` with two new types. This decision is documented in `architecture/28_surfaces_local.md`.

### `slide` — full-screen push navigation surface

| Property | Value |
|---|---|
| Component | `SlidePageSurface` |
| Animation | Framer Motion — `x: '100%' → 0` enter, `x: 0 → '100%'` exit |
| Full screen | Yes — `fixed inset-0`, covers everything |
| URI-enabled | Always (every slide page must have a `path`) |
| Stacking | Yes — z-index increments, each new slide covers previous |
| Header | Back button + dynamic title + dynamic actions (via `SurfaceHeaderContext`) |
| Gesture dismiss | No built-in — back button and `navigate(-1)` only |
| Vaul | No |

Use `slide` for: feature detail screens, form pages, settings pages, sub-feature list pages — anything that feels like navigating deeper in the app.

### `sheet` — Vaul bottom overlay

| Property | Value |
|---|---|
| Component | `BottomSheetSurface` |
| Animation | Vaul internal — always `direction="bottom"`, drag-to-dismiss |
| Full screen | No — `max-h-[90dvh]` with rounded top corners |
| URI-enabled | Optional — contextual sheets typically omit `path` |
| Stacking | Yes — z-index increments above slides |
| Header | Optional — drag handle always present, title/actions via `SurfaceHeaderContext` |
| Gesture dismiss | Yes — Vaul drag handle |
| Vaul | Yes — `shouldScaleBackground` |
| Close animation contract | See close sequence below |

Use `sheet` for: detail previews, action menus, quick-form overlays, confirmation flows that aren't critical enough for a modal.

### `modal` — center interruption (unchanged from canonical)

| Property | Value |
|---|---|
| Component | `ModalSurface` |
| Animation | Framer Motion — scale + fade |
| URI-enabled | Optional |
| Gesture dismiss | No |
| Use when | Required decision — destructive confirm, critical alert |

### `page` — route navigation (unchanged from canonical)

Full viewport. Navigate with `useNavigate()` directly. Never opened via `surface.open()`.

### What is NOT used in this app

The canonical `drawer` type (side-on-desktop, bottom-on-mobile adaptive) is **not registered** in this app. All side-navigation is `slide`. All bottom overlays are `sheet`. Do not add `drawer` to `SURFACE_SHELLS`.

---

## Close animation contract

### Framer Motion surfaces (SlidePageSurface, ModalSurface)

`SurfaceRenderer` wraps all its rendered surfaces inside a single `<AnimatePresence>`. When a surface is removed from the `stack` array, `AnimatePresence` detects the missing `key` and runs the `exit` animation **before** unmounting. No separate "closing" state is needed — AnimatePresence handles this automatically.

```tsx
// SurfaceRenderer renders:
<AnimatePresence>
  {stateOverlays.map((entry, index) => (
    <Shell key={entry.id} ... />
  ))}
</AnimatePresence>
```

Each surface shell uses `initial` / `animate` / `exit` props. Exit runs when the `key` leaves the array.

### Vaul surfaces (BottomSheetSurface)

Vaul controls its own animation via the `open` prop — it does NOT use Framer Motion for enter/exit. The close sequence:

```
User gesture → Vaul finishes drag physics → onOpenChange(false) fires
  → sheet calls handleClose():
    1. setIsOpen(false)           ← tells Vaul to play its close animation
    2. setTimeout(onClose, 350)   ← after Vaul animation completes, remove from stack
```

For programmatic close (close button in header):
```
User taps close button → sheet calls handleClose():
  1. setIsOpen(false)           ← Vaul plays close animation
  2. setTimeout(onClose, 350)   ← remove from stack after animation
```

`onClose` = the `close(entry.id)` callback from `SurfaceRenderer`. 350ms matches Vaul's default spring close duration. Do not use `page.waitForTimeout()` in tests — instead wait for the element to be absent from the DOM.

---

## File manifest

### Existing files to edit

| Path (relative to project root) | Change summary |
|---|---|
| `src/main.tsx` | Add `vaul-drawer-wrapper` div wrapping `<App />`; change import to `./app/App` |
| `src/App.tsx` | Delete entirely — replaced by `src/app/App.tsx` |

### New files to create

| Path (relative to `src/`) |
|---|
| `app/App.tsx` |
| `app/providers.tsx` |
| `app/RootRoute.tsx` |
| `app/router.tsx` |
| `app/surface-registry.ts` |
| `app/SurfaceRouteFrame.tsx` |
| `app/AppShell.tsx` |
| `providers/SurfaceProvider.tsx` |
| `providers/BreakpointProvider.tsx` |
| `components/surfaces/SlidePageSurface.tsx` |
| `components/surfaces/BottomSheetSurface.tsx` |
| `components/surfaces/ModalSurface.tsx` |
| `components/shell/BottomTabBar.tsx` |
| `components/ui/SurfaceSkeleton.tsx` |
| `components/ui/PageSkeleton.tsx` |
| `components/ui/RouteErrorBoundary.tsx` |
| `hooks/use-surface.ts` |
| `hooks/use-surface-props.ts` |
| `hooks/use-surface-header.ts` |
| `lib/animation.ts` |
| `lib/utils.ts` |
| `lib/lazy-route.tsx` |
| `lib/routes.ts` |
| `store/auth.store.ts` |
| `types/common.ts` |
| `types/api.ts` |
| `features/auth/components/ProtectedRoute.tsx` |
| `features/auth/components/GuestRoute.tsx` |
| `features/auth/index.ts` |

New architecture companion (relative to project root):

| Path |
|---|
| `architecture/28_surfaces_local.md` |

---

## Implementation plan

Implement in this exact order. Each step depends on the previous.

---

### Step 1 — Create local surface contract companion

**File:** `architecture/28_surfaces_local.md`

Content must open with `> Extends: 28_surfaces.md` and document:
- The `slide` and `sheet` types (definitions, components, URI rules, gesture ownership)
- The `drawer` exclusion for this app
- The Vaul close sequence (350ms timeout pattern)
- The `SURFACE_SHELLS` map for this app

```md
> Extends: 28_surfaces.md

# 28 — Surface Manager — ManagerBeyo Managers App Extension

## App-specific surface types

This app uses four surface types. The canonical `drawer` type is NOT registered — see exclusion note below.

| Type | Component | Direction | URI | Gesture |
|---|---|---|---|---|
| `page` | — (route only) | n/a | Always | n/a |
| `slide` | `SlidePageSurface` | Right-to-left push | Always | Back button |
| `sheet` | `BottomSheetSurface` | Bottom-up | Optional | Vaul drag-dismiss |
| `modal` | `ModalSurface` | Center scale | Optional | Escape / backdrop |

## `drawer` exclusion

The adaptive `drawer` type (right on desktop, bottom on mobile) is not used.
This app has no desktop sidebar layout — it is mobile-first throughout.
Use `slide` for page-depth navigation. Use `sheet` for bottom overlays.

## SURFACE_SHELLS map

```ts
const SURFACE_SHELLS = {
  page:  ({ children }) => <>{children}</>,
  slide: SlidePageSurface,
  sheet: BottomSheetSurface,
  modal: ModalSurface,
};
```

## Close animation contract (Vaul)

BottomSheetSurface uses a 350ms delayed close to preserve Vaul's spring exit animation.
See plan `PLAN_app_shell_surface_architecture_20260519.md` for full rationale.
```

---

### Step 2 — `src/lib/utils.ts`

`cn()` utility combining `clsx` + `tailwind-merge`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### Step 3 — `src/lib/animation.ts`

Animation tokens. Extend canonical contract tokens with a `slide` transition:

```ts
export const durations = {
  instant: 0.08,
  fast:    0.12,
  base:    0.18,
  slow:    0.28,
  slide:   0.30,
} as const;

export const easings = {
  standard:   [0.2, 0, 0, 1],
  emphasized: [0.16, 1, 0.3, 1],
  slideIn:    [0.22, 1, 0.36, 1],  // iOS-like deceleration for push navigation
} as const;

export const transitions = {
  fast: {
    duration: durations.fast,
    ease:     easings.standard,
  },
  base: {
    duration: durations.base,
    ease:     easings.standard,
  },
  surface: {
    duration: durations.slow,
    ease:     easings.emphasized,
  },
  slide: {
    duration: durations.slide,
    ease:     easings.slideIn,
  },
} as const;
```

---

### Step 4 — `src/lib/routes.ts`

Route path constants. Start minimal — add paths as features are built:

```ts
export const ROUTES = {
  signIn: '/sign-in',
  home:   '/',
} as const;
```

---

### Step 5 — `src/lib/lazy-route.tsx`

```tsx
import { lazy, Suspense, type ComponentType } from 'react';
import { PageSkeleton }       from '@/components/ui/PageSkeleton';
import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';

type LazyComponent = ComponentType<Record<string, never>>;

export function lazyRoute(importer: () => Promise<{ default: LazyComponent }>) {
  const Component = lazy(importer);

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <Component />
      </Suspense>
    </RouteErrorBoundary>
  );
}
```

`PageSkeleton` and `RouteErrorBoundary` are created in step 12. Because `lazyRoute` is not called at module scope (it's called inside the router config which is not executed until the router is created), the circular dependency is safe.

---

### Step 6 — `src/types/common.ts`

Branded ID types. Start minimal:

```ts
declare const _brand: unique symbol;

export type Branded<T, Brand extends string> = T & {
  readonly [_brand]: Brand;
};

export type UserId = Branded<string, 'UserId'>;
```

Add new entity IDs here as features are built.

---

### Step 7 — `src/types/api.ts`

API envelope types:

```ts
export type ApiResponse<T> = {
  data: T;
};

export type ApiListResponse<T> = {
  data:       T[];
  total:      number;
  page:       number;
  per_page:   number;
};

export type ApiError = {
  message: string;
  code?:   string;
  field?:  string;
};
```

---

### Step 8 — `src/store/auth.store.ts`

```ts
import { create } from 'zustand';
import type { UserId } from '@/types/common';

type AuthState = {
  isAuthenticated: boolean;
  userId:          UserId | null;
  token:           string | null;
  signIn:  (userId: UserId, token: string) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId:          null,
  token:           null,

  signIn: (userId, token) => set({ isAuthenticated: true, userId, token }),
  signOut: () => set({ isAuthenticated: false, userId: null, token: null }),
}));

export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
```

---

### Step 9 — `src/providers/BreakpointProvider.tsx`

Implement exactly as per `architecture/27_responsive.md`. No modifications for this app.

Key points:
- `QUERIES` uses `min-width: 768px` (tablet) and `min-width: 1024px` (desktop)
- `getBreakpoint()` returns `'mobile' | 'tablet' | 'desktop'`
- `BreakpointContext` default is `desktop` (SSR-safe fallback)
- Export `BreakpointContext` (for tests only), `BreakpointProvider`, `useBreakpoint`

---

### Step 10 — `src/providers/SurfaceProvider.tsx`

This is the core of the surface system. Implement based on `architecture/28_surfaces.md` with the app-specific type extensions from step 1.

**Types:**

```ts
import { create } from 'zustand';
import { createContext } from 'react';

export type SurfaceType = 'page' | 'slide' | 'sheet' | 'modal';

export type SurfaceRegistration = {
  surface:    SurfaceType;
  path?:      (props: Record<string, unknown>) => string;
  component:  React.LazyExoticComponent<React.ComponentType>;
};

export type SurfaceRegistrations = Record<string, SurfaceRegistration>;

type ActiveSurface = SurfaceRegistration & {
  id:    string;
  props: Record<string, unknown>;
};

type SurfaceState = {
  registry:  SurfaceRegistrations;
  stack:     ActiveSurface[];
  navigate?: (path: string, opts: { state: unknown }) => void;

  init:      (registry: SurfaceRegistrations, navigate: SurfaceState['navigate']) => void;
  open:      (id: string, props?: Record<string, unknown>) => void;
  close:     (id: string) => void;
  closeTop:  () => void;
  closeAll:  () => void;
};
```

**Store:** implement exactly as per `architecture/28_surfaces.md` `useSurfaceStore`. The `open()` action:
1. Warns in DEV if id is not registered — never throws
2. If already open, brings to top with updated props
3. If URI-enabled (`registration.path` exists), calls `navigate(path, { state: { surface, background } })`
4. Appends to stack

**Contexts (export both):**

```ts
export const SurfacePropsContext = createContext<Record<string, unknown>>({});

export type SurfaceHeaderValue = {
  setTitle:   (title: string) => void;
  setActions: (actions: React.ReactNode) => void;
};
export const SurfaceHeaderContext = createContext<SurfaceHeaderValue | null>(null);
```

**SURFACE_SHELLS map:**

```ts
import { SlidePageSurface }    from '@/components/surfaces/SlidePageSurface';
import { BottomSheetSurface }  from '@/components/surfaces/BottomSheetSurface';
import { ModalSurface }        from '@/components/surfaces/ModalSurface';

type SurfaceShellProps = {
  onClose:  () => void;
  zIndex:   number;
  children: React.ReactNode;
};

const SURFACE_SHELLS: Record<SurfaceType, React.ComponentType<SurfaceShellProps>> = {
  page:  ({ children }) => <>{children}</>,
  slide: SlidePageSurface,
  sheet: BottomSheetSurface,
  modal: ModalSurface,
};
```

**SurfaceRenderer:**

```tsx
import { AnimatePresence }  from 'framer-motion';
import { createPortal }     from 'react-dom';
import { Suspense }         from 'react';
import { SurfaceSkeleton }  from '@/components/ui/SurfaceSkeleton';

function SurfaceRenderer() {
  const stack = useSurfaceStore((s) => s.stack);
  const close = useSurfaceStore((s) => s.close);

  // Only render state-only overlays here.
  // URI-enabled surfaces (with path) are rendered by the router via SurfaceRouteFrame.
  const stateOverlays = stack.filter(
    (s) => s.surface !== 'page' && !s.path
  );

  if (stateOverlays.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      {stateOverlays.map((entry, index) => {
        const Shell     = SURFACE_SHELLS[entry.surface];
        const Component = entry.component;

        return (
          <Shell
            key={entry.id}
            onClose={() => close(entry.id)}
            zIndex={50 + index * 10}
          >
            <SurfacePropsContext.Provider value={entry.props}>
              <Suspense fallback={<SurfaceSkeleton surface={entry.surface} />}>
                <Component />
              </Suspense>
            </SurfacePropsContext.Provider>
          </Shell>
        );
      })}
    </AnimatePresence>,
    document.body,
  );
}
```

**SurfaceProvider component:**

```tsx
import { useEffect }          from 'react';
import { useNavigate }        from 'react-router-dom';
import { surfaceRegistry }    from '@/app/surface-registry';

export function SurfaceProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const init     = useSurfaceStore((s) => s.init);

  useEffect(() => {
    init(surfaceRegistry, navigate);
  }, []);

  return (
    <>
      {children}
      <SurfaceRenderer />
    </>
  );
}
```

---

### Step 11 — `src/components/surfaces/SlidePageSurface.tsx`

Full-screen horizontal push navigation surface. Framer Motion only — no Vaul.

```tsx
import { useState }                from 'react';
import { m }                       from 'framer-motion';
import { SurfaceHeaderContext }    from '@/providers/SurfaceProvider';
import { transitions }             from '@/lib/animation';

type Props = {
  onClose:  () => void;
  zIndex:   number;
  children: React.ReactNode;
};

export function SlidePageSurface({ onClose, zIndex, children }: Props) {
  const [title,   setTitle]   = useState('');
  const [actions, setActions] = useState<React.ReactNode>(null);

  return (
    <SurfaceHeaderContext.Provider value={{ setTitle, setActions }}>
      <m.div
        className="fixed inset-0 bg-background flex flex-col focus:outline-none"
        style={{ zIndex }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={transitions.slide}
      >
        <header className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 min-h-[56px]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Go back"
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted"
          >
            ‹
          </button>
          <h1
            id="surface-slide-title"
            className="flex-1 text-base font-semibold truncate"
          >
            {title}
          </h1>
          {actions && (
            <div className="flex items-center gap-1">{actions}</div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {children}
        </div>
      </m.div>
    </SurfaceHeaderContext.Provider>
  );
}
```

**Notes:**
- `fixed inset-0` covers the full screen including any surface below
- `focus:outline-none` prevents browser focus ring on the container
- The back button always calls `onClose()` — the surface manager handles the stack pop
- `scrollbar-gutter:stable` prevents layout shift when content overflows

---

### Step 12 — `src/components/surfaces/BottomSheetSurface.tsx`

Vaul-powered bottom sheet. Always `direction="bottom"`. Follows close animation contract from step 1.

```tsx
import { useState }                from 'react';
import { Drawer }                  from 'vaul';
import { SurfaceHeaderContext }    from '@/providers/SurfaceProvider';
import { cn }                      from '@/lib/utils';

type Props = {
  onClose:  () => void;
  zIndex:   number;
  children: React.ReactNode;
};

export function BottomSheetSurface({ onClose, zIndex, children }: Props) {
  const [isOpen,  setIsOpen]  = useState(true);
  const [title,   setTitle]   = useState('');
  const [actions, setActions] = useState<React.ReactNode>(null);

  function handleClose() {
    setIsOpen(false);
    setTimeout(onClose, 350);
  }

  return (
    <SurfaceHeaderContext.Provider value={{ setTitle, setActions }}>
      <Drawer.Root
        open={isOpen}
        onOpenChange={(v) => { if (!v) handleClose(); }}
        direction="bottom"
        shouldScaleBackground
      >
        <Drawer.Portal>
          <Drawer.Overlay
            className="fixed inset-0 bg-black/40"
            style={{ zIndex }}
          />
          <Drawer.Content
            aria-labelledby="surface-sheet-title"
            className={cn(
              'fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[90dvh]',
              'bg-background shadow-xl flex flex-col focus:outline-none',
            )}
            style={{ zIndex: zIndex + 1 }}
          >
            <Drawer.Handle className="mx-auto mt-3 mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30" />

            {(title || actions) && (
              <header className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0">
                <h2
                  id="surface-sheet-title"
                  className="text-base font-semibold truncate"
                >
                  {title}
                </h2>
                {actions && (
                  <div className="flex items-center gap-2">{actions}</div>
                )}
              </header>
            )}

            <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </SurfaceHeaderContext.Provider>
  );
}
```

**Notes:**
- `isOpen` local state starts `true`. Never passes `open` from outside — the surface is always "open" while it's in the stack.
- Header renders conditionally — sheets without a title/actions omit the header row entirely; the drag handle is always present.
- `shouldScaleBackground` requires the `vaul-drawer-wrapper` div in `main.tsx` (step 20).

---

### Step 13 — `src/components/surfaces/ModalSurface.tsx`

Implement exactly as per `architecture/28_surfaces.md` `ModalSurface` code. Key points:
- Framer Motion `m.button` for backdrop (handles click-to-close)
- `m.div` for the panel (scale + fade animation using `transitions.surface`)
- `useEffect` for `Escape` key listener
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby="surface-modal-title"` on the panel
- `e.stopPropagation()` on inner panel div to prevent backdrop close
- `SurfaceHeaderContext.Provider` wrapping
- `SurfaceShellProps` type (`onClose`, `zIndex`, `children`) — no `open` prop (AnimatePresence handles exit)

---

### Step 14 — `src/hooks/use-surface.ts`

```ts
import { useSurfaceStore } from '@/providers/SurfaceProvider';

export function useSurface() {
  const open     = useSurfaceStore((s) => s.open);
  const close    = useSurfaceStore((s) => s.close);
  const closeTop = useSurfaceStore((s) => s.closeTop);
  const closeAll = useSurfaceStore((s) => s.closeAll);
  const stack    = useSurfaceStore((s) => s.stack);

  return {
    open,
    close,
    closeTop,
    closeAll,
    isOpen: (id: string) => stack.some((s) => s.id === id),
  };
}
```

---

### Step 15 — `src/hooks/use-surface-props.ts`

```ts
import { useContext } from 'react';
import { SurfacePropsContext } from '@/providers/SurfaceProvider';

export function useSurfaceProps<T extends Record<string, unknown>>(): Partial<T> {
  return useContext(SurfacePropsContext) as Partial<T>;
}
```

---

### Step 16 — `src/hooks/use-surface-header.ts`

```ts
import { useContext } from 'react';
import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';

export function useSurfaceHeader() {
  return useContext(SurfaceHeaderContext);
}
```

---

### Step 17 — `src/components/ui/PageSkeleton.tsx`

```tsx
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-4 w-5/6 rounded bg-muted" />
    </div>
  );
}
```

---

### Step 18 — `src/components/ui/SurfaceSkeleton.tsx`

```tsx
import type { SurfaceType } from '@/providers/SurfaceProvider';
import { cn } from '@/lib/utils';

type Props = { surface: SurfaceType };

export function SurfaceSkeleton({ surface }: Props) {
  if (surface === 'modal') {
    return (
      <div className="flex flex-col gap-3 p-6 animate-pulse">
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 animate-pulse">
      <div className="h-7 w-40 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-4/5 rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-20 w-full rounded bg-muted mt-2" />
    </div>
  );
}
```

---

### Step 19 — `src/components/ui/RouteErrorBoundary.tsx`

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props    = { children: ReactNode };
type State    = { hasError: boolean; error: Error | null };

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[RouteErrorBoundary]', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-6">
          <p className="text-sm text-muted-foreground text-center">
            This screen could not load.
          </p>
          <button
            type="button"
            className="text-sm underline"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### Step 20 — `src/components/shell/BottomTabBar.tsx`

Stub only — no real navigation yet. Populated as features are built.

```tsx
type Tab = {
  id:    string;
  label: string;
  icon:  string;
  path:  string;
};

const TABS: Tab[] = [
  { id: 'home', label: 'Home', icon: '⊞', path: '/' },
];

export function BottomTabBar() {
  return (
    <nav
      aria-label="Main navigation"
      className="flex items-stretch border-t bg-background h-[60px]"
      data-testid="bottom-tab-bar"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="flex flex-col items-center justify-center flex-1 gap-0.5 text-xs text-muted-foreground"
          data-testid={`tab-${tab.id}`}
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
```

**Note:** Replace `button` with `Link` from `react-router-dom` once routes are defined. Tabs will be connected to ROUTES constants.

---

### Step 21 — `src/app/surface-registry.ts`

Empty registry — populated as features declare their surfaces:

```ts
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const surfaceRegistry: SurfaceRegistrations = {};

export type SurfaceId = keyof typeof surfaceRegistry;
```

---

### Step 22 — `src/app/SurfaceRouteFrame.tsx`

Wraps `<Outlet>` in the appropriate surface shell when location state contains `surface` + `background`. If no state (direct URL navigation), renders `<Outlet>` as a full page.

```tsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SlidePageSurface }   from '@/components/surfaces/SlidePageSurface';
import { BottomSheetSurface } from '@/components/surfaces/BottomSheetSurface';
import { ModalSurface }       from '@/components/surfaces/ModalSurface';
import type { SurfaceType }   from '@/providers/SurfaceProvider';

type SurfaceLocationState = {
  surface?:    Exclude<SurfaceType, 'page'>;
  background?: { pathname: string; search: string };
};

const SURFACE_SHELLS = {
  slide: SlidePageSurface,
  sheet: BottomSheetSurface,
  modal: ModalSurface,
} as const;

export function SurfaceRouteFrame() {
  const location = useLocation();
  const navigate = useNavigate();
  const state    = (location.state ?? {}) as SurfaceLocationState;

  if (!state.surface || !state.background) {
    return <Outlet />;
  }

  const Shell = SURFACE_SHELLS[state.surface];
  if (!Shell) return <Outlet />;

  return (
    <Shell onClose={() => navigate(-1)} zIndex={50}>
      <Outlet />
    </Shell>
  );
}
```

**Note:** The `zIndex={50}` here is for URI-enabled surfaces rendered by the router. If the app supports deeply linked surfaces that might overlay each other, extend `SurfaceRouteFrame` to derive z-index from the surface stack depth. For now, z=50 is correct for a single router-rendered surface.

---

### Step 23 — `src/app/AppShell.tsx`

Persistent application shell. Renders the active page content via `<Outlet>` and the permanent `BottomTabBar`.

```tsx
import { Outlet } from 'react-router-dom';
import { BottomTabBar } from '@/components/shell/BottomTabBar';

export function AppShell() {
  return (
    <div
      className="flex flex-col h-dvh bg-background overflow-hidden"
      data-testid="app-shell"
    >
      <main className="flex-1 overflow-y-auto" id="main-content">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
```

---

### Step 24 — `src/features/auth/`

**`src/features/auth/components/ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '@/store/auth.store';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return <Outlet />;
}
```

**`src/features/auth/components/GuestRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '@/store/auth.store';

export function GuestRoute() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
```

**`src/features/auth/index.ts`**

```ts
export { ProtectedRoute } from './components/ProtectedRoute';
export { GuestRoute }     from './components/GuestRoute';
```

---

### Step 25 — `src/app/RootRoute.tsx`

Router-level providers. These must live inside the router tree because they call `useNavigate()` (via `SurfaceProvider`).

```tsx
import { Outlet } from 'react-router-dom';
import { SurfaceProvider } from '@/providers/SurfaceProvider';

export function RootRoute() {
  return (
    <SurfaceProvider>
      <Outlet />
    </SurfaceProvider>
  );
}
```

**Note:** `AuthProvider` (if one is added later for session restoration) goes here too. For now, `SurfaceProvider` is the only router-level provider.

---

### Step 26 — `src/app/router.tsx`

```tsx
import { createBrowserRouter, redirect } from 'react-router-dom';
import { RootRoute }   from '@/app/RootRoute';
import { AppShell }    from '@/app/AppShell';
import { lazyRoute }   from '@/lib/lazy-route';
import { ROUTES }      from '@/lib/routes';
import { ProtectedRoute, GuestRoute } from '@/features/auth';

export const router = createBrowserRouter([
  {
    element: <RootRoute />,
    children: [
      // Guest-only routes (redirect to / if already signed in)
      {
        element: <GuestRoute />,
        children: [
          {
            path: ROUTES.signIn,
            element: lazyRoute(() =>
              import('@/pages/auth/SignInPage').then((m) => ({
                default: m.SignInPage,
              })),
            ),
          },
        ],
      },

      // Protected app routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                path: ROUTES.home,
                loader: () => redirect(ROUTES.home),
                element: lazyRoute(() =>
                  import('@/pages/HomePage').then((m) => ({
                    default: m.HomePage,
                  })),
                ),
              },
            ],
          },
        ],
      },

      // Catch-all
      {
        path: '*',
        element: lazyRoute(() =>
          import('@/pages/NotFoundPage').then((m) => ({
            default: m.NotFoundPage,
          })),
        ),
      },
    ],
  },
]);
```

**Stub pages to create alongside the router (minimal content only):**

`src/pages/auth/SignInPage.tsx`:
```tsx
export function SignInPage() {
  return <div className="p-6">Sign In</div>;
}
```

`src/pages/HomePage.tsx`:
```tsx
export function HomePage() {
  return <div className="p-6" data-testid="home-page">Home</div>;
}
```

`src/pages/NotFoundPage.tsx`:
```tsx
export function NotFoundPage() {
  return <div className="p-6">Not found</div>;
}
```

---

### Step 27 — `src/app/providers.tsx`

Global providers — no router context required here:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { BreakpointProvider } from '@/providers/BreakpointProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { staleTime: 1000 * 60, retry: 1 },
    mutations: { retry: 0 },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <BreakpointProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </BreakpointProvider>
      </LazyMotion>
    </MotionConfig>
  );
}
```

---

### Step 28 — `src/app/App.tsx`

```tsx
import { RouterProvider } from 'react-router-dom';
import { AppProviders }   from './providers';
import { router }         from './router';

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
```

---

### Step 29 — Update `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App }        from './app/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div vaul-drawer-wrapper="" className="bg-background h-full">
      <App />
    </div>
  </StrictMode>,
);
```

**Critical:** The `vaul-drawer-wrapper` attribute must be on the **immediate child of `document.body`** (or of `#root`). Without it, Vaul's `shouldScaleBackground` does nothing. The `className="bg-background h-full"` is required so the scale transform has a background to show.

---

### Step 30 — Delete `src/App.tsx`

The old `src/App.tsx` must be deleted (it was the Vite boilerplate clean). The new root is `src/app/App.tsx`. Verify that no other file imports from `./App` or `../App`.

---

### Step 31 — TypeScript path aliases

Verify `tsconfig.json` (or `tsconfig.app.json`) has the `@/` path alias configured, and `vite.config.ts` mirrors it. Without this, all `@/` imports fail.

**`tsconfig.app.json` (add to `compilerOptions`):**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**`vite.config.ts` (add `resolve.alias`):**
```ts
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Surface stacking examples

After the shell is live, any feature can open stacked surfaces:

```ts
// Side slide opens
surface.open('task-list');                        // z=50
surface.open('task-detail', { id: '123' });       // z=60
surface.open('task-note-sheet', { taskId: '123' });// z=70 (bottom sheet over slide)
surface.open('note-detail', { id: '456' });        // z=80 (slide over sheet)

// Close order (most common: close top one at a time)
surface.closeTop();  // closes note-detail slide
surface.closeTop();  // closes task-note-sheet
surface.closeTop();  // closes task-detail slide
surface.closeTop();  // closes task-list slide
```

---

## Risks and mitigations

- **Risk:** `vaul-drawer-wrapper` div is missing or nested incorrectly.
  **Mitigation:** Step 29 places it as the immediate child of `#root`, which is the immediate child of `document.body`. Verify in browser DevTools that the DOM reads: `body > #root > div[vaul-drawer-wrapper]`.

- **Risk:** `AnimatePresence` on the SurfaceRenderer doesn't trigger exit animation because the stack update causes an immediate unmount.
  **Mitigation:** AnimatePresence requires the item to be present in the React tree at the point it becomes absent from the stack. Since all state-only surfaces are rendered inside the same AnimatePresence block in SurfaceRenderer, removing an item from the stack array while AnimatePresence is watching will correctly trigger the exit. Do NOT conditionally render the AnimatePresence block itself — always render it.

- **Risk:** `BottomSheetSurface` close animation interrupted by immediate unmount.
  **Mitigation:** The 350ms `setTimeout` in `handleClose()` matches Vaul's default spring duration. If the animation feels cut off, increase to 400ms. Do not use `page.waitForTimeout()` in Playwright — wait for the element's absence from DOM instead.

- **Risk:** `SurfaceProvider` calls `init()` with `navigate` but `useNavigate()` is only available inside the router. `SurfaceProvider` is in `RootRoute` which is inside the router — this is correct. Do NOT move `SurfaceProvider` to `AppProviders`.

- **Risk:** TypeScript path alias `@/` not configured — all imports fail.
  **Mitigation:** Step 31 must be completed before any other file is created, or at minimum before `npm run typecheck` is run.

- **Risk:** `lazy()` components in `surface-registry.ts` throw on first render if `Suspense` is not wrapping them.
  **Mitigation:** `SurfaceRenderer` wraps each component in `<Suspense fallback={<SurfaceSkeleton />}>`. URI-enabled surfaces rendered by `SurfaceRouteFrame` use `lazyRoute` which includes its own `Suspense`. Both paths are covered.

---

## Validation plan

After completing all steps:

- `npm run typecheck`: zero TypeScript errors
- `npm run dev`: app starts, no console errors at `/`
- Manual smoke test: navigate to `/`, app shell renders with BottomTabBar visible
- Manual smoke test: navigate to `/sign-in`, sign-in stub renders
- Manual smoke test: navigate to unknown path, 404 stub renders
- Playwright (deferred — run after first feature is implemented and `surface-registry.ts` has at least one surface registered)

---

## Review log

- `2026-05-19` `claude-sonnet-4-6`: Initial plan created from contract review (01, 11, 15, 23, 27, 28, 30, 31, 33).

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David` (review + approve before handing to Codex)
