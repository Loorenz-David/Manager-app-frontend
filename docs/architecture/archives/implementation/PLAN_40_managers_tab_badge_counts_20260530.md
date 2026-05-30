# PLAN_40_managers_tab_badge_counts_20260530

## Metadata

- Plan ID: `PLAN_40_managers_tab_badge_counts_20260530`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-30T00:00:00Z`
- Last updated at (UTC): `2026-05-30T10:49:15Z`
- Related issue/ticket: `-`
- Intention plan: `N/A — mirrors PLAN_39 for the managers app`

## Goal and intent

- Goal: Port the nav tab notification badge system from the workers app to the managers app. The shared primitives (`NavTabBadge` from `@beyo/ui`) and server-state layer (`useGlobalCaseUnreadCountQuery` from `@beyo/cases`) were already implemented in PLAN_39. This plan adds only the app-shell wiring that is local to the managers app.
- Business/user intent: Managers need the same at-a-glance awareness of unread case messages that workers have — a floating badge above the Cases tab that auto-dismisses after 5 s or immediately on tab tap.
- Non-goals: Any changes to `@beyo/cases` or `@beyo/ui` (already done). WebSocket / real-time integration (future). Badge counts for tabs other than Cases (future, but the controller is structured to accept them).

## Scope

- In scope:
  - `apps/managers-app` — `use-tab-badge-counts.controller.ts` shell controller hook (new file)
  - `apps/managers-app` — `TabBadgeCountsProvider.tsx` shell context provider (new file)
  - `apps/managers-app` — `AppShell.tsx` updated to wrap with `TabBadgeCountsProvider`
  - `apps/managers-app` — `BottomTabBar.tsx` updated to render `NavTabBadge` and call `dismissBadge`

- Out of scope:
  - Any changes to `packages/cases` or `packages/ui`
  - Playwright tests (the spec in the workers app covers the shared primitives; managers app environment-specific tests are deferred)

- Assumptions:
  - `@beyo/cases` and `@beyo/ui` are already resolved as dependencies of the managers app (same monorepo, peerDependencies pattern)
  - `LazyMotion` + `domAnimation` are already set up in the managers app `AppProviders` (verify before implementing — if not, add `LazyMotion` wrap following the workers app pattern)
  - `ROUTES`, `TAB_ORDER`, and `TabPath` are defined in `apps/managers-app/.../src/lib/routes.ts` — verified: identical shape to workers app

## Reference implementation

All four files below are direct mirrors of their workers app counterparts. Read each workers app file before writing the managers app version:

- `apps/workers-app/ManagerBeyo-app-workers/src/hooks/use-tab-badge-counts.controller.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/providers/TabBadgeCountsProvider.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/AppShell.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/BottomTabBar.tsx`

The managers app files have an identical structure (same routes, same tab labels/paths, same `ROUTES`/`TAB_ORDER`/`TabPath` types). No logic changes are needed — only path aliases differ (`@/` resolves to `apps/managers-app/.../src/`).

## Contracts and skills

- `architecture/23_providers.md`: `TabBadgeCountsProvider` pattern — provider calls controller, injects result into context, exports consumer hook.
- `architecture/05_server_state.md`: `useGlobalCaseUnreadCountQuery` is already exported from `@beyo/cases`; no new query hooks needed.
- `architecture/31_animations.md`: `NavTabBadge` is already implemented in `@beyo/ui`; no new animation code needed.

## Acceptance criteria

1. `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers` passes with zero errors.
2. The Cases tab in the managers app shows a floating badge popup when `unread_count > 0`.
3. The badge auto-dismisses after 5 s.
4. Tapping any nav tab in the managers app dismisses that tab's badge immediately.

## Implementation plan

### Step 1 — Verify `LazyMotion` is configured in managers app

Before writing any code, read:
- `apps/managers-app/ManagerBeyo-app-managers/src/app/providers.tsx`

Check whether it contains `<LazyMotion features={domAnimation}>` (or equivalent). The workers app has this in `AppProviders`; the managers app must too for Framer Motion's `m.*` components to work.

- If present: proceed to Step 2.
- If absent: add `LazyMotion` + `domAnimation` import and wrap the tree the same way as the workers app `providers.tsx`. Do this before any other step.

---

### Step 2 — `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-tab-badge-counts.controller.ts` (new file)

Copy the workers app controller verbatim:
- `apps/workers-app/ManagerBeyo-app-workers/src/hooks/use-tab-badge-counts.controller.ts`

No logic changes are required. The imports resolve correctly because `@/lib/routes` and `@beyo/cases`, `@beyo/ui` are available identically in the managers app.

Expected file content (mirror of workers app):

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

import { useGlobalCaseUnreadCountQuery } from "@beyo/cases";
import type { NavTabBadgeItem } from "@beyo/ui";

import { ROUTES, type TabPath } from "@/lib/routes";

const BADGE_DISMISS_MS = 5_000;

export type TabBadgeState = {
  items: NavTabBadgeItem[];
  visible: boolean;
};

export type TabBadgeCountsController = {
  badgeState: Partial<Record<TabPath, TabBadgeState>>;
  dismissBadge: (path: TabPath) => void;
};

export function useTabBadgeCountsController(): TabBadgeCountsController {
  const { data: caseUnreadCount } = useGlobalCaseUnreadCountQuery();

  const lastShownCountRef = useRef<Partial<Record<TabPath, number>>>({});
  const timersRef = useRef<
    Partial<Record<TabPath, ReturnType<typeof setTimeout>>>
  >({});
  const [badgeState, setBadgeState] = useState<
    Partial<Record<TabPath, TabBadgeState>>
  >({});

  const dismissBadge = useCallback((path: TabPath) => {
    const timer = timersRef.current[path];

    if (timer !== undefined) {
      clearTimeout(timer);
      delete timersRef.current[path];
    }

    setBadgeState((prev) => ({
      ...prev,
      [path]: {
        items: prev[path]?.items ?? [],
        visible: false,
      },
    }));
  }, []);

  useEffect(() => {
    const count = caseUnreadCount ?? 0;
    const lastShown = lastShownCountRef.current[ROUTES.cases] ?? 0;

    if (count <= 0 || count === lastShown) {
      return;
    }

    lastShownCountRef.current[ROUTES.cases] = count;

    setBadgeState((prev) => ({
      ...prev,
      [ROUTES.cases]: {
        items: [{ icon: MessageCircle, count }],
        visible: true,
      },
    }));

    const existingTimer = timersRef.current[ROUTES.cases];
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    timersRef.current[ROUTES.cases] = setTimeout(() => {
      setBadgeState((prev) => ({
        ...prev,
        [ROUTES.cases]: {
          items: prev[ROUTES.cases]?.items ?? [],
          visible: false,
        },
      }));
      delete timersRef.current[ROUTES.cases];
    }, BADGE_DISMISS_MS);
  }, [caseUnreadCount]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => {
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      });
    };
  }, []);

  return { badgeState, dismissBadge };
}
```

---

### Step 3 — `apps/managers-app/ManagerBeyo-app-managers/src/providers/TabBadgeCountsProvider.tsx` (new file)

Copy the workers app provider verbatim:
- `apps/workers-app/ManagerBeyo-app-workers/src/providers/TabBadgeCountsProvider.tsx`

No changes needed. Import path `@/hooks/use-tab-badge-counts.controller` resolves correctly.

Expected file content:

```tsx
import { createContext, useContext, type ReactNode } from "react";

import {
  useTabBadgeCountsController,
  type TabBadgeCountsController,
} from "@/hooks/use-tab-badge-counts.controller";

const TabBadgeCountsContext = createContext<TabBadgeCountsController | null>(
  null,
);

type TabBadgeCountsProviderProps = {
  children: ReactNode;
};

export function TabBadgeCountsProvider({
  children,
}: TabBadgeCountsProviderProps): React.JSX.Element {
  const controller = useTabBadgeCountsController();

  return (
    <TabBadgeCountsContext.Provider value={controller}>
      {children}
    </TabBadgeCountsContext.Provider>
  );
}

export function useTabBadgeCountsContext(): TabBadgeCountsController {
  const context = useContext(TabBadgeCountsContext);

  if (!context) {
    throw new Error(
      "useTabBadgeCountsContext must be used within <TabBadgeCountsProvider>",
    );
  }

  return context;
}
```

---

### Step 4 — `apps/managers-app/ManagerBeyo-app-managers/src/app/AppShell.tsx`

Add `TabBadgeCountsProvider` import and wrap the existing JSX tree.

Current file (read before editing):
- `apps/managers-app/ManagerBeyo-app-managers/src/app/AppShell.tsx`

Two changes:
1. Add import: `import { TabBadgeCountsProvider } from "@/providers/TabBadgeCountsProvider";`
2. Wrap the return value with `<TabBadgeCountsProvider>`:

```tsx
import { TabOutlet } from '@/app/TabOutlet';
import { useEffect } from 'react';
import { BottomTabBar } from '@/components/shell/BottomTabBar';
import { preloadPrimaryTabRoutes } from '@/lib/primary-tab-preload';
import { TabBadgeCountsProvider } from '@/providers/TabBadgeCountsProvider';

export function AppShell(): React.JSX.Element {
  useEffect(() => {
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;
    const requestIdle = window.requestIdleCallback?.bind(window);
    const cancelIdle = window.cancelIdleCallback?.bind(window);

    if (requestIdle) {
      idleHandle = requestIdle(() => {
        preloadPrimaryTabRoutes();
      });
    } else {
      timeoutHandle = window.setTimeout(() => {
        preloadPrimaryTabRoutes();
      }, 150);
    }

    return () => {
      if (idleHandle !== null && cancelIdle) {
        cancelIdle(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, []);

  return (
    <TabBadgeCountsProvider>
      <div
        className="flex h-dvh flex-col overflow-hidden bg-background pt-[var(--safe-top)]"
        data-testid="app-shell"
      >
        <main className="relative flex-1 overflow-hidden" id="main-content">
          <TabOutlet />
        </main>
        <BottomTabBar />
      </div>
    </TabBadgeCountsProvider>
  );
}
```

---

### Step 5 — `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/BottomTabBar.tsx`

Four changes mirroring the workers app:

1. Add `NavTabBadge` import from `@beyo/ui`
2. Add `useTabBadgeCountsContext` import from `@/providers/TabBadgeCountsProvider`
3. Add `dismissBadge` to `useTabNav` hook and call it at the top of `handleTabPress` (before the early-return guard)
4. Destructure `badgeState` from `useTabBadgeCountsContext()` in `BottomTabBar`, and render `<NavTabBadge>` as the first child of each tab button

Full expected result (read current file before editing):

```tsx
import {
  ChartColumnIncreasing,
  House,
  ListTodo,
  MessageCircle,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import { NavTabBadge } from '@beyo/ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { preloadPrimaryTabRoute } from '@/lib/primary-tab-preload';
import { useTabBadgeCountsContext } from '@/providers/TabBadgeCountsProvider';
import { ROUTES, TAB_ORDER, type TabPath } from '@/lib/routes';

type Tab = {
  label: string;
  icon: LucideIcon;
  path: TabPath;
};

const TABS: Tab[] = [
  { path: ROUTES.tasks, label: 'Tasks', icon: ListTodo },
  { path: ROUTES.cases, label: 'Cases', icon: MessageCircle },
  { path: ROUTES.home, label: 'Home', icon: House },
  { path: ROUTES.stats, label: 'Stats', icon: ChartColumnIncreasing },
  { path: ROUTES.settings, label: 'Settings', icon: Settings2 },
];

function useTabNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dismissBadge } = useTabBadgeCountsContext();

  return function handleTabPress(targetPath: TabPath): void {
    dismissBadge(targetPath);

    if (location.pathname === targetPath) {
      return;
    }

    const fromIndex = TAB_ORDER.indexOf(location.pathname as TabPath);
    const toIndex = TAB_ORDER.indexOf(targetPath);
    const direction = toIndex > fromIndex ? 1 : -1;

    navigate(targetPath, { state: { direction } });
  };
}

export function BottomTabBar(): React.JSX.Element {
  const location = useLocation();
  const handleTabPress = useTabNav();
  const { badgeState } = useTabBadgeCountsContext();
  const activeIndex = TABS.findIndex((tab) => tab.path === location.pathname);

  return (
    <nav
      aria-label="Main navigation"
      className="flex-shrink-0 border-t bg-background"
      data-testid="bottom-tab-bar"
    >
      <div className="relative flex h-[60px] items-stretch">
        <div
          aria-hidden="true"
          className="absolute top-0 h-0.5 w-1/5 bg-primary transition-[transform,opacity] duration-350 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            opacity: activeIndex === -1 ? 0 : 1,
          }}
        />
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={[
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-icon',
              ].join(' ')}
              data-testid={`tab-${tab.label.toLowerCase()}`}
              key={tab.path}
              onFocus={() => {
                preloadPrimaryTabRoute(tab.path);
              }}
              onClick={() => handleTabPress(tab.path)}
              onPointerDown={() => {
                preloadPrimaryTabRoute(tab.path);
              }}
              type="button"
            >
              <NavTabBadge
                items={badgeState[tab.path]?.items ?? []}
                visible={badgeState[tab.path]?.visible ?? false}
              />
              <Icon className="h-5 w-5" strokeWidth={2} />
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

---

## Validation plan

1. Run `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers` — must pass with zero errors.
2. Manual smoke: open managers app, verify the Cases tab badge appears when `unread_count > 0`.
3. Manual smoke: wait 5 s — badge auto-dismisses.
4. Manual smoke: badge visible, tap Cases tab — badge dismisses immediately.

## Review log

_(empty — awaiting first review)_

## Lifecycle transition

- Current state: `archived`
- Next state: `-`
- Transition owner: `codex`
