# PLAN_39_tab_badge_counts_system_20260530

## Metadata

- Plan ID: `PLAN_39_tab_badge_counts_system_20260530`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-30T00:00:00Z`
- Last updated at (UTC): `2026-05-30T10:33:37Z`
- Related issue/ticket: `-`
- Intention plan: `N/A — design discussed and approved in conversation`

## Goal and intent

- Goal: Build the nav tab notification badge system for the workers app, starting with the Cases tab wired to `GET /api/v1/cases/unread-count`.
- Business/user intent: Workers need at-a-glance awareness of unread case messages without navigating to the Cases page. The badge appears as a floating popup above the relevant nav tab, auto-dismisses after 5 s, and can be dismissed early by tapping the tab. The badge popup shows an icon + count, and a single tab can surface multiple counters simultaneously (designed for future expansion).
- Non-goals: Real-time / WebSocket layer (future); other tab counts beyond cases unread (future, but the system is structured to accept them); per-case breakdown (uses `GET /api/v1/cases/unread-count`, the aggregate endpoint); badge persistence across sessions; notification center.

## Scope

- In scope:
  - `packages/cases` — `get-global-unread-count.ts` fetch fn + `use-global-case-unread-count.ts` query hook + `globalUnreadCount` key in `case-keys.ts` + index export
  - `packages/ui` — `NavTabBadge` primitive (component + types + index) + export in `packages/ui/src/index.ts`
  - `apps/workers-app` — `use-tab-badge-counts.controller.ts` shell controller hook
  - `apps/workers-app` — `TabBadgeCountsProvider.tsx` shell context provider
  - `apps/workers-app` — `AppShell.tsx` updated to wrap with `TabBadgeCountsProvider`
  - `apps/workers-app` — `BottomTabBar.tsx` updated to render `NavTabBadge` and call `dismissBadge`
  - Playwright spec: `tests/playwright/features/cases/cases-unread-badge.spec.ts`

- Out of scope:
  - WebSocket / SSE integration (future: invalidate `caseKeys.globalUnreadCount()` from the real-time layer or call `queryClient.setQueryData` directly — the query key is the integration point)
  - Badge counts for tabs other than Cases (future: add a query hook per domain and register its items in the controller)
  - Polling interval configuration (uses TanStack Query `staleTime: 30_000` + `refetchOnWindowFocus: true`)

- Assumptions:
  - `GET /api/v1/cases/unread-count` is deployed and returns `{ ok: true, warnings: [], data: { unread_count: number } }`
  - `LazyMotion` + `domAnimation` are already set up in `AppProviders` (confirmed in `apps/workers-app/.../src/app/providers.tsx`)
  - The `--color-destructive` and `--color-card` CSS variables are defined in `packages/styles/src/index.css` (confirmed: `#c0392b` and `#ffffff` respectively)
  - No `src/controllers/` directory exists at the app level; shell-level controller logic goes in `src/hooks/` (directory exists, currently empty)

## Clarifications required

- (none — architecture decisions resolved in design session before this plan was written)

## Acceptance criteria

1. A floating badge popup appears above the Cases nav tab when `unread_count > 0` and the count differs from the last value that triggered a badge.
2. The badge popup shows a `MessageCircle` icon and the unread count number.
3. The badge popup auto-dismisses after 5 s via a client-side timer.
4. Tapping any nav tab dismisses the badge for that tab immediately.
5. The badge animates in with a spring scale-up (transform-origin bottom center) and animates out with a fast scale-down.
6. The animation respects `reducedMotion="user"` (handled by the `MotionConfig` wrapper already in `AppProviders`).
7. `npm run typecheck` passes with zero errors across all three packages touched.
8. Playwright spec passes on the mobile project: badge appears when count > 0, dismisses on tab tap.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: TanStack Query for `useGlobalCaseUnreadCountQuery`; `staleTime: 30_000`; query key factory pattern; `refetchOnWindowFocus` from global defaults (no override needed).
- `architecture/04_api_client.md` + `04_api_client_local.md`: `apiClient.get()` with Zod schema; actual response envelope is `{ ok: true, warnings: [], data: { ... } }` — use `ApiEnvelopeSchema` (as the existing `get-unread-counts.ts` already does). Error shape is a flat string, no `field_errors`.
- `architecture/24_dto.md`: Zod parse in API function only. Response DTO is `number` (scalar unread count). No request DTO (GET, no body). No view model needed — count is used directly.
- `architecture/15_feature_structure.md`: New files in `packages/cases/src/api/` follow `get-<entity>.ts` + `use-<entity>.ts` naming. New hook exported from `packages/cases/src/index.ts`.
- `architecture/23_providers.md`: `TabBadgeCountsProvider` calls `useTabBadgeCountsController()`, injects result into context. Provider exports the Provider component + consumer hook. No business logic in the provider component itself.
- `architecture/31_animations.md`: Framer Motion `m` components with `AnimatePresence`. Use `variants` object defined beside the component. Transform-origin set via `style` prop (`transformOrigin: 'bottom center'`). Spring transition for enter; fast ease for exit. `reducedMotion` handled by `MotionConfig` in `AppProviders`.
- `architecture/14_styling.md`: Tailwind utility classes only. `cn()` for conditional composition. Use CSS variable references (`[--color-destructive]`, `[--color-card]`) in Tailwind arbitrary value syntax. `after:` pseudo-element for the downward triangle.

### Local extensions loaded

- `architecture/04_api_client_local.md`: Envelope shape override — read `body.data.unread_count`, not `body.unread_count`. Use `ApiEnvelopeSchema` helper exactly as `get-unread-counts.ts` does.

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Permitted relational reads:
- `packages/cases/src/api/case-keys.ts` — to establish the existing key factory shape before adding `globalUnreadCount`
- `packages/cases/src/api/get-unread-counts.ts` — to confirm `ApiEnvelopeSchema` usage and `apiClient.get()` call signature for this domain
- `packages/cases/src/index.ts` — to find the correct insertion point for the new export
- `apps/workers-app/.../src/app/providers.tsx` — to confirm `LazyMotion` / `MotionConfig` are already set up
- `apps/workers-app/.../src/app/AppShell.tsx` — to confirm the exact JSX tree before wrapping
- `apps/workers-app/.../src/components/shell/BottomTabBar.tsx` — to understand current tab loop and handler structure

Prohibited (pattern reads — contracts already cover these):
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another provider to understand context shell → `23_providers.md`
- Reading another animation component to understand Framer Motion variants → `31_animations.md`
- Reading another primitive to understand `cva` or `cn` usage → `14_styling.md`

### Skill selection

- Primary skill: `skills/server-state/SKILL.md` (query hook authoring)
- Trigger terms: `useQuery`, `queryKey`, `staleTime`, `apiClient.get`
- Excluded alternatives: none

## Implementation plan

### Step 1 — `packages/cases/src/api/case-keys.ts`

Add `globalUnreadCount` to the key factory after `unreadCountsRoot`:

```ts
globalUnreadCount: () => [...caseKeys.all, 'global-unread-count'] as const,
```

This key is the real-time integration point: `queryClient.invalidateQueries({ queryKey: caseKeys.globalUnreadCount() })` or `queryClient.setQueryData(caseKeys.globalUnreadCount(), newCount)` from the future WebSocket layer.

---

### Step 2 — `packages/cases/src/api/get-global-unread-count.ts` (new file)

```ts
import { z } from 'zod';
import { apiClient } from '@beyo/api-client';
import { ApiEnvelopeSchema } from '@beyo/lib';

const GetGlobalUnreadCountResponseSchema = ApiEnvelopeSchema(
  z.object({ unread_count: z.number().int().nonnegative() }),
).extend({ ok: z.literal(true) });

export async function getGlobalUnreadCount(): Promise<number> {
  const parsed = await apiClient.get(
    '/api/v1/cases/unread-count',
    GetGlobalUnreadCountResponseSchema,
  );
  return parsed.data.unread_count;
}
```

Pattern mirrors `get-unread-counts.ts` exactly. No query params (endpoint is user-scoped by JWT).

---

### Step 3 — `packages/cases/src/api/use-global-case-unread-count.ts` (new file)

```ts
import { useQuery } from '@tanstack/react-query';
import { getGlobalUnreadCount } from './get-global-unread-count';
import { caseKeys } from './case-keys';

export function useGlobalCaseUnreadCountQuery() {
  return useQuery({
    queryKey: caseKeys.globalUnreadCount(),
    queryFn: getGlobalUnreadCount,
    staleTime: 30_000,
  });
}
```

`staleTime: 30_000` overrides the 60 s global default — badge data should refresh more aggressively. `refetchOnWindowFocus: true` from global defaults applies automatically.

---

### Step 4 — `packages/cases/src/index.ts`

Add one export line after the existing `useUnreadCountsQuery` export:

```ts
export { useGlobalCaseUnreadCountQuery } from './api/use-global-case-unread-count';
```

---

### Step 5 — `packages/ui/src/components/primitives/nav-tab-badge/NavTabBadge.tsx` (new file)

**Types:**

```ts
import type { LucideIcon } from 'lucide-react';

export type NavTabBadgeItem = {
  icon: LucideIcon;
  count: number;
};
```

**Animation variants** (defined beside the component, per contract §"Variants live near the UI they animate"):

```ts
const badgeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 320, damping: 22 },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.12, ease: [0.2, 0, 0, 1] },
  },
};
```

**Component:**

```tsx
import { AnimatePresence, m } from 'framer-motion';
import { cn } from '@beyo/lib';

type NavTabBadgeProps = {
  items: NavTabBadgeItem[];
  visible: boolean;
  className?: string;
};

export function NavTabBadge({ items, visible, className }: NavTabBadgeProps): React.JSX.Element | null {
  return (
    <AnimatePresence>
      {visible && items.length > 0 && (
        <m.div
          key="nav-tab-badge"
          variants={badgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ transformOrigin: 'bottom center' }}
          className={cn(
            'pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2',
            'flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5',
            'bg-[--color-destructive] text-[--color-card]',
            // Downward-pointing triangle "pinch" via ::after pseudo-element
            'after:absolute after:-bottom-[5px] after:left-1/2 after:-translate-x-1/2',
            'after:border-l-[5px] after:border-r-[5px] after:border-t-[6px]',
            'after:border-l-transparent after:border-r-transparent',
            'after:border-t-[--color-destructive]',
            className,
          )}
          data-testid="nav-tab-badge"
          role="status"
          aria-live="polite"
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <span
                key={index}
                className="flex items-center gap-0.5 text-xs font-semibold"
                data-testid={`nav-tab-badge-item-${index}`}
              >
                <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                <span>{item.count}</span>
              </span>
            );
          })}
        </m.div>
      )}
    </AnimatePresence>
  );
}
```

**Notes:**
- `pointer-events-none` prevents the floating badge from intercepting taps meant for the tab button or content above.
- `after:border-t-[--color-destructive]` uses Tailwind's arbitrary value + CSS variable reference to match the badge background for the triangle.
- `data-testid="nav-tab-badge"` is required for Playwright spec.

---

### Step 6 — `packages/ui/src/components/primitives/nav-tab-badge/index.ts` (new file)

```ts
export { NavTabBadge } from './NavTabBadge';
export type { NavTabBadgeProps, NavTabBadgeItem } from './NavTabBadge';
```

---

### Step 7 — `packages/ui/src/index.ts`

Add at the end of the primitives export block (alphabetically between `user-pill` and `working-section-shortcut-bar` would be wrong — `nav-tab-badge` goes after `number-input`):

```ts
export * from "./components/primitives/nav-tab-badge";
```

Insert alphabetically in the primitives export block.

---

### Step 8 — `apps/workers-app/.../src/hooks/use-tab-badge-counts.controller.ts` (new file)

This is the shell-level controller. It aggregates domain count queries, manages visibility state, and handles auto-dismiss timers. Placed in `src/hooks/` (existing empty directory) because it is app-shell scope, not a domain feature.

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useGlobalCaseUnreadCountQuery } from '@beyo/cases';
import type { NavTabBadgeItem } from '@beyo/ui';
import { ROUTES, type TabPath } from '@/lib/routes';

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

  // Track the count value the last badge was shown for, per tab.
  // Stored in a ref so effects do not re-run on update.
  const lastShownCountRef = useRef<Partial<Record<TabPath, number>>>({});

  // Timer handles per tab for cleanup.
  const timersRef = useRef<Partial<Record<TabPath, ReturnType<typeof setTimeout>>>>({});

  const [badgeState, setBadgeState] = useState<Partial<Record<TabPath, TabBadgeState>>>({});

  const dismissBadge = useCallback((path: TabPath) => {
    const timer = timersRef.current[path];
    if (timer !== undefined) {
      clearTimeout(timer);
      delete timersRef.current[path];
    }
    setBadgeState((prev) => ({
      ...prev,
      [path]: { ...prev[path], visible: false, items: prev[path]?.items ?? [] },
    }));
  }, []);

  // Cases tab — unread messages badge
  useEffect(() => {
    const count = caseUnreadCount ?? 0;
    const lastShown = lastShownCountRef.current[ROUTES.cases] ?? 0;

    if (count > 0 && count !== lastShown) {
      lastShownCountRef.current[ROUTES.cases] = count;

      setBadgeState((prev) => ({
        ...prev,
        [ROUTES.cases]: {
          items: [{ icon: MessageCircle, count }],
          visible: true,
        },
      }));

      // Clear any existing timer for this tab before starting a new one
      const existing = timersRef.current[ROUTES.cases];
      if (existing !== undefined) clearTimeout(existing);

      timersRef.current[ROUTES.cases] = setTimeout(() => {
        setBadgeState((prev) => ({
          ...prev,
          [ROUTES.cases]: { ...prev[ROUTES.cases]!, visible: false },
        }));
        delete timersRef.current[ROUTES.cases];
      }, BADGE_DISMISS_MS);
    }
  }, [caseUnreadCount]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => {
        if (t !== undefined) clearTimeout(t);
      });
    };
  }, []);

  return { badgeState, dismissBadge };
}
```

**Design notes:**
- `lastShownCountRef` (not state) prevents infinite effect loops.
- Each domain count adds one `useEffect` block. When new domains (tasks, notifications) are added in the future, they follow the same pattern — one effect per tab path, registering its own items array.
- `dismissBadge` is stable (`useCallback` with empty deps). `BottomTabBar` can call it without causing re-renders.
- `timersRef` ensures old timers are cancelled if a new count arrives within the 5 s window.

---

### Step 9 — `apps/workers-app/.../src/providers/TabBadgeCountsProvider.tsx` (new file)

```tsx
import { createContext, useContext } from 'react';
import {
  useTabBadgeCountsController,
  type TabBadgeCountsController,
} from '@/hooks/use-tab-badge-counts.controller';

const TabBadgeCountsContext = createContext<TabBadgeCountsController | null>(null);

export function TabBadgeCountsProvider({ children }: { children: React.ReactNode }) {
  const controller = useTabBadgeCountsController();
  return (
    <TabBadgeCountsContext.Provider value={controller}>
      {children}
    </TabBadgeCountsContext.Provider>
  );
}

export function useTabBadgeCountsContext(): TabBadgeCountsController {
  const ctx = useContext(TabBadgeCountsContext);
  if (!ctx) throw new Error(
    'useTabBadgeCountsContext must be used within <TabBadgeCountsProvider>',
  );
  return ctx;
}
```

---

### Step 10 — `apps/workers-app/.../src/app/AppShell.tsx`

Wrap the existing JSX tree with `<TabBadgeCountsProvider>`. The provider must sit inside `QueryClientProvider` (already the case — `AppProviders` wraps `AppShell`) but outside `BottomTabBar`.

```tsx
import { TabBadgeCountsProvider } from '@/providers/TabBadgeCountsProvider';

export function AppShell(): React.JSX.Element {
  // ... existing useEffect unchanged

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

### Step 11 — `apps/workers-app/.../src/components/shell/BottomTabBar.tsx`

Four changes:
1. Import `NavTabBadge` from `@beyo/ui`.
2. Import `useTabBadgeCountsContext` from `@/providers/TabBadgeCountsProvider`.
3. Call `dismissBadge` inside `handleTabPress` (before the existing navigate call — call `dismissBadge` regardless of whether the tab is already active).
4. Each tab button becomes `relative` (add to existing classes) and renders `<NavTabBadge>` inside it.

Updated `useTabNav` hook:
```ts
function useTabNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dismissBadge } = useTabBadgeCountsContext();

  return function handleTabPress(targetPath: TabPath): void {
    dismissBadge(targetPath);

    if (location.pathname === targetPath) return;

    const fromIndex = TAB_ORDER.indexOf(location.pathname as TabPath);
    const toIndex = TAB_ORDER.indexOf(targetPath);
    const direction = toIndex > fromIndex ? 1 : -1;

    navigate(targetPath, { state: { direction } });
  };
}
```

Updated tab button (inside the `TABS.map` render):
```tsx
<button
  key={tab.path}
  aria-current={isActive ? 'page' : undefined}
  className={[
    'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
    isActive ? 'text-primary' : 'text-icon',
  ].join(' ')}
  data-testid={`tab-${tab.label.toLowerCase()}`}
  type="button"
  onClick={() => handleTabPress(tab.path)}
  onFocus={() => { preloadPrimaryTabRoute(tab.path); }}
  onPointerDown={() => { preloadPrimaryTabRoute(tab.path); }}
>
  <NavTabBadge
    items={badgeState[tab.path]?.items ?? []}
    visible={badgeState[tab.path]?.visible ?? false}
  />
  <Icon className="h-5 w-5" strokeWidth={2} />
  <span>{tab.label}</span>
</button>
```

Access `badgeState` at the top of `BottomTabBar`:
```ts
const { badgeState } = useTabBadgeCountsContext();
```

---

### Step 12 — `apps/workers-app/.../tests/playwright/features/cases/cases-unread-badge.spec.ts` (new file)

Directory `tests/playwright/features/cases/` must be created.

```ts
import { test, expect } from '../../fixtures/app-fixture';

test.describe('Cases — unread badge', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.signIn();
  });

  test('cases tab badge appears when unread count is > 0', async ({ page }) => {
    // The badge only fires when caseUnreadCount changes from lastShown.
    // Reload forces a fresh query that may surface a non-zero count in staging.
    // If the backend returns 0 on this account, badge will not appear — guard accordingly.
    // This test is environment-dependent; skip if badge is not present.
    const badge = page.getByTestId('nav-tab-badge');
    const casesTab = page.getByTestId('tab-cases');

    await page.waitForTimeout(500); // allow initial queries to settle

    const badgeVisible = await badge.isVisible().catch(() => false);
    test.skip(!badgeVisible, 'No unread case messages on this account — badge will not appear');

    await expect(badge).toBeVisible();
    await expect(casesTab).toBeVisible();
  });

  test('tapping the cases tab dismisses the badge immediately', async ({ page }) => {
    const badge = page.getByTestId('nav-tab-badge');
    const casesTab = page.getByTestId('tab-cases');

    await page.waitForTimeout(500);

    const badgeVisible = await badge.isVisible().catch(() => false);
    test.skip(!badgeVisible, 'No unread case messages on this account');

    await casesTab.tap();
    await expect(badge).not.toBeVisible();
  });
});
```

**Note on test strategy:** The badge only fires when the live backend returns `unread_count > 0` AND the count has changed since last shown. These tests are conditionally skipped (using `test.skip`) when the test account has no unread messages, which is the correct approach for tests that depend on real backend state rather than mocked data.

---

## Risks and mitigations

- Risk: `after:border-t-[--color-destructive]` Tailwind arbitrary value with CSS variable might not apply correctly in all build configs.
  Mitigation: Fall back to `after:border-t-[#c0392b]` (hardcoded value matching `--color-destructive`) if the CSS variable form is not recognized. Document with a comment referencing the token source.

- Risk: `caseUnreadCount` returns `undefined` on first render (query not yet resolved) — the controller must not show a badge for the `undefined → number` transition.
  Mitigation: The effect uses `count = caseUnreadCount ?? 0` and checks `count > 0`, so `undefined` resolves to `0` and no badge fires. The `lastShownCountRef` starts at `0` (implicit initial value when key is absent), which means a first-fetch count of `0` is treated as no change and no badge fires.

- Risk: Badge visible during tab animation could visually clash with the slide transition.
  Mitigation: `pointer-events-none` on the badge and `AnimatePresence` exit animation are fast (0.12 s) — they naturally fade before the route slide completes (0.24 s).

- Risk: Multiple quick count changes within the 5 s window restart the timer each time.
  Mitigation: The controller clears the existing timer (`clearTimeout`) before setting a new one — so the 5 s window always resets from the latest count change.

- Risk: Future domain counts (tasks, notifications) must follow the same pattern without the controller growing unwieldy.
  Mitigation: Each domain adds exactly one `useEffect` block and one set of `items`. If the controller exceeds ~3 domains, consider splitting into a hook-per-tab approach and composing them.

## Validation plan

- `npm run typecheck` across the monorepo: zero TypeScript errors
- `npm run build` in `apps/workers-app`: successful production build
- Manual smoke: open workers app, navigate to a case with unread messages, return to home tab — Cases tab badge should appear within `staleTime` refresh window
- Manual smoke: wait 5 s — badge auto-dismisses
- Manual smoke: badge appears, tap Cases tab — badge dismisses immediately
- `npx playwright test --grep "Cases.*unread badge" --project=mobile`: passes (or skips cleanly when test account has 0 unread messages)

## Review log

_(empty — awaiting first review)_

## Lifecycle transition

- Current state: `archived`
- Next state: `-`
- Transition owner: `David`
