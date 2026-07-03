# PLAN_seller_app_bootstrap_phase_B_20260703

## Metadata

- Plan ID: `PLAN_seller_app_bootstrap_phase_B_20260703`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T00:00:00Z`
- Overview plan: `docs/architecture/under_construction/implementation/PLAN_seller_app_bootstrap_overview_20260703.md`
- Prerequisite: `PLAN_seller_app_bootstrap_phase_A_20260703.md` must be implemented and typechecking first.

## Goal and intent

- Goal: Wire the full app shell — providers, auth, routing, tab navigation, realtime, and surface layer — so the seller app renders the sign-in screen, authenticates, and navigates all tab routes.
- Business/user intent: After Phase B a developer can `npm run dev`, sign in with a seller account, and see all tab routes rendering (tasks/cases/settings as stubs; home/stats/upholstery-inventory as named placeholders). Surfaces are not yet open-able (registry is still an empty stub). Features and real pages land in Phase C.
- Non-goals: No feature surfaces, no real tasks/cases/settings pages, no FAB — those land in Phase C.

## Scope

- In scope: `src/app/*`, `src/providers/TabBadgeCountsProvider`, `src/hooks/use-tab-badge-counts.controller`, `src/components/shell/*`, `src/lib/primary-tab-preload`, `src/types/common`, `src/features/cases/surfaces` (partial stub), `src/features/pwa/surfaces` (partial stub), `src/features/tasks/socket-events`, all `src/pages/*` (stubs for tasks/cases/settings; finals for home/stats/upholstery-inventory/sign-in/not-found/case-conversation).
- Out of scope: Real surfaces, feature implementations, task creation FAB, settings feature, full cases wiring.
- Assumptions: Phase A completed and typecheck passes. The `src/app/surface-registry.ts` empty stub from Phase A stays unchanged in Phase B — Phase C replaces it.

## File manifest

All paths are relative to `apps/selleres-app/ManagerBeyo-app-sellers/`.

### Existing files to edit

| Path | Change summary |
|---|---|
| `src/app/App.tsx` | Replace Phase A placeholder with `RouterProvider + AppProviders` wiring |

### New files to create

| Path | Content origin |
|---|---|
| `src/app/providers.tsx` | Seller-specific (see step 2) |
| `src/app/AppShell.tsx` | Verbatim copy from manager |
| `src/app/RootRoute.tsx` | Seller-specific — `appScope="seller"`, surface IDs from `@beyo/tasks` |
| `src/app/TabOutlet.tsx` | Verbatim copy from manager |
| `src/app/SurfaceRouteFrame.tsx` | Verbatim copy from manager |
| `src/app/router.tsx` | Seller-specific (see step 6) |
| `src/app/socket-registry.ts` | Seller-specific (see step 7) |
| `src/app/NotificationRealtimeMount.tsx` | Verbatim copy from manager |
| `src/app/PushMount.tsx` | Verbatim copy from manager |
| `src/app/NotificationDeepLinkMount.tsx` | Seller-specific — imports task surface IDs from `@beyo/tasks` (see step 10) |
| `src/types/common.ts` | Verbatim copy from manager |
| `src/providers/TabBadgeCountsProvider.tsx` | Verbatim copy from manager |
| `src/hooks/use-tab-badge-counts.controller.ts` | Verbatim copy from manager |
| `src/components/shell/BottomTabBar.tsx` | Verbatim copy from manager |
| `src/components/shell/MoreTabsPopup.tsx` | Verbatim copy from manager |
| `src/components/shell/use-more-tab-last-selected.ts` | Verbatim copy from manager |
| `src/lib/primary-tab-preload.ts` | Verbatim copy from manager |
| `src/features/cases/surfaces.ts` | Phase B partial stub — only `preloadCaseConversationSlideSurface` (see step 18) |
| `src/features/pwa/surfaces.ts` | Phase B partial stub — only surface IDs and types (see step 19) |
| `src/features/tasks/socket-events.ts` | Seller version — copy current manager file verbatim (see step 20) |
| `src/pages/auth/SignInPage.tsx` | Seller-specific — `appScope="seller"`, title "Seller Beyo" (see step 21) |
| `src/pages/cases/CaseConversationPage.tsx` | Verbatim copy from manager |
| `src/pages/home/HomePage.tsx` | Final placeholder (see step 23) |
| `src/pages/stats/StatsPage.tsx` | Final placeholder (see step 23) |
| `src/pages/upholstery-inventory/UpholsteryInventoryPage.tsx` | Final placeholder (see step 23) |
| `src/pages/NotFoundPage.tsx` | Final (see step 23) |
| `src/pages/tasks/TasksPage.tsx` | **Phase B stub** — replaced in Phase C (see step 24) |
| `src/pages/cases/CasesPage.tsx` | **Phase B stub** — replaced in Phase C (see step 24) |
| `src/pages/settings/SettingsPage.tsx` | **Phase B stub** — replaced in Phase C (see step 24) |

## Clarifications required

None — Phase B is fully specified.

## Acceptance criteria

1. `npm run typecheck` exits with zero errors.
2. `npm run dev` starts; browser shows the sign-in page at `/sign-in`.
3. Signing in with a seller account navigates to `/` (home placeholder).
4. Tapping all five BottomTabBar tabs navigates to the correct routes with the horizontal slide animation.
5. The "More" popup reveals stats, upholstery-inventory, and settings stubs.
6. Hard-refreshing any tab route renders the correct stub/placeholder (no 404 in dev).

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo package boundary.
- `architecture/12_auth.md` + `12_auth_local.md`: `AuthProvider` `appScope` field; `SignInForm` usage; `GuestRoute` / `ProtectedRoute` from `@beyo/auth`.
- `architecture/21_realtime.md`: `RealtimeProvider` + `socketRegistry` wiring.
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: `SurfaceProvider` wraps `BaseSurfaceProvider` from `@beyo/ui`; `useSurfaceStore.getState()` for imperative ops.
- `architecture/11_routing.md`: `createBrowserRouter`, nested routes, `lazyRoute`, `tabRoute` helper.
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload` in `primary-tab-preload.ts`.

### File read intent

Permitted reads: all manager source files listed in the verbatim-copy table above, plus the current seller `src/app/surface-registry.ts` (to confirm it is the Phase A empty stub — do not overwrite it).

## Implementation plan

### Step 1 — Update `src/app/App.tsx`

Replace the Phase A placeholder content:

```tsx
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers';
import { router } from './router';

export function App(): React.JSX.Element {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
```

---

### Step 2 — Create `src/app/providers.tsx`

```tsx
import type { ReactNode } from 'react';
import { KeyboardInsetProvider } from '@beyo/ui';
import { useCameraAppLifecycleFlow } from '@beyo/scanner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { Toaster } from 'sonner';
import { BreakpointProvider } from '@/providers/BreakpointProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
    mutations: { retry: 0 },
  },
});

type AppProvidersProps = {
  children: ReactNode;
};

function CameraLifecycleHandler(): null {
  useCameraAppLifecycleFlow();
  return null;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <BreakpointProvider>
          <KeyboardInsetProvider>
            <QueryClientProvider client={queryClient}>
              <CameraLifecycleHandler />
              {children}
              <Toaster position="top-center" richColors />
            </QueryClientProvider>
          </KeyboardInsetProvider>
        </BreakpointProvider>
      </LazyMotion>
    </MotionConfig>
  );
}
```

---

### Step 3 — Create `src/app/RootRoute.tsx`

Key seller deltas vs. manager:
- `appScope="seller"` in `AuthProvider`.
- `TASK_DETAIL_SURFACE_ID` and `TaskDetailSurfaceProps` imported from `@beyo/tasks` directly (not from `@/features/tasks/surfaces` which does not exist until Phase C).
- PWA surface IDs imported from `@/features/pwa/surfaces` (Phase B partial stub created in step 19).

```tsx
import { Outlet } from "react-router-dom";
import { PwaProvider, type PwaSurfaceOpeners } from "@beyo/pwa";
import { RealtimeProvider } from "@beyo/realtime";
import { AuthProvider } from "@beyo/auth";
import { TASK_DETAIL_SURFACE_ID, type TaskDetailSurfaceProps } from "@beyo/tasks";
import { NotificationDeepLinkMount } from "@/app/NotificationDeepLinkMount";
import { NotificationRealtimeMount } from "@/app/NotificationRealtimeMount";
import { PushMount } from "@/app/PushMount";
import { socketRegistry } from "@/app/socket-registry";
import {
  PWA_INSTALL_SURFACE_ID,
  PWA_UPDATE_SURFACE_ID,
} from "@/features/pwa/surfaces";
import { ROUTES } from "@/lib/routes";
import { SurfaceProvider, useSurfaceStore } from "@/providers/SurfaceProvider";

void TASK_DETAIL_SURFACE_ID satisfies string;
void (undefined as unknown as TaskDetailSurfaceProps);

const pwaSurfaceOpeners: PwaSurfaceOpeners = {
  openUpdatePrompt: (props) =>
    useSurfaceStore.getState().open(PWA_UPDATE_SURFACE_ID, props),
  openInstallPrompt: (props) =>
    useSurfaceStore.getState().open(PWA_INSTALL_SURFACE_ID, props),
  closeInstallPrompt: () =>
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID),
};

export function RootRoute(): React.JSX.Element {
  return (
    <RealtimeProvider registry={socketRegistry}>
      <SurfaceProvider>
        <PwaProvider surfaceOpeners={pwaSurfaceOpeners}>
          <AuthProvider appScope="seller" signInRoute={ROUTES.signIn}>
            <NotificationRealtimeMount />
            <PushMount />
            <NotificationDeepLinkMount />
            <Outlet />
          </AuthProvider>
        </PwaProvider>
      </SurfaceProvider>
    </RealtimeProvider>
  );
}
```

> Note: the two `void` statements at the top are removed once the real task surfaces file exists in Phase C and those imports are consumed by actual usage. They exist only to silence `noUnusedLocals` during Phase B while the deep-link mount uses the values at runtime. Alternatively, Codex may remove the `void` lines and instead rely on the fact that `NotificationDeepLinkMount` consumes both from `@beyo/tasks` — in which case omit those two `void` lines entirely and do NOT import them here (they're imported inside `NotificationDeepLinkMount`).

---

### Step 4 — Create `src/app/router.tsx`

```tsx
import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { PageSkeleton, RouteErrorBoundary } from "@beyo/ui";
import { AppShell } from "@/app/AppShell";
import { RootRoute } from "@/app/RootRoute";
import { GuestRoute, ProtectedRoute } from "@beyo/auth";
import { lazyRoute } from "@/lib/lazy-route";
import {
  casesPageRoute,
  homePageRoute,
  settingsPageRoute,
  statsPageRoute,
  tasksPageRoute,
  upholsteryInventoryPageRoute,
} from "@/lib/primary-tab-preload";
import { ROUTES } from "@/lib/routes";

function tabRoute(Component: React.ComponentType): React.JSX.Element {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <Component />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootRoute />,
    children: [
      {
        element: <GuestRoute homePath={ROUTES.home} />,
        children: [
          {
            path: ROUTES.signIn,
            element: lazyRoute(() =>
              import("@/pages/auth/SignInPage").then((module) => ({
                default: module.SignInPage,
              })),
            ),
          },
        ],
      },
      {
        element: <ProtectedRoute signInPath={ROUTES.signIn} />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                path: ROUTES.home,
                element: tabRoute(homePageRoute.Component),
              },
              {
                path: ROUTES.tasks,
                element: tabRoute(tasksPageRoute.Component),
              },
              {
                path: ROUTES.cases,
                element: tabRoute(casesPageRoute.Component),
              },
              {
                path: ROUTES.caseConversation,
                element: lazyRoute(() =>
                  import("@/pages/cases/CaseConversationPage").then(
                    (module) => ({ default: module.CaseConversationPage }),
                  ),
                ),
              },
              {
                path: ROUTES.stats,
                element: tabRoute(statsPageRoute.Component),
              },
              {
                path: ROUTES.upholsteryInventory,
                element: tabRoute(upholsteryInventoryPageRoute.Component),
              },
              {
                path: ROUTES.settings,
                element: tabRoute(settingsPageRoute.Component),
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: lazyRoute(() =>
          import("@/pages/NotFoundPage").then((module) => ({
            default: module.NotFoundPage,
          })),
        ),
      },
    ],
  },
]);
```

---

### Step 5 — Create `src/app/socket-registry.ts`

The seller registers only the events relevant to its domain. Local `taskSocketEvents` is created in step 20.

```ts
import { caseSocketEvents } from "@beyo/cases";
import { notificationSocketEvents } from "@beyo/notifications";
import type { SocketEventHandlers } from "@beyo/realtime";
import { taskNoteSocketEvents } from "@beyo/task-notes";
import { taskSocketEvents } from "@/features/tasks/socket-events";

export const socketRegistry: SocketEventHandlers = {
  ...caseSocketEvents,
  ...taskSocketEvents,
  ...taskNoteSocketEvents,
  ...notificationSocketEvents,
};
```

---

### Step 6 — Create `src/app/NotificationDeepLinkMount.tsx`

Identical to manager except:
- `TASK_DETAIL_SURFACE_ID` and `TaskDetailSurfaceProps` imported from `@beyo/tasks` (not `@/features/tasks/surfaces`).
- Upholstery deep-link case is omitted — sellers do not receive upholstery push notifications.

```tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useMarkNotificationsRead,
  type NotificationId,
} from "@beyo/notifications";
import { TASK_DETAIL_SURFACE_ID, type TaskDetailSurfaceProps } from "@beyo/tasks";
import { buildCaseConversationRoute } from "@/lib/routes";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

const NOTIFICATION_PARAM_KEYS = ["notif_type", "notif_id", "notif_cid"];

function stripNotificationParams(search: string): string {
  const params = new URLSearchParams(search);
  NOTIFICATION_PARAM_KEYS.forEach((key) => params.delete(key));
  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : "";
}

export function NotificationDeepLinkMount(): null {
  const location = useLocation();
  const navigate = useNavigate();
  const { markRead } = useMarkNotificationsRead();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notifType = params.get("notif_type");
    const notifId = params.get("notif_id");
    const notifCid = params.get("notif_cid");

    if (!notifType) return;

    if (notifCid) {
      markRead({
        notification_client_ids: [notifCid as NotificationId],
        mark_all_read: false,
      });
    }

    switch (notifType) {
      case "task":
      case "task_step": {
        navigate(
          {
            pathname: location.pathname,
            search: stripNotificationParams(location.search),
          },
          { replace: true },
        );

        if (notifId) {
          useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
            taskId: notifId,
          } satisfies TaskDetailSurfaceProps);
        }
        break;
      }
      case "case":
        if (notifId) {
          navigate(buildCaseConversationRoute(notifId), { replace: true });
        }
        break;
      default:
        break;
    }
  }, [location.pathname, location.search, markRead, navigate]);

  return null;
}
```

---

### Steps 7–17 — Verbatim copies from manager

For each row, read the manager source path and write the content verbatim to the seller destination. No modifications.

| # | Create at (seller `src/`) | Copy from (manager `src/`) |
|---|---|---|
| 7 | `app/AppShell.tsx` | `app/AppShell.tsx` |
| 8 | `app/TabOutlet.tsx` | `app/TabOutlet.tsx` |
| 9 | `app/SurfaceRouteFrame.tsx` | `app/SurfaceRouteFrame.tsx` |
| 10 | `app/NotificationRealtimeMount.tsx` | `app/NotificationRealtimeMount.tsx` |
| 11 | `app/PushMount.tsx` | `app/PushMount.tsx` |
| 12 | `types/common.ts` | `types/common.ts` |
| 13 | `providers/TabBadgeCountsProvider.tsx` | `providers/TabBadgeCountsProvider.tsx` |
| 14 | `hooks/use-tab-badge-counts.controller.ts` | `hooks/use-tab-badge-counts.controller.ts` |
| 15 | `components/shell/BottomTabBar.tsx` | `components/shell/BottomTabBar.tsx` |
| 16 | `components/shell/MoreTabsPopup.tsx` | `components/shell/MoreTabsPopup.tsx` |
| 17 | `components/shell/use-more-tab-last-selected.ts` | `components/shell/use-more-tab-last-selected.ts` |

> Manager base path: `apps/managers-app/ManagerBeyo-app-managers/src/`

---

### Step 18 — Create `src/lib/primary-tab-preload.ts`

Verbatim copy from manager `src/lib/primary-tab-preload.ts`. The file references `@/pages/tasks/TasksPage`, `@/pages/cases/CasesPage`, etc. — all of which exist as stubs (created in step 24) so typecheck passes.

---

### Step 19 — Create `src/features/cases/surfaces.ts` (Phase B partial stub)

The `use-tab-badge-counts.controller.ts` (step 14) imports `preloadCaseConversationSlideSurface` from this file. The real `caseSurfaces` object is not added until Phase C.

```ts
export function preloadCaseConversationSlideSurface(): Promise<void> {
  return Promise.resolve();
}
```

Phase C overwrites this file with the full `caseSurfaces` surface registrations.

---

### Step 20 — Create `src/features/pwa/surfaces.ts` (Phase B partial stub)

`RootRoute.tsx` (step 3) imports the two PWA surface ID constants from here. The `pwaSurfaces` object and page imports are added in Phase C.

```ts
import type { PwaInstallSurfaceProps, PwaUpdateSurfaceProps } from "@beyo/pwa";

export type { PwaInstallSurfaceProps, PwaUpdateSurfaceProps };

export const PWA_UPDATE_SURFACE_ID = "pwa-update";
export const PWA_INSTALL_SURFACE_ID = "pwa-install";
```

Phase C adds `pwaSurfaces` and the page loader functions to this file.

---

### Step 21 — Create `src/features/tasks/socket-events.ts`

Copy verbatim from the **current** manager file at:
`apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/socket-events.ts`

This file uses `@beyo/tasks`, `@beyo/task-working-sections`, `@beyo/realtime`, and `@/types/common` — all available in Phase B.

---

### Step 22 — Create `src/pages/auth/SignInPage.tsx`

Seller-specific: `appScope="seller"` and heading "Seller Beyo".

```tsx
import { useNavigate } from "react-router-dom";
import { SignInForm } from "@beyo/auth";
import { RouteErrorBoundary } from "@/components/ui/RouteErrorBoundary";
import { ROUTES } from "@/lib/routes";

export function SignInPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <RouteErrorBoundary>
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="relative w-full max-w-sm">
          <div className="absolute bottom-full left-1/2 mb-[50px] w-full -translate-x-1/2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Seller Beyo
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your workspace
            </p>
          </div>
          <div className="w-full rounded-2xl border border-border bg-white p-6 shadow-sm">
            <SignInForm
              appScope="seller"
              onSuccess={() => navigate(ROUTES.home, { replace: true })}
            />
          </div>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}
```

---

### Step 23 — Create `src/pages/cases/CaseConversationPage.tsx`

Verbatim copy from manager `src/pages/cases/CaseConversationPage.tsx`. Only imports from `@beyo/cases`, `@beyo/lib`, `react-router-dom`, and `@/components/ui/PageSkeleton` — all present in Phase B.

---

### Step 24 — Create final placeholder pages

These four pages are their permanent final form — they are never replaced in Phase C.

**`src/pages/home/HomePage.tsx`**
```tsx
export function HomePage(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Home
    </div>
  );
}
```

**`src/pages/stats/StatsPage.tsx`**
```tsx
export function StatsPage(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Stats
    </div>
  );
}
```

**`src/pages/upholstery-inventory/UpholsteryInventoryPage.tsx`**
```tsx
export function UpholsteryInventoryPage(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Upholstery Inventory
    </div>
  );
}
```

**`src/pages/NotFoundPage.tsx`**
```tsx
export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Page not found
    </div>
  );
}
```

---

### Step 25 — Create Phase B stub pages

These three stubs satisfy TypeScript for lazy imports in `primary-tab-preload.ts` and `router.tsx`. Phase C replaces each with a real implementation.

**`src/pages/tasks/TasksPage.tsx`** (stub — Phase C replaces)
```tsx
export function TasksPage(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Tasks
    </div>
  );
}
```

**`src/pages/cases/CasesPage.tsx`** (stub — Phase C replaces)
```tsx
export function CasesPage(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Cases
    </div>
  );
}
```

**`src/pages/settings/SettingsPage.tsx`** (stub — Phase C replaces)
```tsx
export function SettingsPage(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Settings
    </div>
  );
}
```

---

### Final step — Confirm `src/app/surface-registry.ts` is unchanged

The Phase A empty stub (`surfaceRegistry: SurfaceRegistrations = {}`) must remain as-is. Do NOT modify it in Phase B. Phase C replaces it with the real registry.

## Risks and mitigations

- Risk: `RootRoute.tsx` may have a TypeScript `noUnusedLocals` error if `TASK_DETAIL_SURFACE_ID` / `TaskDetailSurfaceProps` are imported but not used directly in this file.
  Mitigation: Those imports are not needed in `RootRoute.tsx` — they are used inside `NotificationDeepLinkMount.tsx`. Remove both imports from `RootRoute.tsx` entirely (the `void` lines in step 3 should be omitted). The step 3 code already shows them only as a note — implement without the `void` lines.

- Risk: `use-tab-badge-counts.controller.ts` (verbatim copy, step 14) calls `preloadCaseConversationSlideSurface()` which is a no-op stub in Phase B. This is intentional — the preload becomes functional in Phase C when Phase B stub is replaced with real cases surfaces.

- Risk: `src/app/surface-registry.ts` empty stub means no surfaces will open at runtime in Phase B. This is intentional and expected — the Phase B validation criterion explicitly does not include surface interaction.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run dev`: sign-in page renders at `/sign-in`; "Seller Beyo" heading visible.
- Sign in with a seller-scoped account → redirects to `/`; BottomTabBar renders with 4 visible tab buttons + "More".
- Tap Tasks tab → "Tasks" stub text visible.
- Tap Cases tab → "Cases" stub text visible.
- Tap Home tab → "Home" placeholder visible.
- Tap More → popup shows Stats, Upholstery Inventory, Settings entries.
- Navigate to `/stats` → "Stats" placeholder visible.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
