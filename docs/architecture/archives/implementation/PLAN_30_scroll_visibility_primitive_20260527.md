# PLAN_30_scroll_visibility_primitive_20260527

## Metadata

- Plan ID: `PLAN_30_scroll_visibility_primitive_20260527`
- Status: `archived`
- Owner agent: `copilot`
- Created at (UTC): `2026-05-27T10:00:00Z`
- Last updated at (UTC): `2026-05-27T08:51:10Z`
- Related issue/ticket: _none_
- Intention plan: _none — feature request originated in conversation_

---

## Goal and intent

- **Goal:** Build a centralised `scroll-visibility` primitive that any component can use to hide/show layout elements on scroll, then migrate the two existing hand-rolled implementations (StagedForm timeline collapse, CaseConversationContextBanner collapse) to consume it.
- **Business/user intent:** Scroll-driven hide/show behaviour is needed in multiple surfaces (StagedForm, case chat, future pages). Each implementation today carries its own bugs, re-render overhead, and duplicated scroll-listener logic. Centralising it makes the behaviour stable, tested once, and reusable without rebuilding from scratch each time.
- **Non-goals:**
  - No new visible UI — this is infrastructure only.
  - No parallax, proportional scroll-driven animation, or `useScroll` from Framer Motion.
  - No changes to any unrelated feature.

---

## Scope

### In scope

- New primitive module: `src/components/primitives/scroll-visibility/`
  - `use-scroll-visibility.ts` — standalone utility hook (owns the scroll ref)
  - `ScrollVisibilityContext.tsx` — context definition + consumer hook
  - `ScrollVisibilityProvider.tsx` — provider for multi-consumer trees (Virtuoso-compatible)
  - `index.ts` — public exports
- Migrate `StagedForm.tsx` to the standalone hook (replaces its hand-rolled scroll listener + `isCompact`/`isScrolled` state).
- Migrate `CaseConversationContextBanner` to consume the provider context (replaces `controller.isContextBannerCollapsed`).
- `CaseConversationSlideView.tsx` — wraps content in `ScrollVisibilityProvider`, owns the `scrollElement` state, passes `onScrollerRef` to `CaseMessageList`.
- `CaseMessageList.tsx` — replaces `isContextBannerCollapsed` prop with `useScrollVisibilityContext()`, exposes Virtuoso scroller element to parent via `onScrollerRef` prop.
- `use-case-conversation.controller.ts` — removes `isContextBannerCollapsed` field and the `scrollTop`-based banner-collapse logic; keeps `distanceFromBottom` and `scrollToBottomRequestVersion`.
- Playwright tests covering both usages.

### Out of scope

- `direction` mode (scroll-up-to-reveal, LinkedIn-style) is defined in the API but not tested — the current migrations both use `threshold` mode.
- Migrating any page other than the two listed above.
- Visual changes to any component.

### Assumptions

- Framer Motion `animate` (imperative, from `'framer-motion'`) works independently of `LazyMotion` — only `m.*` components require the lazy features bundle.
- `useMotionValue`, `animate`, and `MotionValue` are all available without importing `domMax`.
- `BottomSheetSurface` already uses `handleOnly` on its Drawer root; no scroll-gesture conflict with DnD or with the scroll-visibility listener.
- Virtuoso's `scrollerRef` callback fires after the DOM mounts; one extra render of the provider tree when the element is set is acceptable.
- `CaseMessageList` is only ever rendered inside `CaseConversationSlideView`, so adding a dependency on `ScrollVisibilityContext` is safe.

---

## Clarifications required

_None — all ambiguities resolved during design._

---

## Acceptance criteria

1. `StagedForm` timeline collapses when the user scrolls the form content past 56 px, and expands again when scroll returns below 8 px — identical to the current behaviour, no regression.
2. `CaseConversationContextBanner` animates `y: -64` when the user scrolls the message list at all, and returns to `y: 0` when scroll returns to top — identical to current behaviour.
3. No React state update fires on each scroll frame — state changes only at threshold crossings (verified by React DevTools Profiler or Playwright assertion on interaction count).
4. A third consumer (e.g. a new page) can be wired by adding `<ScrollVisibilityProvider scrollElement={element}>` and calling `useScrollVisibilityContext()` — no changes to the primitive itself.
5. `npm run typecheck` passes with zero errors.
6. Playwright mobile and desktop pass.

---

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: component rules, named exports, no logic in JSX.
- `architecture/08_hooks.md`: hook taxonomy — the standalone hook is Type 4 (utility), co-located with its provider primitive.
- `architecture/18_performance.md`: memoisation rules; `useMotionValue` avoids per-scroll-frame React renders.
- `architecture/23_providers.md`: provider structure — exports Provider + consumer hook, context init to `null`, throw on misuse.
- `architecture/31_animations.md`: animation contract — prefer `transform`/`opacity`, use `transitions.*` tokens, never put animation logic in controllers.

### Local extensions loaded

- _none_

### File read intent — pattern vs. relational

Permitted relational reads:
- `StagedForm.tsx` — understand current `isCompact`/`isScrolled` state shape and the `ResizeObserver` (kept after migration).
- `StagedFormTimeline.tsx` — understand how `isTimelineCompact` drives `animate={{ height: isTimelineCompact ? 0 : 'auto' }}`.
- `StagedFormContext.tsx` — understand `isTimelineCompact` field in context value.
- `CaseConversationContextBanner.tsx` — understand the current `animate={{ y: controller.isContextBannerCollapsed ? -64 : 0 }}` pattern.
- `CaseConversationSlideView.tsx` — understand where the provider wraps.
- `CaseMessageList.tsx` — understand the `isContextBannerCollapsed` prop, `topInsetRef` / `ResizeObserver`, and Virtuoso's `scrollerRef`.
- `use-case-conversation.controller.ts` — understand which fields to remove.

Prohibited:
- Reading any other hook to understand optimistic update shape → `08_hooks.md`.
- Reading another provider to understand context shell → `23_providers.md`.

### Skill selection

- Primary skill: _none — pure utility primitive, no server state, no feature domain._

---

## Implementation plan

### Step 1 — `scroll-visibility.types.ts`

Create `src/components/primitives/scroll-visibility/scroll-visibility.types.ts`.

```ts
import type { MotionValue } from 'framer-motion';

export type ScrollVisibilityMode = 'threshold' | 'direction';

export type ScrollVisibilityOptions = {
  /** Scroll distance (px) past which the element hides. Default: 56. */
  threshold?: number;
  /**
   * Scroll distance (px) below which the element re-shows (threshold mode only).
   * Lower than `threshold` to prevent jitter at the boundary. Default: 8.
   */
  hysteresis?: number;
  /**
   * 'threshold' — hide after scrolling `threshold` px down, show below `hysteresis` px.
   * 'direction' — hide on any downward scroll past `threshold`, show on any upward scroll.
   * Default: 'threshold'.
   */
  mode?: ScrollVisibilityMode;
};

export type ScrollVisibilityContextValue = {
  /** 0 = fully visible, 1 = fully hidden. Framer Motion MotionValue — updates off the React render cycle. */
  motionProgress: MotionValue<number>;
  /** Boolean derived from motionProgress. Triggers a React render only at threshold crossings. */
  isHidden: boolean;
  /** Programmatically restore visibility (e.g. on step change). No-ops if currently scrolled past threshold. */
  reset(): void;
};
```

---

### Step 2 — `use-scroll-visibility.ts` (standalone hook)

Create `src/components/primitives/scroll-visibility/use-scroll-visibility.ts`.

This hook is the single-consumer path: it owns the scroll ref and returns it for the consumer to attach to a `div`.

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';

import { transitions } from '@/lib/animation';

import type { ScrollVisibilityOptions, ScrollVisibilityContextValue } from './scroll-visibility.types';

type UseScrollVisibilityResult = ScrollVisibilityContextValue & {
  scrollRef: React.RefObject<HTMLDivElement>;
};

export function useScrollVisibility({
  threshold = 56,
  hysteresis = 8,
  mode = 'threshold',
}: ScrollVisibilityOptions = {}): UseScrollVisibilityResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const motionProgress = useMotionValue(0);
  const [isHidden, setIsHidden] = useState(false);

  // Tracks the intended target without causing a React render on every scroll frame.
  const hiddenTargetRef = useRef(false);
  // Used only in 'direction' mode.
  const lastScrollTopRef = useRef(0);

  const applyHidden = useCallback(
    (hidden: boolean) => {
      if (hiddenTargetRef.current === hidden) return;
      hiddenTargetRef.current = hidden;
      void animate(motionProgress, hidden ? 1 : 0, transitions.base);
      setIsHidden(hidden);
    },
    [motionProgress],
  );

  const reset = useCallback(() => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (scrollTop <= hysteresis) {
      applyHidden(false);
    }
  }, [hysteresis, applyHidden]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const onScroll = () => {
      const scrollTop = element.scrollTop;

      if (mode === 'threshold') {
        if (!hiddenTargetRef.current && scrollTop > threshold) {
          applyHidden(true);
        } else if (hiddenTargetRef.current && scrollTop < hysteresis) {
          applyHidden(false);
        }
      } else {
        const goingDown = scrollTop > lastScrollTopRef.current;
        if (goingDown && scrollTop > threshold && !hiddenTargetRef.current) {
          applyHidden(true);
        } else if (!goingDown && hiddenTargetRef.current) {
          applyHidden(false);
        }
        lastScrollTopRef.current = scrollTop;
      }
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, [threshold, hysteresis, mode, applyHidden]);

  return { scrollRef, motionProgress, isHidden, reset };
}
```

Key invariants:
- `hiddenTargetRef` gates the threshold check so `applyHidden` is called at most once per crossing — no state update on every scroll frame.
- `animate(motionProgress, ...)` drives the MotionValue smoothly off the React thread.
- `setIsHidden(hidden)` triggers at most two React renders per scroll cycle (one hide, one show).

---

### Step 3 — `ScrollVisibilityContext.tsx`

Create `src/components/primitives/scroll-visibility/ScrollVisibilityContext.tsx`.

```tsx
import { createContext, useContext } from 'react';

import type { ScrollVisibilityContextValue } from './scroll-visibility.types';

export const ScrollVisibilityContext =
  createContext<ScrollVisibilityContextValue | null>(null);

export function useScrollVisibilityContext(): ScrollVisibilityContextValue {
  const ctx = useContext(ScrollVisibilityContext);
  if (!ctx) {
    throw new Error(
      'useScrollVisibilityContext must be used within <ScrollVisibilityProvider>',
    );
  }
  return ctx;
}
```

---

### Step 4 — `ScrollVisibilityProvider.tsx` (multi-consumer path)

Create `src/components/primitives/scroll-visibility/ScrollVisibilityProvider.tsx`.

The provider accepts an external `scrollElement: HTMLElement | null` — this allows callers to pass the element from Virtuoso's `scrollerRef` callback. The caller owns the `useState` for the element.

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'framer-motion';

import { transitions } from '@/lib/animation';

import { ScrollVisibilityContext } from './ScrollVisibilityContext';
import type { ScrollVisibilityOptions } from './scroll-visibility.types';

type ScrollVisibilityProviderProps = ScrollVisibilityOptions & {
  /**
   * The scroll container element. Accepts a stateful element so Virtuoso consumers can
   * set it asynchronously via `scrollerRef={(el) => setScrollElement(el instanceof HTMLElement ? el : null)}`.
   * When null, no listener is attached.
   */
  scrollElement: HTMLElement | null;
  children: React.ReactNode;
};

export function ScrollVisibilityProvider({
  scrollElement,
  threshold = 56,
  hysteresis = 8,
  mode = 'threshold',
  children,
}: ScrollVisibilityProviderProps): React.JSX.Element {
  const motionProgress = useMotionValue(0);
  const [isHidden, setIsHidden] = useState(false);
  const hiddenTargetRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const applyHidden = useCallback(
    (hidden: boolean) => {
      if (hiddenTargetRef.current === hidden) return;
      hiddenTargetRef.current = hidden;
      void animate(motionProgress, hidden ? 1 : 0, transitions.base);
      setIsHidden(hidden);
    },
    [motionProgress],
  );

  const reset = useCallback(() => {
    if ((scrollElement?.scrollTop ?? 0) <= hysteresis) {
      applyHidden(false);
    }
  }, [scrollElement, hysteresis, applyHidden]);

  useEffect(() => {
    if (!scrollElement) return;

    // Reset state when the element changes (e.g. Virtuoso re-mounts).
    hiddenTargetRef.current = false;
    lastScrollTopRef.current = 0;
    void animate(motionProgress, 0, { duration: 0 });
    setIsHidden(false);

    const onScroll = () => {
      const scrollTop = scrollElement.scrollTop;

      if (mode === 'threshold') {
        if (!hiddenTargetRef.current && scrollTop > threshold) {
          applyHidden(true);
        } else if (hiddenTargetRef.current && scrollTop < hysteresis) {
          applyHidden(false);
        }
      } else {
        const goingDown = scrollTop > lastScrollTopRef.current;
        if (goingDown && scrollTop > threshold && !hiddenTargetRef.current) {
          applyHidden(true);
        } else if (!goingDown && hiddenTargetRef.current) {
          applyHidden(false);
        }
        lastScrollTopRef.current = scrollTop;
      }
    };

    scrollElement.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', onScroll);
  }, [scrollElement, threshold, hysteresis, mode, applyHidden, motionProgress]);

  return (
    <ScrollVisibilityContext.Provider value={{ motionProgress, isHidden, reset }}>
      {children}
    </ScrollVisibilityContext.Provider>
  );
}
```

---

### Step 5 — `index.ts`

Create `src/components/primitives/scroll-visibility/index.ts`.

```ts
export { useScrollVisibility } from './use-scroll-visibility';
export { ScrollVisibilityProvider } from './ScrollVisibilityProvider';
export { useScrollVisibilityContext } from './ScrollVisibilityContext';
export type {
  ScrollVisibilityMode,
  ScrollVisibilityOptions,
  ScrollVisibilityContextValue,
} from './scroll-visibility.types';
```

---

### Step 6 — Migrate `StagedForm.tsx` (standalone hook)

**File:** `src/components/primitives/staged-form/StagedForm.tsx`

Replace the hand-rolled scroll listener and `isCompact`/`isScrolled` state with `useScrollVisibility`.

Before (lines ~44–76):
```ts
const [isCompact, setIsCompact] = useState(false);
const [isScrolled, setIsScrolled] = useState(false);

useEffect(() => {
  const element = scrollRef.current;
  if (!element) return;
  const onScroll = () => { /* ... setState on every frame */ };
  element.addEventListener('scroll', onScroll, { passive: true });
  return () => element.removeEventListener('scroll', onScroll);
}, []);

useEffect(() => {
  if (scrollRef.current) scrollRef.current.scrollTop = 0;
  setIsCompact(false);
  setIsScrolled(false);
}, [activeStepId]);
```

After:
```ts
import { useScrollVisibility } from '@/components/primitives/scroll-visibility';

// Inside StagedForm():
const { scrollRef, isHidden: isCompact, reset } = useScrollVisibility({
  threshold: 56,
  hysteresis: 8,
});

// isScrolled is kept as a separate local state — its threshold (any scroll > 0px) differs
// from the timeline collapse threshold (56px), so it cannot share the hook instance.
const [isScrolled, setIsScrolled] = useState(false);

useEffect(() => {
  const element = scrollRef.current;
  if (!element) return;
  const onScroll = () => setIsScrolled(element.scrollTop > 0);
  element.addEventListener('scroll', onScroll, { passive: true });
  return () => element.removeEventListener('scroll', onScroll);
}, []); // scrollRef is stable — safe to omit from deps

// On step change: reset scroll position, gradient, and timeline visibility.
useEffect(() => {
  if (scrollRef.current) scrollRef.current.scrollTop = 0;
  setIsScrolled(false);
  reset();
}, [activeStepId, reset]);
```

The gradient `m.div` keeps its **existing** `animate` / `transition` props driven by `isScrolled` — no change to that element:
```tsx
<m.div
  animate={{ opacity: isScrolled ? 1 : 0 }}
  className="pointer-events-none sticky top-0 z-20 h-10 -mb-10 bg-gradient-to-b from-background to-transparent ..."
  initial={false}
  transition={{ duration: 0.15, ease: 'easeOut' }}
/>
```

Pass `isCompact` into the context value unchanged:
```ts
const contextValue = {
  // ... existing fields
  isTimelineCompact: isCompact,
};
```

The `ResizeObserver` on `timelineRef` (scroll compensation during timeline animation) is **kept as-is** — it is unrelated to scroll visibility and must not be removed.

---

### Step 7 — Migrate `CaseConversationSlideView.tsx`

**File:** `src/features/cases/components/CaseConversationSlideView.tsx`

Add `scrollElement` state and wrap the relevant portion in `ScrollVisibilityProvider`:

```tsx
import { useState } from 'react';
import { ScrollVisibilityProvider } from '@/components/primitives/scroll-visibility';

// Inside CaseConversationSlideView():
const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);

// In the return JSX (success path only):
return (
  <div
    className="relative flex h-full min-h-full flex-col overflow-hidden bg-background"
    data-testid="case-conversation-slide"
    style={CONVERSATION_LAYOUT_STYLE}
  >
    <CaseConversationHeader />
    <ScrollVisibilityProvider scrollElement={scrollElement} threshold={1} hysteresis={0}>
      <CaseConversationContextBanner />
      <CaseMessageList
        onScrollerRef={setScrollElement}
      />
    </ScrollVisibilityProvider>
    {/* AnimatePresence scroll-to-bottom CTA unchanged */}
    {/* Composers unchanged */}
  </div>
);
```

Notes:
- `threshold={1}` — hides on any scroll (banner was already hiding at `scrollTop > 0`).
- `hysteresis={0}` — shows again immediately when back at top.
- `CaseConversationHeader` is outside the provider — it does not hide on scroll.
- The `isContextBannerCollapsed` prop is removed from `CaseMessageList`.

---

### Step 8 — Migrate `CaseConversationContextBanner.tsx`

**File:** `src/features/cases/components/CaseConversationContextBanner.tsx`

Replace `controller.isContextBannerCollapsed` with `useScrollVisibilityContext().isHidden`:

```tsx
import { useScrollVisibilityContext } from '@/components/primitives/scroll-visibility';

export function CaseConversationContextBanner(): React.JSX.Element | null {
  const controller = useCaseConversationContext();
  const { isHidden } = useScrollVisibilityContext();
  // ...

  return (
    <m.div
      animate={isHidden ? { y: -64 } : { y: 0 }}
      // ... rest of props unchanged
    >
      {/* content unchanged */}
    </m.div>
  );
}
```

---

### Step 9 — Update `CaseMessageList.tsx`

**File:** `src/features/cases/components/CaseMessageList.tsx`

Two changes:

**A. Replace `isContextBannerCollapsed` prop with `useScrollVisibilityContext()`:**

Remove the `isContextBannerCollapsed: boolean` prop. Read `isHidden` from context instead:
```tsx
import { useScrollVisibilityContext } from '@/components/primitives/scroll-visibility';

// Inside CaseMessageList():
const { isHidden: isContextBannerCollapsed } = useScrollVisibilityContext();
```

The `topInsetRef` height logic (`isContextBannerCollapsed ? "h-20" : "h-36"`) continues to use this value — no change to the JSX.

The `ResizeObserver` on `topInsetRef` that compensates `scrollTop` when the banner height changes is **kept as-is** — it is scroll-layout compensation, not scroll detection, and must not be removed.

**B. Accept `onScrollerRef` prop and wire to Virtuoso:**

```tsx
type CaseMessageListProps = {
  onScrollerRef: (el: HTMLElement | null) => void;
};

export function CaseMessageList({ onScrollerRef }: CaseMessageListProps): React.JSX.Element {
  // ...
  return (
    <Virtuoso
      // ... all other props unchanged
      scrollerRef={(element) => {
        const el = element instanceof HTMLElement ? element : null;
        setScrollerElement(el);     // existing local state for distanceFromBottom tracking
        onScrollerRef(el);          // new: propagates to ScrollVisibilityProvider
      }}
    />
  );
}
```

Note: `setScrollerElement` is the existing call that sets the local `scrollerElement` state used by `handleListScroll`. It is unchanged.

---

### Step 10 — Update `use-case-conversation.controller.ts`

**File:** `src/features/cases/controllers/use-case-conversation.controller.ts`

Remove:
- `isContextBannerCollapsed` from the return object.
- The `scrollTop`-based logic inside `handleListScroll` that computes the collapsed state.

Keep:
- `handleListScroll` — it still receives `distanceFromBottom` for the scroll-to-bottom CTA.
- `distanceFromBottom` tracking.
- `scrollToBottomRequestVersion`.

Also remove `isContextBannerCollapsed` from `useCaseConversationContext()` return type / `CaseConversationController` type.

---

### Step 11 — Playwright tests

Create `tests/playwright/features/scroll-visibility/scroll-visibility.spec.ts`.

Import `test` and `expect` from `../../fixtures/app-fixture` (never from `@playwright/test`).

**Test group: StagedForm timeline collapse**

```ts
test.describe('StagedForm scroll visibility', () => {
  test('timeline collapses after scrolling 56px and restores on scroll back', async ({ page }) => {
    // Navigate to a page that renders StagedForm.
    // data-testid="staged-form-timeline" must have data-compact="false" initially.
    // Scroll the staged-form-scroll-container by 80px.
    // Assert data-compact="true".
    // Scroll back to 0.
    // Assert data-compact="false".
  });

  test('timeline resets when the active step changes', async ({ page }) => {
    // Scroll the form.
    // Trigger step navigation.
    // Assert data-compact="false" and scrollTop === 0 on staged-form-scroll-container.
  });
});
```

**Test group: CaseConversation banner collapse**

```ts
test.describe('CaseConversation scroll visibility', () => {
  test('context banner hides when message list is scrolled', async ({ page }) => {
    // Mock API routes so the case conversation loads.
    // data-testid="case-conversation-context-banner" must be visible initially
    // (data-collapsed="false").
    // Scroll the Virtuoso container by 10px (any amount).
    // Assert data-collapsed="true" on the banner.
  });

  test('context banner restores when scrolled back to top', async ({ page }) => {
    // Scroll down, assert collapsed.
    // Scroll back to 0.
    // Assert data-collapsed="false".
  });

  test('no React state update fires on every scroll frame', async ({ page }) => {
    // This is a smoke test: scroll smoothly 200px.
    // Assert the page does not throw, and the banner ends in data-collapsed="true".
    // (Frame-by-frame state update count is not measurable in Playwright; the absence
    // of jank/crash is the assertion.)
  });
});
```

Both test groups must pass under `--project=mobile` before running `--project=desktop`.

---

## Risks and mitigations

- **Risk:** `animate(motionProgress, ...)` is called inside `applyHidden`, which is a `useCallback`. If `motionProgress` identity changes across renders (it should not — `useMotionValue` returns a stable reference), the effect would re-subscribe with a stale closure.
  **Mitigation:** `useMotionValue` returns a stable object. No special handling required. If TypeScript complains about stale deps, wrap `motionProgress` in `useRef` instead of passing it to `useCallback` deps.

- **Risk:** In `CaseMessageList`, `onScrollerRef` is called inside the Virtuoso `scrollerRef` callback. If the parent re-renders (triggering a new `setScrollElement` function reference), the callback could fire more than once.
  **Mitigation:** Virtuoso's `scrollerRef` fires once on mount and once on unmount (null). Wrapping `setScrollElement` in `useCallback` in `CaseConversationSlideView` prevents unnecessary re-registrations.

- **Risk:** `ScrollVisibilityProvider` resets its internal state (`isHidden = false`) every time `scrollElement` changes. If Virtuoso temporarily unmounts and remounts (e.g. hot reload, key change), the banner would flash visible for one frame before the scroll listener re-detects position.
  **Mitigation:** This is acceptable — Virtuoso does not remount during normal usage. Only affects development hot-reload.

- **Risk:** `isContextBannerCollapsed` removal from the controller is a breaking change to its TypeScript type. Any component consuming `useCaseConversationContext()` and reading `isContextBannerCollapsed` will fail at compile time.
  **Mitigation:** `npm run typecheck` will catch all usages. The only known consumer is `CaseConversationSlideView`, which is also migrated in this plan.

---

## Validation plan

1. `npm run typecheck` — zero TypeScript errors across the whole workspace.
2. `npm run test -- --grep "scroll-visibility|StagedForm|CaseConversation"` — all unit/integration tests pass.
3. `npx playwright test --grep "scroll-visibility" --project=mobile` — mobile tests pass first.
4. `npx playwright test --grep "scroll-visibility" --project=desktop` — desktop tests pass.
5. Manual smoke: open StagedForm, scroll the form content — timeline collapses smoothly; scroll back — timeline expands smoothly. No visible jank.
6. Manual smoke: open a case conversation, scroll the message list — context banner slides up. Scroll to top — banner slides back down. No visible lag on mid-range device.

---

## Review log

_None yet._

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david` (user review) → `copilot` (implementation)
