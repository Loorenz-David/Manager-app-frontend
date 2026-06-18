# PLAN_more_tabs_nav_20260618

## Metadata

- Plan ID: `PLAN_more_tabs_nav_20260618`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-18T00:00:00Z`
- Last updated at (UTC): `2026-06-18T12:28:16Z`
- Related issue/ticket: `—`
- Intention plan: `docs/architecture/under_construction/intention/—` (no formal intention file; brief is in `docs/architecture/under_construction/restructuring_nav_menu.txt`)

---

## Goal and intent

- **Goal:** Extend the bottom nav bar in both the managers app and workers app to support more than 5 tabs while keeping exactly 5 visible slots at all times. The 5th slot becomes a "More" trigger that opens a vertical popup column above it containing overflow tabs. The 4th slot becomes a dynamic slot that mirrors the last-selected overflow tab (persisted to localStorage).
- **Business/user intent:** As the app grows in features, the nav must be able to hold more destinations without sacrificing the clean 5-button UX. Users should never lose their last overflow selection on refresh.
- **Non-goals:** Adding new route destinations beyond the current five. Reordering tabs. Changing any route or page. Testing (unit/e2e) is deferred.

---

## Scope

- **In scope:**
  - New `VerticalScrollArea` primitive in `packages/ui` (adapted from `HorizontalScrollArea`)
  - Export `VerticalScrollArea` from `@beyo/ui`
  - `BottomTabBar` rewrite in both apps — replace Stats + Settings slots with Dynamic + More slots
  - `MoreTabsPopup` component in both apps — vertical column above the More button, nav-tab-styled rows
  - `useMoreTabLastSelected` hook in both apps — localStorage read/write with a safe fallback
  - Active indicator aligned to visual slot index (Dynamic slot is active when its path matches `location.pathname`)
  - Badge propagation: overflow tabs inside the popup still render `NavTabBadge`; More button shows an aggregate dot when any overflow tab has a visible badge
  - Popup open/close: toggle on More button tap, dismiss on outside click or Escape key
  - Slide-up + fade animation on popup open/close via CSS transition

- **Out of scope:**
  - Adding any new route/page beyond the current five tabs
  - Tab drag-to-reorder
  - Unit tests or Playwright specs
  - Any change to `TabBadgeCountsProvider` internals

- **Assumptions:**
  - Both apps start with exactly 2 overflow tabs: `ROUTES.stats` and `ROUTES.settings`
  - The overflow set never changes at runtime (it is a static compile-time array)
  - `localStorage` is available in both app environments (PWA, not SSR)
  - Each app keeps its own `BottomTabBar` and `MoreTabsPopup` files (no cross-app shared shell component introduced here)
  - `LayoutGrid` from `lucide-react` is used as the More button icon (it implies a grid of items — verify it exists in the installed lucide version before coding; fallback: `Grid3x3`)

---

## Clarifications required

_None that block safe implementation — all design decisions are resolved below._

---

## Acceptance criteria

1. Both apps render exactly 5 nav slots: Tasks | Cases | Home | [Dynamic] | [More].
2. Tapping the More button opens a vertical popup column above it with the overflow tabs (Stats, Settings); tapping it again closes the popup.
3. Selecting an overflow tab navigates to the route, saves the path to localStorage, updates the Dynamic slot's icon + label to match, and closes the popup.
4. After a full page refresh the Dynamic slot shows the last-selected overflow tab restored from localStorage; if no value is stored it defaults to Stats.
5. The popup becomes vertically scrollable when the number of overflow tabs exceeds the max-height cap (4 × 60 px = 240 px). Scrolling is indicated by the thin right-side track from `VerticalScrollArea`.
6. The active indicator (top border line) sits on the Dynamic slot when an overflow tab is the current `location.pathname`, and sits on slots 0–2 for the primary tabs. The More button never gets the indicator line.
7. Overflow tabs inside the popup correctly show `NavTabBadge` state from `useTabBadgeCountsContext`. The More button shows a small aggregate dot when any overflow tab has `visible: true`.
8. Tapping outside the popup or pressing Escape dismisses it.
9. TypeScript: `npm run typecheck` reports zero errors after all changes.

---

## Contracts and skills

### Domain schemas consulted

- `apps/managers-app/ManagerBeyo-app-managers/src/lib/routes.ts`: `TabPath` union, `ROUTES`, `TAB_ORDER`
- `apps/workers-app/ManagerBeyo-app-workers/src/lib/routes.ts`: `TabPath` union, `ROUTES`, `TAB_ORDER`

### Contracts loaded

- `architecture/01_architecture.md` + `architecture/01_architecture_local.md`: monorepo layout, `route-entry.tsx` pattern
- `architecture/02_types.md`: type authoring rules
- `architecture/06_client_state.md`: client-only state (no server involvement)
- `architecture/07_components.md`: component structure rules — no logic in components, consume context only
- `architecture/08_hooks.md`: custom hook patterns for `useMoreTabLastSelected`
- `architecture/14_styling.md`: Tailwind class rules, no inline styles except computed values
- `architecture/15_feature_structure.md`: file placement rules (shell components live in `components/shell/`)
- `architecture/26_persistence.md`: localStorage tier is correct for UI preference state; raw `localStorage` (no Zustand) is acceptable for a single small value
- `architecture/27_responsive.md`: mobile-first, this is a mobile-primary component
- `architecture/31_animations.md`: CSS transition preferred over framer-motion for simple show/hide; use `transition-[opacity,transform]` with `duration-200`

### Local extensions loaded

- `architecture/28_surfaces_local.md`: confirms the popup is NOT a surface — it has no `useSurface` registration; it is a local popover managed by `useState`
- `architecture/30_dynamic_loading_local.md`: no lazy-loading needed here (shell component, always mounted)

### File read intent — pattern vs. relational

Prohibited reads (pattern reads — contracts cover these):
- Reading another hook to understand localStorage helper shape → `08_hooks.md` + `26_persistence.md`
- Reading another component to understand Tailwind animation class structure → `31_animations.md`

Permitted reads (relational — what already exists):
- `apps/managers-app/.../lib/routes.ts` — actual `TabPath` union, `ROUTES` field names ✅ (already read)
- `apps/workers-app/.../lib/routes.ts` — same ✅ (already read)
- `apps/managers-app/.../components/shell/BottomTabBar.tsx` — existing implementation to understand what changes ✅ (already read)
- `apps/workers-app/.../components/shell/BottomTabBar.tsx` — same ✅ (already read)
- `packages/ui/src/components/primitives/horizontal-scroll-area/HorizontalScrollArea.tsx` — source to adapt into `VerticalScrollArea` ✅ (already read)

### Skill selection

- Primary skill: not applicable (pure component work, no server state, no forms)
- Excluded: surface skill — the popup is a local popover, not a registered surface

---

## Implementation plan

### Step 1 — Create `VerticalScrollArea` primitive

**File:** `packages/ui/src/components/primitives/vertical-scroll-area/VerticalScrollArea.tsx` (NEW)

Adapt `HorizontalScrollArea` for the vertical axis:

- The scrollable container: `overflow-y-auto overflow-x-hidden scrollbar-none [&::-webkit-scrollbar]:hidden`
- Layout: `flex-row` (content on left, track strip on right) instead of `flex-col`
- `updateThumb` logic swaps all horizontal measurements for vertical:
  - `clientWidth → clientHeight`, `scrollWidth → scrollHeight`, `scrollLeft → scrollTop`
  - `ratio = clientHeight / scrollHeight`
  - `trackWidth → trackHeight` (use `track.clientHeight`)
  - `thumbHeight = Math.max(ratio * trackHeight, 24)` (min 24 px)
  - `thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * (trackHeight - thumbHeight) : 0`
  - `thumb.style.height = ...`, `thumb.style.transform = translateY(...)`
- Track strip: `relative my-2 mr-0.5 w-px rounded-full bg-muted/30` (thin vertical bar on right)
- Thumb: `absolute left-0 top-0 w-full rounded-full bg-muted-foreground/30`
- `ResizeObserver` observes both `scrollRef` and `scrollRef.current.firstElementChild` (same as horizontal version)
- Props: `children`, `className`, `trackClassName`, `thumbClassName`, `data-testid`, `style` (to accept `maxHeight`)

**File:** `packages/ui/src/components/primitives/vertical-scroll-area/index.ts` (NEW)

```ts
export { VerticalScrollArea } from './VerticalScrollArea';
export type { VerticalScrollAreaProps } from './VerticalScrollArea';
```

**File:** `packages/ui/src/index.ts` (MODIFY)

Add one line:
```ts
export * from "./components/primitives/vertical-scroll-area";
```

---

### Step 2 — Update `routes.ts` in both apps

**Files:**
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/routes.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/lib/routes.ts`

Changes are identical in both apps:

1. Add `PRIMARY_TABS` constant — the 4 fixed left-side slots (Tasks, Cases, Home + placeholder for Dynamic):
   ```ts
   export const PRIMARY_TABS = [
     ROUTES.tasks,
     ROUTES.cases,
     ROUTES.home,
   ] as const satisfies TabPath[];
   ```
   _(Dynamic slot is position 3 at runtime; it is not a separate route constant — it holds whichever `MORE_TABS[n]` was last selected.)_

2. Add `MORE_TABS` constant — the overflow set:
   ```ts
   export const MORE_TABS = [
     ROUTES.stats,
     ROUTES.settings,
   ] as const satisfies TabPath[];

   export type MoreTabPath = (typeof MORE_TABS)[number];
   ```

3. Add `DEFAULT_MORE_TAB`:
   ```ts
   export const DEFAULT_MORE_TAB: MoreTabPath = ROUTES.stats;
   ```

4. **Do not change `TAB_ORDER`** — it retains all 5 routes so the existing direction-calculation logic in `useTabNav` continues to work correctly for slide animations when navigating between any pair of routes.

---

### Step 3 — Create `useMoreTabLastSelected` hook in both apps

**Files:**
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/use-more-tab-last-selected.ts` (NEW)
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/use-more-tab-last-selected.ts` (NEW)

The hook is identical in both apps (copy/paste is intentional — no shared shell package exists):

```ts
import { useState } from 'react';
import { DEFAULT_MORE_TAB, MORE_TABS, type MoreTabPath } from '@/lib/routes';

const STORAGE_KEY = 'beyo-more-tab-last-selected';

function readStoredMoreTab(): MoreTabPath {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (MORE_TABS as readonly string[]).includes(stored)) {
      return stored as MoreTabPath;
    }
  } catch {}
  return DEFAULT_MORE_TAB;
}

export function useMoreTabLastSelected() {
  const [lastSelected, setLastSelected] = useState<MoreTabPath>(readStoredMoreTab);

  function selectMoreTab(path: MoreTabPath): void {
    try {
      localStorage.setItem(STORAGE_KEY, path);
    } catch {}
    setLastSelected(path);
  }

  return { lastSelected, selectMoreTab };
}
```

- `useState(readStoredMoreTab)` — lazy initializer; reads localStorage once on mount
- `try/catch` around all localStorage calls — guards against private browsing restrictions
- No Zustand needed — single string value, hook is only used in `BottomTabBar`

---

### Step 4 — Create `MoreTabsPopup` component in both apps

**Files:**
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/MoreTabsPopup.tsx` (NEW)
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/MoreTabsPopup.tsx` (NEW)

Structurally identical in both apps.

```tsx
type MoreTabsPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (path: MoreTabPath) => void;
  activeMoreTabPath: MoreTabPath;
  badgeState: BadgeState; // same shape as from useTabBadgeCountsContext
};
```

**Positioning:**

The popup is rendered inside the More button's wrapper `div` (see Step 5). It uses `absolute bottom-full right-0` to appear directly above the More button column. Width is inherited from the wrapper (which is `flex-1`, i.e., 20% of the nav bar width = one tab slot width).

**Markup structure:**

```tsx
<div
  aria-label="More tabs"
  className={[
    "absolute bottom-full right-0 w-full",
    "border border-b-0 bg-background rounded-t-xl overflow-hidden",
    "transition-[opacity,transform] duration-200",
    isOpen
      ? "opacity-100 translate-y-0 pointer-events-auto"
      : "opacity-0 translate-y-2 pointer-events-none",
  ].join(" ")}
  data-testid="more-tabs-popup"
  role="menu"
>
  <VerticalScrollArea style={{ maxHeight: "240px" }}>
    <div className="flex flex-col">
      {MORE_TABS.map((path) => (
        <MoreTabRow
          key={path}
          path={path}
          isActive={path === activeMoreTabPath && location.pathname === path}
          badgeItems={badgeState[path]?.items ?? []}
          badgeVisible={badgeState[path]?.visible ?? false}
          onSelect={onSelectTab}
        />
      ))}
    </div>
  </VerticalScrollArea>
</div>
```

**`MoreTabRow` (internal sub-component, same file):**

Each row renders identically to a nav tab button:
- Same `h-[60px]` height, `flex flex-col items-center justify-center gap-0.5 text-xs`
- Active color: `text-primary` when `isActive`, else `text-icon`
- Contains `NavTabBadge`, the icon, and the label
- `data-testid={`more-tab-${label.toLowerCase()}`}`

Tab definitions (icon + label for Stats and Settings) are defined inline in the popup using the same icon imports (`ChartColumnIncreasing`, `Settings2`). They do not need to be shared with the main TABS array — they are looked up by path from a local `MORE_TAB_META` map:

```ts
const MORE_TAB_META: Record<MoreTabPath, { label: string; icon: LucideIcon }> = {
  [ROUTES.stats]:    { label: "Stats",    icon: ChartColumnIncreasing },
  [ROUTES.settings]: { label: "Settings", icon: Settings2 },
};
```

**Click-outside dismissal:**

The click-outside handler belongs in `BottomTabBar` (Step 5) rather than in the popup itself, because the popup ref and the More button ref need to be co-located.

---

### Step 5 — Rewrite `BottomTabBar` in both apps

**Files:**
- `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/BottomTabBar.tsx` (MODIFY)
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/BottomTabBar.tsx` (MODIFY)

Changes are identical between the two apps.

**New `TABS` constant (4 primary slots only — Dynamic slot built at render time):**

```ts
const PRIMARY_TABS_META: Tab[] = [
  { path: ROUTES.tasks, label: "Tasks", icon: ListTodo },
  { path: ROUTES.cases, label: "Cases", icon: MessageCircle },
  { path: ROUTES.home,  label: "Home",  icon: House },
];

const MORE_TAB_META: Record<MoreTabPath, { label: string; icon: LucideIcon }> = {
  [ROUTES.stats]:    { label: "Stats",    icon: ChartColumnIncreasing },
  [ROUTES.settings]: { label: "Settings", icon: Settings2 },
};
```

**Component state and refs:**

```ts
const { lastSelected, selectMoreTab } = useMoreTabLastSelected();
const [isMoreOpen, setIsMoreOpen] = useState(false);
const moreButtonRef = useRef<HTMLButtonElement>(null);
const popupRef = useRef<HTMLDivElement>(null);
```

**Click-outside handler (useEffect):**

```ts
useEffect(() => {
  if (!isMoreOpen) return;

  function handlePointerDown(e: PointerEvent): void {
    if (
      moreButtonRef.current?.contains(e.target as Node) ||
      popupRef.current?.contains(e.target as Node)
    ) return;
    setIsMoreOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') setIsMoreOpen(false);
  }

  document.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('keydown', handleKeyDown);
  return () => {
    document.removeEventListener('pointerdown', handlePointerDown);
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [isMoreOpen]);
```

**Overflow tab selection handler:**

```ts
function handleMoreTabSelect(path: MoreTabPath): void {
  selectMoreTab(path);
  dismissBadge(path);
  setIsMoreOpen(false);
  if (location.pathname !== path) {
    const fromIndex = TAB_ORDER.indexOf(location.pathname as TabPath);
    const toIndex = TAB_ORDER.indexOf(path);
    const direction = toIndex > fromIndex ? 1 : -1;
    navigate(path, { state: { direction } });
  }
}
```

**Dynamic slot (4th slot, index 3):**

Built from `lastSelected`:

```ts
const dynamicTab = { path: lastSelected, ...MORE_TAB_META[lastSelected] };
```

**Active indicator calculation:**

```ts
const allVisiblePaths = [...PRIMARY_TABS_META.map(t => t.path), lastSelected];
const activeIndex = allVisiblePaths.indexOf(location.pathname as TabPath);
// activeIndex is -1 if current route is not in the 4 primary+dynamic slots
// The More button (slot 4) never gets the indicator
```

The indicator `width` is now `w-1/5` (unchanged — 20% because there are still 5 visual columns).

The indicator transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` — unchanged logic; `opacity: activeIndex === -1 ? 0 : 1` — unchanged.

**More button aggregate badge dot:**

```ts
const hasMoreBadge = MORE_TABS.some(path => badgeState[path]?.visible);
```

Render a small dot on the More button icon:
```tsx
{hasMoreBadge && (
  <span
    aria-hidden="true"
    className="absolute top-2 right-[calc(50%-10px)] h-1.5 w-1.5 rounded-full bg-primary"
  />
)}
```

**Full rendered layout:**

```tsx
<nav aria-label="Main navigation" className="flex-shrink-0 border-t bg-background z-[50]" data-testid="bottom-tab-bar">
  <div className="relative flex h-[60px] items-stretch">
    {/* Active indicator line */}
    <div
      aria-hidden="true"
      className="absolute top-0 h-0.5 w-1/5 bg-primary transition-[transform,opacity] duration-350 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
      style={{
        transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
        opacity: activeIndex === -1 ? 0 : 1,
      }}
    />

    {/* Primary tabs (slots 0–2) */}
    {PRIMARY_TABS_META.map((tab) => (
      <button ... onClick={() => handleTabPress(tab.path)} data-testid={`tab-${tab.label.toLowerCase()}`}>
        <NavTabBadge ... />
        <Icon ... />
        <span>{tab.label}</span>
      </button>
    ))}

    {/* Dynamic slot (slot 3) */}
    <button ... onClick={() => handleTabPress(dynamicTab.path)} data-testid={`tab-${dynamicTab.label.toLowerCase()}`}>
      <NavTabBadge ... />
      <DynamicIcon ... />
      <span>{dynamicTab.label}</span>
    </button>

    {/* More button (slot 4) — wrapping div provides positioning context for popup */}
    <div className="relative flex flex-1 flex-col">
      {/* Popup — rendered here so it's in the same positioning context */}
      <div ref={popupRef}>
        <MoreTabsPopup
          isOpen={isMoreOpen}
          onClose={() => setIsMoreOpen(false)}
          onSelectTab={handleMoreTabSelect}
          activeMoreTabPath={lastSelected}
          badgeState={badgeState}
        />
      </div>
      <button
        ref={moreButtonRef}
        aria-expanded={isMoreOpen}
        aria-haspopup="menu"
        aria-label="More tabs"
        className={["flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors relative",
          isMoreOpen ? "text-primary" : "text-icon"].join(" ")}
        data-testid="tab-more"
        onClick={() => setIsMoreOpen(prev => !prev)}
        type="button"
      >
        {hasMoreBadge && !isMoreOpen && <span aria-hidden="true" className="absolute top-2 right-[calc(50%-10px)] h-1.5 w-1.5 rounded-full bg-primary" />}
        <LayoutGrid className="h-5 w-5" strokeWidth={2} />
        <span>More</span>
      </button>
    </div>
  </div>
  <div aria-hidden="true" className="h-[var(--safe-bottom,0px)]" />
</nav>
```

**Worker app only — no extra changes needed:** The worker app `AppShell` has `LAST_ACTIVE_STEP_CARD_HIDDEN_ROUTE_ROOTS` including `ROUTES.stats` and `ROUTES.settings`. Since those routes are unchanged, the `LastActiveStepCard` hide logic continues to work correctly without modification.

**Manager app only — `z-[50]` class:** The manager app's current `BottomTabBar` does not have `z-[50]` on the `<nav>` (the worker app does). Add `z-[50]` to the manager app's `<nav>` so the popup renders above page content.

---

## Risks and mitigations

- **Risk:** `LayoutGrid` icon does not exist in the installed lucide-react version.
  **Mitigation:** Before writing the import, run `grep -r "LayoutGrid\|Grid3x3" node_modules/lucide-react/dist/esm/icons` to verify. Fall back to `Grid3x3` or `MoreHorizontal` if neither exists.

- **Risk:** The popup is clipped by an ancestor `overflow: hidden`.
  **Mitigation:** Read the `AppShell` for both apps (already done — neither nav ancestor has `overflow: hidden`). The nav's `<div className="relative flex h-[60px] items-stretch">` has no overflow clipping.

- **Risk:** Active indicator overshoots to slot 4 (More) when an overflow tab is active.
  **Mitigation:** The indicator index is computed against the visible slot model, and any active overflow route is mapped to visual slot 3 (Dynamic). Direct URL navigation to an overflow route also syncs the persisted dynamic-tab selection.

- **Risk:** `dismissBadge` is not called for the dynamic slot when it's tapped from the main nav bar.
  **Mitigation:** `handleTabPress` already calls `dismissBadge(targetPath)` for all tab button taps — the dynamic slot uses `handleTabPress(dynamicTab.path)` so this is covered automatically.

- **Risk:** TypeScript error — `TAB_ORDER.indexOf` receives a `MoreTabPath` when navigating from the popup.
  **Mitigation:** `MORE_TABS` is `readonly TabPath[]`, so `TAB_ORDER.indexOf(path)` accepts it without error (both are `TabPath`).

---

## Validation plan

- `npm run typecheck`: passed on 2026-06-18 after implementation
- Manual smoke test (managers app): open app → 5 tabs visible → tap More → popup appears with Stats + Settings → tap Stats → navigates to stats route, Dynamic slot updates to Stats icon, popup closes → refresh → Dynamic slot still shows Stats
- Manual smoke test (workers app): same flow
- Manual edge case: navigate to Settings via popup → tap More again → popup opens with Settings highlighted → tap outside → popup closes, route unchanged
- Manual scroll test: temporarily add 5+ entries to `MORE_TABS` to verify `VerticalScrollArea` scrolling and thumb indicator appear correctly, then revert

---

## File summary

| # | File | Action |
|---|------|--------|
| 1 | `packages/ui/src/components/primitives/vertical-scroll-area/VerticalScrollArea.tsx` | NEW |
| 2 | `packages/ui/src/components/primitives/vertical-scroll-area/index.ts` | NEW |
| 3 | `packages/ui/src/index.ts` | MODIFY — add export |
| 4 | `apps/managers-app/ManagerBeyo-app-managers/src/lib/routes.ts` | MODIFY — add `PRIMARY_TABS`, `MORE_TABS`, `DEFAULT_MORE_TAB`, `MoreTabPath` |
| 5 | `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/use-more-tab-last-selected.ts` | NEW |
| 6 | `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/MoreTabsPopup.tsx` | NEW |
| 7 | `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/BottomTabBar.tsx` | MODIFY |
| 8 | `apps/workers-app/ManagerBeyo-app-workers/src/lib/routes.ts` | MODIFY — same as #4 |
| 9 | `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/use-more-tab-last-selected.ts` | NEW |
| 10 | `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/MoreTabsPopup.tsx` | NEW |
| 11 | `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/BottomTabBar.tsx` | MODIFY |

Total: 6 new files, 5 modified files.

---

## Review log

- `2026-06-18T12:28:16Z` — implemented in both apps, `npm run typecheck` passed, summary written to `docs/architecture/implemented_summaries/SUMMARY_more_tabs_nav_20260618.md`.

---

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
