# PLAN_scroll_visibility_progressive_animation_20260627

## Metadata

- Plan ID: `PLAN_scroll_visibility_progressive_animation_20260627`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-27T00:00:00Z`
- Last updated at (UTC): `2026-06-27T21:33:04Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Replace the binary `isHidden` boolean flip in relative scroll-visibility mode with a continuous, scroll-linked animation progress (0 → 1) driven by CSS custom properties. Add a snap guard that completes the hide or show animation when the user lifts their finger mid-scroll.
- Business/user intent: Match the social-media phone UX pattern where hiding UI chrome (buttons, bars, footers) moves in exact sync with the user's scroll gesture, then snaps smoothly to fully hidden or fully visible when the touch ends — instead of the current abrupt threshold-crossing jump.
- Non-goals: Redesigning `isCompact` header components (CasesView, TasksView, upholstery headers); they remain binary boolean. Absolute scroll mode is not changed. Framer Motion is not used.

## Scope

- In scope:
  - Core `scroll-visibility` primitive: continuous progress tracking in `use-scroll-state.ts`, new `use-scroll-progress-css-var.ts`, updates to `use-scroll-visibility.ts` and `ScrollVisibilityProvider.tsx`.
  - Three translate-based consumer components converted to CSS var inline style: `TaskNoteListPanel`, `UnreadViewerFooter` (inside `TaskNoteUnreadViewerPage`), `WorkingSectionShortcutBar` (translate mode).
  - Fix pre-existing omission: `ScrollVisibilityProvider` currently ignores `hideThreshold` / `showThreshold` props; wire them through to `useScrollState`.
- Out of scope:
  - Absolute mode — no behavioral changes.
  - `isCompact` header consumers (CasesView, TasksView, upholstery slide pages) — they keep the boolean; no scroll-linked animation for them in this plan.
  - `max-height` and `grid-template-rows` collapse consumers — they stay binary; CSS var approach does not map cleanly to those animation types without known pixel heights.
- Assumptions:
  - CSS custom properties inherit through `display: contents` elements in all target browsers (Chrome 58+, Safari 11.1+, Firefox 37+).
  - `requestAnimationFrame` is available in the webview. `scrollend` is NOT used (fires too late — after momentum, not on finger lift).
  - Progress tracking and touch snap behaviour is **relative mode only** — absolute mode wiring is guarded with `if (mode === "relative")` in every callsite.

## Clarifications required

None — all decisions resolved through analysis and correction review.

## Acceptance criteria

1. Scrolling down inside `TaskNoteListPanel` moves the "Add note" button downward at exactly the same rate as the scroll progress from anchor to `hideThreshold`. Releasing mid-scroll snaps the button fully down or fully up with a smooth 300 ms ease-out.
2. Same behaviour for `UnreadViewerFooter` in `TaskNoteUnreadViewerPage`.
3. `WorkingSectionShortcutBar` in `animationMode="translate"` tracks scroll (transform + opacity) and snaps on finger lift.
4. `isHidden` boolean in all consumers still flips at the correct threshold (backward compatibility maintained — `isCompact` headers and binary consumers are unaffected).
5. No React re-renders occur during active scrolling (only DOM style mutations run via direct `style.setProperty` calls).
6. `touchcancel` leaves UI at 0 or 1, never mid-state.
7. A new scroll gesture after a snap always starts from a clean anchor (no jump or skip in progress).
8. Absolute mode behaves identically to before this plan.
9. `npm run typecheck` reports zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/08_hooks.md` — pattern for hook result types and ref patterns

### File read intent — pattern vs. relational

Permitted (relational — needed to understand existing code):
- Reading `use-scroll-state.ts`, `use-scroll-visibility.ts`, `ScrollVisibilityProvider.tsx` to understand existing state machine and wiring.
- Reading `TaskNoteListPanel.tsx`, `TaskNoteUnreadViewerPage.tsx`, `WorkingSectionShortcutBar.tsx` to understand current animation class patterns.

Prohibited:
- Reading unrelated hooks to understand TanStack Query or action patterns — not relevant here.

### Skill selection

- Primary skill: none (pure primitive + consumer update)
- Excluded alternatives: Framer Motion — avoided; CSS custom properties + direct DOM mutations achieve the same result with zero render overhead.

---

## Implementation plan

### Step 1 — Extend `use-scroll-state.ts` with continuous progress tracking

File: `packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts`

**New refs (relative mode only):**
```ts
const progressRef = useRef(0);          // current 0–1 progress (never React state)
const progressAtAnchorRef = useRef(0);  // progress snapshot taken at last direction reversal
```

**Updated `ScrollStateResult` type:**
```ts
type ScrollStateResult = {
  isHidden: boolean;
  progressRef: React.MutableRefObject<number>;
  snap: (snapTo: 0 | 1, currentScrollValue: number) => void;
  suspend: (durationMs?: number) => void;
  onScroll: (value: number) => void;
  resetState: (value: number) => void;
  initialize: (value: number) => void;
};
```

**Threshold guard** — normalize before any division to prevent divide-by-zero:
```ts
const effectiveHideThreshold = Math.max(1, hideThreshold ?? threshold);
const effectiveShowThreshold = Math.max(1, showThreshold ?? threshold);
```
Apply this guard both in `onScroll` (replace the existing `hideThreshold ?? threshold` expressions) and in `initialize`.

**`onScroll` — relative mode additions:**

Inside the existing relative-mode block, after the direction-reversal anchor reset and before the threshold checks, add:

```ts
// Save progressAtAnchor at each direction reversal (add one line inside existing if-block)
if (movingForward !== movingForwardRef.current) {
  movingForwardRef.current = movingForward;
  directionAnchorRef.current = value;
  progressAtAnchorRef.current = progressRef.current;  // ← new
}

const distanceFromAnchor = value - directionAnchorRef.current;

// Unified progress formula: sign of distanceFromAnchor drives direction naturally.
const thresholdForDirection = movingForward
  ? effectiveHideThreshold
  : effectiveShowThreshold;
const newProgress = Math.min(
  1,
  Math.max(0, progressAtAnchorRef.current + distanceFromAnchor / thresholdForDirection),
);
progressRef.current = newProgress;
```

**Replace** the existing binary threshold checks with progress-based flips (keeping the same effective scroll position):
```ts
if (!hiddenTargetRef.current && newProgress >= 1) {
  applyHidden(true);
  directionAnchorRef.current = value;  // re-anchor so next reverse starts cleanly
  progressAtAnchorRef.current = 1;
} else if (hiddenTargetRef.current && newProgress <= 0) {
  applyHidden(false);
  directionAnchorRef.current = value;
  progressAtAnchorRef.current = 0;
}
```

**`snap` function** — called by the CSS var hook after the snap animation completes. Receives the current scroll value so direction tracking resumes from a clean state:

```ts
const snap = useCallback((snapTo: 0 | 1, currentScrollValue: number) => {
  progressRef.current = snapTo;
  progressAtAnchorRef.current = snapTo;
  lastScrollValueRef.current = currentScrollValue;
  directionAnchorRef.current = currentScrollValue;
  movingForwardRef.current = false;  // treat next scroll as a fresh start
  applyHidden(snapTo === 1);
}, [applyHidden]);
```

**`initialize` — relative mode:** reset `progressRef.current = 0` and `progressAtAnchorRef.current = 0`.

**Return** `progressRef` and `snap` in the result object. No changes to absolute mode logic.

---

### Step 2 — Create `use-scroll-progress-css-var.ts` (new internal file)

File: `packages/ui/src/components/primitives/scroll-visibility/use-scroll-progress-css-var.ts`

Not re-exported from `index.ts`. Internal to the `scroll-visibility` folder.

```ts
import { useCallback, useEffect, useRef } from "react";

const SNAP_DURATION_MS = 300;
const CSS_VAR_PROGRESS = "--scroll-hide-progress";
const CSS_VAR_DURATION = "--scroll-snap-duration";

type UseScrollProgressCssVarOptions = {
  containerRef: React.RefObject<HTMLElement | null>;
  progressRef: React.MutableRefObject<number>;
  snapThreshold: number;
  onSnapComplete: (snapTo: 0 | 1) => void;  // caller provides scroll value + snap()
  suspend: (durationMs?: number) => void;
};

type UseScrollProgressCssVarResult = {
  onProgress: (progress: number) => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
};

export function useScrollProgressCssVar({
  containerRef,
  progressRef,
  snapThreshold,
  onSnapComplete,
  suspend,
}: UseScrollProgressCssVarOptions): UseScrollProgressCssVarResult {
  const snapRafRef = useRef<number | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const isSnappingRef = useRef(false);
  const isTouchActiveRef = useRef(false);

  // Cleanup on unmount — prevent stale DOM mutations or state updates.
  useEffect(() => {
    return () => {
      if (snapRafRef.current !== null) {
        cancelAnimationFrame(snapRafRef.current);
        snapRafRef.current = null;
      }
      if (snapTimeoutRef.current !== null) {
        window.clearTimeout(snapTimeoutRef.current);
        snapTimeoutRef.current = null;
      }
    };
  }, []);

  const setVar = useCallback((el: HTMLElement, progress: number) => {
    el.style.setProperty(CSS_VAR_PROGRESS, String(progress));
  }, []);

  const setDuration = useCallback((el: HTMLElement, ms: number) => {
    el.style.setProperty(CSS_VAR_DURATION, `${ms}ms`);
  }, []);

  const onProgress = useCallback(
    (progress: number) => {
      if (isSnappingRef.current) return;
      const el = containerRef.current;
      if (!el) return;
      setDuration(el, 0);  // instant during active scroll
      setVar(el, progress);
    },
    [containerRef, setVar, setDuration],
  );

  const triggerSnap = useCallback(() => {
    if (isSnappingRef.current) return;  // guard against duplicate scheduling from element + document listeners
    isTouchActiveRef.current = false;
    const progress = progressRef.current;
    if (progress <= 0 || progress >= 1) return;  // already at endpoint

    const snapTo: 0 | 1 = progress >= snapThreshold ? 1 : 0;
    isSnappingRef.current = true;

    // Suppress scroll events during snap + small buffer.
    suspend(SNAP_DURATION_MS + 60);

    const el = containerRef.current;
    if (!el) {
      // No DOM node — commit state synchronously without animation.
      onSnapComplete(snapTo);
      isSnappingRef.current = false;
      return;
    }

    // Set transition in the current frame, then update the progress value in
    // the next frame so the browser registers the transition before the value changes.
    setDuration(el, SNAP_DURATION_MS);

    snapRafRef.current = requestAnimationFrame(() => {
      setVar(el, snapTo);
      snapRafRef.current = null;

      // After the animation finishes: commit state + remove transition.
      snapTimeoutRef.current = window.setTimeout(() => {
        onSnapComplete(snapTo);
        isSnappingRef.current = false;
        if (containerRef.current) {
          setDuration(containerRef.current, 0);
        }
        snapTimeoutRef.current = null;
      }, SNAP_DURATION_MS + 20);
    });
  }, [containerRef, progressRef, snapThreshold, onSnapComplete, suspend, setVar, setDuration]);

  const onTouchStart = useCallback(() => {
    // Cancel any in-flight snap when a new touch begins.
    if (snapRafRef.current !== null) {
      cancelAnimationFrame(snapRafRef.current);
      snapRafRef.current = null;
    }
    if (snapTimeoutRef.current !== null) {
      window.clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }
    isSnappingRef.current = false;
    isTouchActiveRef.current = true;

    const el = containerRef.current;
    if (el) {
      setDuration(el, 0);                  // no transition during active touch
      setVar(el, progressRef.current);     // sync DOM with internal progress ref
    }
  }, [containerRef, progressRef, setDuration, setVar]);

  const onTouchEnd = useCallback(() => {
    triggerSnap();
  }, [triggerSnap]);

  // touchcancel: same snap behavior — the gesture was interrupted by the OS.
  const onTouchCancel = useCallback(() => {
    triggerSnap();
  }, [triggerSnap]);

  return { onProgress, onTouchStart, onTouchEnd, onTouchCancel };
}
```

**Why `onSnapComplete` instead of calling `snap` directly:** the CSS var hook does not know the current scroll value. The caller (`use-scroll-visibility.ts` or `ScrollVisibilityProvider.tsx`) wraps `snap(snapTo, currentValue)` into `onSnapComplete` where it can read the element's live `scrollTop`.

---

### Step 3 — Update `scroll-visibility.types.ts`

File: `packages/ui/src/components/primitives/scroll-visibility/scroll-visibility.types.ts`

Add to `ScrollVisibilityOptions`:
```ts
/**
 * Relative mode only: progress threshold (0–1) at which the snap guard commits
 * to fully hidden instead of snapping back to visible. Defaults to 0.5.
 */
snapThreshold?: number;
```

`ScrollVisibilityContextValue` is unchanged — `hideProgress` is NOT added to context (that would trigger 60 fps re-renders on every scroll event). The CSS custom property cascade is the signal for scroll-linked consumers.

---

### Step 4 — Update `use-scroll-visibility.ts`

File: `packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts`

Changes:

1. Accept `snapThreshold = 0.5` from options. Pass through the existing `hideThreshold` and `showThreshold` to `useScrollState` (they were already passed correctly in this hook).

2. Destructure `progressRef` and `snap` from `useScrollState`.

3. Create `hideProgressContainerRef = useRef<HTMLDivElement>(null)`. This is attached by the caller to a DOM element that is a common ancestor of both the scroll area and all animated elements.

4. Build `onSnapComplete`:
   ```ts
   const onSnapComplete = useCallback((snapTo: 0 | 1) => {
     const element = scrollRef.current;
     const currentValue = element ? getScrollValue(element, inverted) : 0;
     snap(snapTo, currentValue);
   }, [snap, inverted]);
   ```

5. Call `useScrollProgressCssVar` (relative mode only — guard with `mode === "relative"`):
   ```ts
   const progressCssVar = mode === "relative"
     ? useScrollProgressCssVar({
         containerRef: hideProgressContainerRef,
         progressRef,
         snapThreshold,
         onSnapComplete,
         suspend,
       })
     : null;
   ```
   > Note: `useScrollProgressCssVar` must be called unconditionally (hooks cannot be conditional). Instead, always call it but only wire up the listeners if `mode === "relative"`. See wiring step below.

   **Correction:** Always call `useScrollProgressCssVar`. Pass a no-op `onSnapComplete` when in absolute mode (the hook will never be triggered because touch listeners are not attached):
   ```ts
   const { onProgress, onTouchStart, onTouchEnd, onTouchCancel } = useScrollProgressCssVar({
     containerRef: hideProgressContainerRef,
     progressRef,
     snapThreshold,
     onSnapComplete,
     suspend,
   });
   ```

6. In the `useEffect` scroll handler, after calling `onScroll(value)`, add — **relative mode only**:
   ```ts
   if (mode === "relative") {
     onProgress(progressRef.current);
   }
   ```

7. In the `useEffect`, attach touch listeners to the scroll element — **relative mode only**:
   ```ts
   if (mode === "relative") {
     element.addEventListener("touchstart", onTouchStart, { passive: true });
     element.addEventListener("touchend", onTouchEnd, { passive: true });
     element.addEventListener("touchcancel", onTouchCancel, { passive: true });
   }
   ```
   Return cleanup removes these same listeners.

8. Also attach a **document-level** fallback `touchend` / `touchcancel` listener during active touch (iOS Safari can redirect `touchend` to the document when the OS interrupts the gesture). The document listener should call `onTouchEnd` / `onTouchCancel` only when `isTouchActiveRef.current` is true. Wire this inside the same `useEffect` (the `isTouchActiveRef` is owned by `useScrollProgressCssVar` — expose it via an `isTouchActive` getter or check in `onTouchStart` / `onTouchEnd`).

   Simpler implementation: attach a document-level `touchend` listener unconditionally when `mode === "relative"`. The `triggerSnap` guard (`progress <= 0 || progress >= 1`) will be a no-op if the scroll-element touchend already fired first.

9. Return `hideProgressContainerRef` alongside existing returns.

**Updated return type:**
```ts
type UseScrollVisibilityResult = ScrollVisibilityContextValue & {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  hideProgressContainerRef: React.RefObject<HTMLDivElement | null>;
};
```

---

### Step 5 — Update `ScrollVisibilityProvider.tsx`

File: `packages/ui/src/components/primitives/scroll-visibility/ScrollVisibilityProvider.tsx`

**Guaranteed DOM injection:** The original plan's fallback (`internalContainerRef = useRef<HTMLElement>(null)`) was pointless because the provider renders no DOM element and therefore the ref never attaches to a real node. The corrected approach: `ScrollVisibilityProvider` renders a `<div style={{ display: "contents" }}>` wrapper to which `internalContainerRef` is always attached. This guarantees a real DOM node for CSS var injection even when the consumer does not pass an external `containerRef`.

Changes:

1. Accept `snapThreshold = 0.5`, `containerRef?: React.RefObject<HTMLElement>`, `hideThreshold`, and `showThreshold` in props (fix the pre-existing omission where `hideThreshold` / `showThreshold` were accepted but never forwarded to `useScrollState`).

2. Create `internalContainerRef = useRef<HTMLDivElement>(null)`.

3. Resolve: `const effectiveContainerRef = containerRef ?? internalContainerRef`.

4. Destructure `progressRef` and `snap` from `useScrollState` (after passing `hideThreshold` / `showThreshold` correctly).

5. Build `onSnapComplete`:
   ```ts
   const onSnapComplete = useCallback((snapTo: 0 | 1) => {
     const element = scrollElement;
     const currentValue = element ? getScrollValue(element, inverted) : 0;
     snap(snapTo, currentValue);
   }, [snap, scrollElement, inverted]);
   ```

6. Always call `useScrollProgressCssVar`:
   ```ts
   const { onProgress, onTouchStart, onTouchEnd, onTouchCancel } = useScrollProgressCssVar({
     containerRef: effectiveContainerRef,
     progressRef,
     snapThreshold,
     onSnapComplete,
     suspend,
   });
   ```

7. In the `useEffect` scroll handler, after calling `onScroll(...)`, add — **relative mode only**:
   ```ts
   if (mode === "relative") {
     onProgress(progressRef.current);
   }
   ```

8. Add touch listeners to `scrollElement` — **relative mode only** (including document-level `touchend` / `touchcancel` fallback, same pattern as Step 4):
   ```ts
   if (mode === "relative") {
     scrollElement.addEventListener("touchstart", onTouchStart, { passive: true });
     scrollElement.addEventListener("touchend", onTouchEnd, { passive: true });
     scrollElement.addEventListener("touchcancel", onTouchCancel, { passive: true });
     document.addEventListener("touchend", onTouchEnd, { passive: true });
     document.addEventListener("touchcancel", onTouchCancel, { passive: true });
   }
   ```
   Return cleanup removes all five listeners.

9. **Render:** wrap children in a `display: contents` div so `internalContainerRef` attaches to a real DOM element:
   ```tsx
   return (
     <ScrollVisibilityContext.Provider value={{ isHidden, reset, suspend }}>
       <div ref={internalContainerRef} style={{ display: "contents" }}>
         {children}
       </div>
     </ScrollVisibilityContext.Provider>
   );
   ```
   When an external `containerRef` is passed, `effectiveContainerRef` points there and the `internalContainerRef` div remains in the DOM but receives no CSS vars (harmless).

**Updated props type:**
```ts
type ScrollVisibilityProviderProps = ScrollVisibilityOptions & {
  scrollElement: HTMLElement | null;
  containerRef?: React.RefObject<HTMLElement>;
  children: React.ReactNode;
};
```

---

### Step 6 — Update `index.ts` re-exports

File: `packages/ui/src/components/primitives/scroll-visibility/index.ts`

No new public exports needed. `use-scroll-progress-css-var.ts` is internal only. `hideProgressContainerRef` is part of the `useScrollVisibility` return shape — no separate export.

---

### Step 7 — Update `TaskNoteListPanel.tsx`

File: `packages/task-notes/src/components/TaskNoteListPanel.tsx`

**Guaranteed injection:** `useScrollVisibility` returns `hideProgressContainerRef`. Attach it to the existing outermost `div` — a real DOM node that is an ancestor of both the scroll area and the animated button.

Changes:
1. Destructure `hideProgressContainerRef` from `useScrollVisibility`.
2. Add `ref={hideProgressContainerRef}` to the outermost `div.relative.flex.h-full.flex-col`.
3. Replace the hide button's class-based animation:

Before:
```tsx
<div
  className={cn(
    "absolute inset-x-0 bottom-0 px-1 pb-1 transition-transform duration-300",
    isHidden ? "translate-y-full" : "translate-y-0",
  )}
>
```

After:
```tsx
<div
  className={cn(
    "absolute inset-x-0 bottom-0 px-1 pb-1 will-change-transform",
    isHidden ? "pointer-events-none" : null,
  )}
  style={{
    transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
    opacity: "calc(1 - var(--scroll-hide-progress, 0))",
    transition:
      "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
  }}
>
```

`isHidden` is kept for `pointer-events-none` so taps are blocked when fully hidden.

---

### Step 8 — Update `TaskNoteUnreadViewerPage.tsx` (UnreadViewerFooter)

File: `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx`

**Guaranteed injection via external `containerRef`:** the `ScrollVisibilityProvider`'s internal `display: contents` wrapper div provides a fallback, but since the provider is already inside a real container div, the external `containerRef` pattern gives explicit control and avoids relying on CSS var propagation through the `display: contents` wrapper across multiple browsers.

Changes:
1. In `TaskNoteUnreadViewerPage`, create `containerRef = useRef<HTMLDivElement>(null)` and pass it to `ScrollVisibilityProvider`:
   ```tsx
   <ScrollVisibilityProvider
     mode="relative"
     scrollElement={activeScrollElement}
     threshold={16}
     containerRef={containerRef}
   >
   ```
2. Attach `ref={containerRef}` to the existing outer viewer `div` (which already wraps both the carousel and the footer):
   ```tsx
   <div
     ref={containerRef}
     className="relative bg-background"
     data-testid="task-note-unread-viewer"
     style={{ height: NOTES_PANEL_HEIGHT }}
   >
   ```
3. In `UnreadViewerFooter`, replace the class-based animation:

Before:
```tsx
<div
  className={cn(
    "absolute inset-x-0 bottom-0 ... transition-transform duration-300",
    isHidden ? "translate-y-full" : "translate-y-0",
  )}
>
```

After:
```tsx
<div
  className={cn(
    "absolute inset-x-0 bottom-0 ... will-change-transform",
    isHidden ? "pointer-events-none" : null,
  )}
  style={{
    transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
    opacity: "calc(1 - var(--scroll-hide-progress, 0))",
    transition:
      "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
  }}
>
```

---

### Step 9 — Update `WorkingSectionShortcutBar.tsx` (translate mode only)

File: `packages/ui/src/components/primitives/working-section-shortcut-bar/WorkingSectionShortcutBar.tsx`

**CSS var source:** `WorkingSectionShortcutBar` uses `useScrollVisibilityContext()`. The CSS var comes from the closest `ScrollVisibilityProvider` ancestor, which now always renders a `display: contents` wrapper that sets the vars. This guarantees the vars are available without requiring the consumer to pass a `containerRef`.

**Opacity retained:** The element may not be fully clipped by its parent. Drop in opacity prevents it from remaining partially visible when sliding out.

Changes:

Replace the `animationMode === "translate"` branch inside `className={cn(...)}`:

Before:
```tsx
animationMode === "translate"
  ? [
      "transition-[transform,opacity] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform",
      isHidden
        ? "pointer-events-none translate-y-full opacity-0"
        : "translate-y-0 opacity-100",
    ]
```

After (classes only control pointer-events; animation is driven by CSS vars):
```tsx
animationMode === "translate"
  ? [
      "will-change-transform",
      isHidden ? "pointer-events-none" : null,
    ]
```

Add `style` prop to the outer `div` (alongside the existing `className` and `data-testid`):
```tsx
<div
  className={cn(...)}
  data-testid={testId}
  style={
    animationMode === "translate"
      ? {
          transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
          opacity: "calc(1 - var(--scroll-hide-progress, 0))",
          transition:
            "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
        }
      : undefined
  }
>
```

The `collapse` mode (`max-height` animation) is unchanged — it stays class-based because `max-height` cannot be driven by `--scroll-hide-progress` without knowing the exact pixel height of the bar.

---

## Consumer audit — what is NOT changed and why

| Consumer | Animation type | Changed? | Reason |
|---|---|---|---|
| `CasesView.tsx` | isCompact header | No | Binary content swap; no scroll-linked mid-state |
| `TasksView.tsx` | isCompact header | No | Same |
| `UpholsteryPickerSlidePage.tsx` | isCompact header | No | Same |
| `UpholsteryInventoryDetailSlidePage.tsx` | `isHidden` → footer opacity | No | Uses `useScrollVisibility` directly; snap guard fires via `isHidden` boolean flip |
| `TaskWorkingSectionsSlidePage.tsx` footer | grid-template-rows collapse | No | Cannot map to 0–1 progress without pixel height |
| `TaskCreationAssignmentFooter.tsx` | grid-template-rows collapse | No | Same |
| `WorkingSectionPickerField.tsx` | max-height + opacity | No | Same |
| Workers `AppScrollElementProvider.tsx` | global provider shell | No | Context provider only; consumers handle animation independently |

---

## CSS custom property contract

Both properties are set simultaneously on a single DOM element (the `containerRef` or the provider's `display: contents` wrapper div).

| Property | During active scroll | During snap transition | Default (no injection) |
|---|---|---|---|
| `--scroll-hide-progress` | 0–1 real-time | 0 or 1 (target) | `0` (fallback in `var(...)`) |
| `--scroll-snap-duration` | `0ms` | `300ms` | `0ms` (fallback in `var(...)`) |

**Inline style patterns by hide direction:**

```ts
// Slide down (element exits at the bottom)
style={{
  transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
}}

// Slide up (element exits at the top)
style={{
  transform: "translateY(calc(var(--scroll-hide-progress, 0) * -100%))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
}}

// Slide right (element exits at the right)
style={{
  transform: "translateX(calc(var(--scroll-hide-progress, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
}}

// Slide left (element exits at the left)
style={{
  transform: "translateX(calc(var(--scroll-hide-progress, 0) * -100%))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
}}
```

Opacity is always recommended alongside transform to handle cases where the parent does not clip the element fully. Any consumer can omit opacity if the element is guaranteed to be clipped when progress = 1.

---

## Risks and mitigations

- Risk: `touchend` does not fire on the scroll element on iOS Safari (scroll containers can redirect touch events).
  Mitigation: **Built-in** document-level `touchend` / `touchcancel` listeners are attached whenever `mode === "relative"`. The `triggerSnap` guard (`progress <= 0 || progress >= 1`) prevents a double-snap if both the element-level and document-level listeners fire.

- Risk: During momentum scroll (after `touchend`), the `suspend` call (360 ms) may not cover the full momentum duration.
  Mitigation: The CSS var is pinned to the snap target (0 or 1) after the rAF fires. Even if a stale scroll event passes through after `suspend` expires, the `onScroll` path updates `progressRef` but `onProgress` is guarded by `isSnappingRef.current`. The `isSnappingRef` is cleared only after `onSnapComplete` runs at the end of `snapTimeoutRef`.

- Risk: `display: contents` CSS custom property propagation has historical Safari bugs (< 11.1).
  Mitigation: This app targets iOS 14+; the bug is resolved in all target browsers. As a belt-and-suspenders measure, provider-based consumers with critical animation (e.g. `TaskNoteUnreadViewerPage`) are migrated to the explicit `containerRef` pattern (Step 8), making the `display: contents` wrapper a fallback not a dependency for those cases.

- Risk: New `snap(snapTo, currentScrollValue)` signature breaks existing callers of `useScrollState`.
  Mitigation: `snap` is a new return value from `useScrollState`; it was not in the previous API. No existing consumer calls it. Only `use-scroll-visibility.ts` and `ScrollVisibilityProvider.tsx` call it (through `onSnapComplete`). No breaking change.

- Risk: `hideThreshold` / `showThreshold` fix in `ScrollVisibilityProvider.tsx` (Step 5) changes behaviour for any caller that passed these props.
  Mitigation: No current caller passes them to the provider (they were silently ignored before). The fix is a correction with no observable regression.

- Risk: RAF or setTimeout fires after the component unmounts, mutating a detached DOM node.
  Mitigation: `useEffect` cleanup in `use-scroll-progress-css-var.ts` cancels both `snapRafRef` and `snapTimeoutRef` on unmount. `containerRef.current` will be `null` by the time `onSnapComplete` runs because React clears refs before calling unmount effects; the `containerRef.current` null guard in `setDuration` prevents the mutation.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors.

Manual tests on a mobile device or Chrome DevTools touch emulation:

**Hook-based consumers (useScrollVisibility with `hideProgressContainerRef`):**
- `TaskNoteListPanel` — scroll down → button slides with finger; release mid-scroll → button snaps fully; `isHidden` pointer-events block correctly at 1.0.
- `TaskNoteListPanel` — scroll to 30%, release → button snaps back to 0 (visible).
- `TaskNoteListPanel` — change scroll direction mid-slide (before threshold) → progress reverses smoothly; release → snaps correctly.

**Provider-based consumers (ScrollVisibilityProvider with explicit `containerRef`):**
- `TaskNoteUnreadViewerPage` — scroll note content → "Got it" footer slides with finger → snap on release.
- `TaskNoteUnreadViewerPage` — scroll halfway → `touchcancel` simulated (drag outside window) → footer snaps, not left mid-state.

**Provider-based consumer without explicit `containerRef` (CSS var flows from `display: contents` wrapper):**
- `WorkingSectionShortcutBar` (translate mode) — scroll in task working sections slide → shortcut bar tracks + opacity fades → snaps on release.
- Verify bar is not visible at progress = 1 (fully hidden + opacity 0 + pointer-events-none).
- **CSS var propagation QA (required before marking approved):** open the real screen where `WorkingSectionShortcutBar` renders inside a `ScrollVisibilityProvider` (no explicit `containerRef`). In Chrome DevTools Elements panel, select the shortcut bar element and check the computed value of `var(--scroll-hide-progress, 0)` while scrolling. It must show a live changing value (e.g. `0.4`), not always `0`. If the variable does not propagate through the `display: contents` wrapper on the target device or browser, migrate that screen to the explicit `containerRef` pattern (same as `TaskNoteUnreadViewerPage` in Step 8) before shipping.

**Direction coverage:**
- A consumer that slides down (add note button): validated via `TaskNoteListPanel`.
- A consumer that slides up: not currently implemented in this plan but document the pattern for future use.
- Left/right: not implemented; pattern is documented in the CSS variable contract section above.

**Absolute mode regression:**
- Open any absolute-mode consumer (e.g. `StagedForm` timeline) → scroll → verify behaviour is identical to pre-plan: no touch listeners, no CSS var injection, no progress tracking.

**Snap anchor correctness:**
- Scroll to full hide → release → scroll back down immediately → verify button does not jump (clean anchor from `snap(snapTo, currentScrollValue)`).
- Snap to visible → scroll up again → verify new gesture starts from 0 cleanly.

**No React re-renders during scroll:**
- Open React DevTools Profiler → scroll rapidly in `TaskNoteListPanel` → confirm only scroll listener callback fires; no component tree re-renders during scroll gesture.

**Typecheck:**
- `npm run typecheck` — zero errors across all modified packages.

---

## Review log

- `2026-06-27` `david`: corrections applied — CSS var injection guaranteed via `display: contents` wrapper in provider; `snap()` updated to accept `currentScrollValue`; `touchcancel` added; RAF + setTimeout cleanup added; threshold guard added; absolute mode guarded; opacity kept in `WorkingSectionShortcutBar`; validation expanded; document-level touch fallback made built-in.
- `2026-06-27` `david`: final safeguards — `isSnappingRef.current` guard added at top of `triggerSnap()` to prevent duplicate RAF scheduling from element + document listeners firing on the same gesture; `onTouchStart()` now writes `progressRef.current` back to the CSS var via `setVar` to keep DOM in sync when a new touch interrupts an in-flight snap; `dependencies array` of `onTouchStart` updated to include `progressRef` and `setVar`; QA check added to validation for CSS var propagation through `display: contents` provider fallback in `WorkingSectionShortcutBar`.

## Lifecycle transition

- Current state: `archived`
- Next state: —
- Transition owner: `david`
