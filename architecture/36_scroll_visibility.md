# 36 — Scroll Visibility Contract

## Purpose

Scroll visibility is the pattern where UI elements hide when the user scrolls down and reappear when they scroll back up. Two distinct patterns exist in this app, and choosing the wrong one causes either the wrong element to hide, or the shell-level card's behaviour to break after navigation.

---

## The two patterns

| Pattern | Hook | Scope | Use for |
|---|---|---|---|
| **Global** | `useScrollVisibilityContext()` | Reads app-wide state | Shell-level elements that respond to the active page's scroll |
| **Local** | `useScrollHide()` | Creates private state | Surfaces / slides that manage their own scroll and their own hide targets |

These two patterns are completely independent. A component using `useScrollVisibilityContext()` never interferes with a component using `useScrollHide()`, and vice versa.

---

## Visibility modes

Every visibility controller accepts a `mode` option that controls when hiding and showing are triggered.

### `mode: "absolute"` (default)

Position-based. Compares absolute scroll position against a fixed threshold from the anchor edge.

- Hides once scroll position exceeds `threshold` px from the top (or bottom when `inverted`).
- Shows only when scroll position returns within `hysteresis` px of the anchor edge.
- Use when the hide/show decision should be tied to how far the user is from the edge, not to scroll direction.

### `mode: "relative"`

Direction-based. Tracks the scroll position at each direction reversal (the anchor). Compares current position against that anchor.

- Hides after scrolling `hideThreshold` px in the hide direction from the last reversal point.
- Shows after scrolling `showThreshold` px in the show direction from the last reversal point.
- The user never needs to return to the top or bottom edge to trigger show.
- `hideThreshold` and `showThreshold` each fall back to `threshold` when omitted.
- `hysteresis` is unused in this mode.
- Use for elements that should respond fluidly to mid-page scroll gestures.
- Drives the **progressive CSS var animation** (see below).

### `inverted` flag — composes with both modes

`inverted` flips which direction is "forward" (increasing scroll value).

| `mode` | `inverted` | Hides when | Shows when |
|---|---|---|---|
| `"absolute"` | `false` | scrolled past `threshold` from top | back within `hysteresis` of top |
| `"absolute"` | `true` | scrolled past `threshold` from bottom | back within `hysteresis` of bottom |
| `"relative"` | `false` | scrolled down `hideThreshold` px from last reversal | scrolled up `showThreshold` px from last reversal |
| `"relative"` | `true` | scrolled up `hideThreshold` px from last reversal | scrolled down `showThreshold` px from last reversal |

---

## Progressive CSS var animation (relative mode)

When `mode: "relative"` is active the system injects CSS custom properties onto `hideProgressContainerRef`:

| Variable | Range | Meaning |
|---|---|---|
| `--scroll-hide-progress` | `0` → `1` | How far along the core hide animation is. `0` = fully visible, `1` = fully hidden. During an active drag it tracks the latest scroll-derived value on the next animation frame. |
| `--scroll-hide-progress-footer` | `0` → `1` | Optional footer/navigation-specific progress channel. Only present for callers that opt into edge reveal. |
| `--scroll-snap-duration` | `0ms` / `400ms` | Core/header duration. `0ms` during active drag and `400ms` while completing a release snap. |
| `--scroll-snap-duration-footer` | `0ms` / `160ms` / `400ms` | Footer-specific duration. It normally follows the core snap, but an authoritative edge reveal uses `160ms` so the configured edge offset is visually meaningful before momentum reaches the physical edge. |

Animated elements read these vars via inline `style`. Continuous visual progress does not require a React render; only semantic endpoint changes such as `isHidden` or `isAtEdge` may render.

### Frame-coalesced direct tracking

Continuous progress updates refs only. Semantic endpoints may update React state, but at most one `requestAnimationFrame` callback is queued before the next paint, and that callback reads the latest progress and performs the CSS custom-property writes together.

- Multiple scroll events before one paint collapse into one DOM write.
- Active finger dragging follows the latest scroll value without recursive interpolation.
- No background animation loop continues after scrolling stops.
- Do not restore frame-based lerp smoothing. A fixed per-frame lerp is refresh-rate-dependent, deliberately trails the finger, can require roughly 20–30 extra frames to converge, and keeps invalidating styles after input has stopped.

This work lives in `packages/ui/src/components/primitives/scroll-visibility/use-scroll-progress-css-var.ts`. Changing it affects every relative-mode consumer.

### Snap behaviour on finger lift

On `touchend` / `touchcancel`, the system reads the current scroll direction and completes toward `0` or `1` (fully visible or fully hidden). The target is direction-based — it does not use a midpoint threshold.

The release decision must compare the target with the **last visual progress written to the DOM**, not only the logical scroll-state ref. A fast swipe can move logical progress to an endpoint before the browser paints it. Treating that logical endpoint as already complete makes the next pending frame jump directly to `0` or `1`.

Only one release may be processed per active touch gesture. `touchend` is registered on both the scroll element and `document` as a fallback and can bubble through both. The `isTouchActive` guard prevents the second call from reversing direction after the first call finalizes state.

During native momentum, the release snap owns ordinary direction changes, but a configured physical-edge reveal remains authoritative. See “Footer edge reveal during momentum” below.

### `hideProgressContainerRef`

`useScrollHide()` returns a `hideProgressContainerRef`. Attach it to the **narrowest DOM ancestor that contains every element reading the scroll CSS vars**. CSS custom properties cascade through the DOM tree, including through `position: fixed` and `position: absolute` descendants.

This is a performance boundary, not just a wiring ref. Updating an inherited custom property makes its descendant subtree eligible for style invalidation. If only a header animates, put the ref on the header animation wrapper—not on a page root that also contains hundreds of cards and images. If both a header and footer consume the vars, use their nearest practical common ancestor and keep large unrelated subtrees outside that boundary when the layout permits it.

If the ref is not attached to any element, CSS vars are never written and the animation does not work.

### Rendering and compositor invariants

Smooth scroll-linked UI depends more on the work performed per frame than on how visually complex the page appears.

- Animate `transform` and `opacity` only. Do not progressively animate layout properties such as `height`, `top`, `margin`, or `padding`.
- Add `will-change: transform` or `will-change: transform, opacity` only to the small surfaces that actually animate. Do not promote an entire long page or list.
- Scroll progress lives in refs and CSS custom properties. Never put continuous progress in React state.
- `isHidden` and `isAtEdge` are endpoint/semantic state and may cause a React render. Keep large lists outside that render path, or memoize their element tree with stable data and handler identities. Passing newly created object props defeats a child component's `memo()` shallow comparison.
- Passive scroll/touch listeners and rAF coalescing are mandatory. A scroll event handler may calculate refs, but DOM writes belong in the single queued animation frame.
- Pull-to-refresh gesture work is independent of ordinary scroll visibility. Do not add competing transforms to the scroll container for the normal-scroll path.

---

## Global pattern — shell elements

### Architecture

```
AppScrollElementProvider                           (app/providers layer)
  ├─ scrollElement: HTMLElement | null             (state — one element at a time)
  ├─ ScrollElementRegistrationContext              (@beyo/ui — consumed by PullToRefresh)
  └─ ScrollVisibilityProvider(scrollElement, mode="relative")
       └─ ScrollVisibilityContext                  (@beyo/ui — one isHidden boolean)
            ├─ LastActiveStepCard                  useScrollVisibilityContext() → isHidden
            └─ any other shell element             useScrollVisibilityContext() → isHidden
```

`AppScrollElementProvider` wraps the entire `AppShell`. There is exactly one `scrollElement` in state at any time — whichever page the user is currently on. `ScrollVisibilityProvider` wires a scroll listener to that element and derives the single `isHidden` boolean. Every consumer in the tree shares the same value.

### Using `useScrollVisibilityContext()`

Call this from any component that should show or hide based on the active page's scroll. It reads the global `isHidden` boolean — no setup, no refs, no wiring needed.

```tsx
import { useScrollVisibilityContext } from "@beyo/ui";

function LastActiveStepCard(): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();

  return (
    <div
      className={cn(
        "fixed bottom-[60px] left-0 right-0 z-[49] will-change-transform",
        isHidden && "pointer-events-none",
      )}
      style={{
        transform:
          "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
        opacity: "calc(1 - var(--scroll-hide-progress, 0))",
        transition:
          "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
      }}
    >
      ...
    </div>
  );
}
```

Do not call this inside a surface or slide. It reads from the page scroll behind the surface, which is not what the surface should respond to.

---

## How pages register their scroll element

`ScrollVisibilityProvider` only works if the active page registers its scroll container. There are three registration mechanisms depending on how the page owns its scroll ref.

### Mechanism A — `PullToRefresh` without an external ref (auto-registration)

When `PullToRefresh` is rendered without a `scrollRef` prop, it owns the scroll container internally and auto-registers it via `ScrollElementRegistrationContext`. No per-page code is needed.

```tsx
// Package-level page — PullToRefresh owns the ref, auto-registers
<PullToRefresh onRefresh={refetch}>
  {content}
</PullToRefresh>
```

This covers all pages inside packages (`@beyo/cases`, `@beyo/home`, etc.) that cannot call app-level hooks.

### Mechanism B — External `scrollRef` + explicit `useRegisterScrollElement()`

When a view creates its own `scrollRef` and passes it to `PullToRefresh` (needed to do imperative scroll checks, e.g. pull-to-refresh threshold detection), `PullToRefresh` does not auto-register. The view must call `useRegisterScrollElement()` explicitly.

```tsx
import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";

export function WorkingSectionsHomeView(): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const registerScrollElement = useRegisterScrollElement();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return registerScrollElement(el); // returns cleanup — use as effect return
  }, [registerScrollElement]);

  return (
    <PullToRefresh scrollRef={scrollRef} onRefresh={refetch}>
      {content}
    </PullToRefresh>
  );
}
```

The cleanup returned by `registerScrollElement` is identity-safe: it only clears the scroll element if the element being deregistered is still the currently active one. This prevents the exit animation of the old page from wiping out the new page's registration.

### Mechanism C — No `PullToRefresh` (plain scroll container)

Pages without `PullToRefresh` (e.g. Settings) need both a scrollable container and explicit registration.

```tsx
export function SettingsView(): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const registerScrollElement = useRegisterScrollElement();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return registerScrollElement(el);
  }, [registerScrollElement]);

  return (
    // Outer div: scroll container only — no layout classes here
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-y-none">
      {/* Inner div: layout */}
      <div className="flex flex-col gap-4 p-6">
        {content}
      </div>
    </div>
  );
}
```

The scroll container and the layout div must be separate elements. Combining `flex flex-col` with `overflow-y-auto` on the same element causes flex to shrink children to fit the container — they will not overflow and scroll will not trigger. See `29_scrollbars.md §Flex column without min-h-0`.

### Which mechanism to use

| Scenario | Mechanism |
|---|---|
| Page is inside a package (`@beyo/*`) | A — PTR auto-registration |
| App-internal view with `PullToRefresh` and its own `scrollRef` | B — explicit `useRegisterScrollElement()` |
| App-internal view without `PullToRefresh` | C — explicit registration + separate scroll container div |

---

## Local pattern — surfaces and slides

Surfaces and slides have their own scroll containers and their own elements to hide (e.g. a footer action bar). They must not interact with the global scroll state.

Use `useScrollHide()`. It is self-contained: it creates its own `scrollRef`, `hideProgressContainerRef`, and `isHidden` state with no connection to `AppScrollElementProvider`.

### Standard wiring

```tsx
import { useScrollHide } from "@beyo/ui";

function TaskDetailSlidePageContent(): React.JSX.Element {
  const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();

  return (
    <div className="flex h-full flex-col">

      {/* 1. Attach scrollRef to the scrollable container. */}
      <PullToRefresh scrollRef={scrollRef} onRefresh={refetch}>
        {content}
      </PullToRefresh>

      {/* 2. Scope the progress ref to the only animated element. */}
      {/* 3. The animated element reads CSS vars via inline style. */}
      {/* Footer slides DOWN to hide (positive translateY). */}
      <div
        ref={hideProgressContainerRef}
        className={cn(
          "absolute bottom-0 left-0 right-0 z-10 will-change-transform",
          isHidden ? "pointer-events-none" : null,
        )}
        style={{
          transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
          opacity: "calc(1 - var(--scroll-hide-progress, 0))",
          transition: "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
        }}
      >
        <ActionFooter />
      </div>
    </div>
  );
}
```

### Animation direction reference

| Element | Direction | `transform` |
|---|---|---|
| Footer / bottom bar | slides down to hide | `translateY(calc(var(--scroll-hide-progress, 0) * 100%))` |
| Footer with `revealAtEdge` | slides down to hide; has independent edge override | `translateY(calc(var(--scroll-hide-progress-footer, 0) * 100%))` |
| Header / top bar | slides up to hide | `translateY(calc(-100% * var(--scroll-hide-progress, 0)))` |
| Fade only (no translate) | — | omit `transform`, keep `opacity` |

Always pair translate with opacity and `--scroll-snap-duration` transition:

```tsx
style={{
  transform: "...",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition: "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
}}
```

Use `isHidden` only for `pointer-events-none` — never for the visual animation.

For an edge-aware footer, use `--scroll-hide-progress-footer` and `--scroll-snap-duration-footer` as shown in “Footer edge reveal during momentum.” Do not mix the footer progress channel with the core duration variable; doing so visually delays the configured offset during a momentum snap.

### Footer layout: out-of-flow positioning required

Footers that animate out must be out of normal flex flow—normally `position: absolute`, or `position: fixed` for a surface-level viewport footer—so translating them does not change the scroll container's available height. If the footer is a flex child (`shrink-0`), it still occupies layout space even when translated away, cropping the scroll area.

The scroll container needs `paddingBottom` equal to the footer's height so content is not clipped behind it. Measure this with a `ResizeObserver` on the footer element for footers with dynamic height (e.g. those with a conditional shortcut bar).

### `StagedForm` — built-in scroll hide

`StagedForm` calls `useScrollHide()` internally and wires everything automatically:

- An optional `header` prop renders as normal scrollable content above the step content. It is not part of the scroll-visibility system.
- The step-label timeline slides **up** and fades on scroll-down when no `header` prop is supplied.
- When a `header` prop is supplied, the header and timeline both render as ordinary scrollable content above the step content and are not part of the scroll-visibility system.
- Any `footer` prop or the default `StagedFormNavigation` slides **down** and fades on scroll-down.
- The scroll container's `paddingBottom` adapts to the footer's measured height.
- Its footer/navigation also enables a bottom-edge reveal override so long-step actions are forced visible again near the physical end of the scroll container, even if the user never reversed scroll direction.
- That edge override only drives the footer/navigation signal (`--scroll-hide-progress-footer`). The timeline keeps reading the base `--scroll-hide-progress` signal, so its visibility remains purely direction-based.
- That bottom-edge reveal threshold defaults to the footer's measured height, but consumers can override it with `footerEdgeOffset` when a fixed reveal distance is preferable to live footer-height tracking.
- The edge override remains active while a release snap suppresses ordinary directional updates. Native momentum can enter and stop inside the edge zone without producing any later scroll event.
- An in-flight footer hide is retargeted to visible as soon as momentum enters the edge zone. Footer edge reveal uses `--scroll-snap-duration-footer` so it can complete before the physical bottom while the core/header snap keeps its own timing.
- Footer children that animate with `--scroll-hide-progress-footer` must not also sit inside a layout-collapsing wrapper (`grid-template-rows`, `max-height`, similar) whose height contributes to the measured staged-form footer. That mixes paint-only animation with live geometry changes and can create bottom-edge reveal oscillation.

No external wiring needed. Just render `<StagedForm>` and pass the content.

```tsx
// No useScrollHide() call needed in the parent page.
<StagedForm steps={...} footer={<MyFooter />} ...>
  <StagedFormStep id="step-1">...</StagedFormStep>
</StagedForm>
```

### `useScrollHide()` vs `useScrollVisibility()`

| Hook | Use when |
|---|---|
| `useScrollHide()` | Standard case. Shared thresholds, frame coalescing, touch release, and edge behavior are already configured. Use this. |
| `useScrollVisibility({ mode: "relative", ... })` | Custom thresholds needed for a non-standard use case. Rare. |

`useScrollHide` is defined in `packages/ui/src/components/primitives/scroll-visibility/use-scroll-hide.ts`. Its threshold values (`hideThreshold`, `showThreshold`) are the single source of truth for the feel of all local scroll animations. Changing them changes every consumer at once.

For rare local cases, `useScrollHide()` also accepts two additive fields only. Custom thresholds or a different mode still require calling `useScrollVisibility()` directly:

- `revealAtEdge: "top" | "bottom"` forces the element fully visible whenever the scroll container is within `edgeOffset` px of that physical edge.
- `edgeOffset` defaults to `0`. Use the hidden element's height when the reveal should engage as the user enters that reserved gutter.
- This override is relative-mode-only and opt-in; callers that omit it keep the existing direction-based behavior unchanged.

### Footer edge reveal during momentum

Edge detection must not be treated like an ordinary direction update. When a user releases a fast swipe, native scrolling may continue after `touchend`. The core snap temporarily suppresses direction processing so momentum cannot fight the chosen fold/unfold target, but `revealAtEdge` must still be evaluated for every scroll event during that window.

Required sequence:

1. Finger release selects the direction-based core and footer snap targets.
2. Native momentum continues scrolling.
3. If distance from the configured edge becomes `<= edgeOffset`, `isAtEdge` becomes true and footer progress becomes `0` even while the core snap is active.
4. Any in-flight footer hide target is changed to `0` and uses the short footer edge-reveal duration.
5. Snap completion preserves `isAtEdge`; it must not blindly reset the edge flag.

Without these rules, a swipe can reach the bottom entirely inside the suppression window. The footer then remains hidden until the user performs another drag at a scroll position that cannot move further.

Footer elements using the edge-specific channel must use the footer duration variable with a compatibility fallback:

```tsx
style={{
  transform:
    "translateY(calc(var(--scroll-hide-progress-footer, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress-footer, 0))",
  transition:
    "transform var(--scroll-snap-duration-footer, var(--scroll-snap-duration, 0ms)) ease-out, opacity var(--scroll-snap-duration-footer, var(--scroll-snap-duration, 0ms)) ease-out",
}}
```

---

## Container architecture patterns

The CSS vars are identical across all consumers. What varies is how each element uses them. Three patterns have been established.

---

### Pattern A — Single element, full-height translation

The simplest case. One element slides entirely off screen. Use `100%` as the translation amount — the element's own height, so it lands exactly at the edge at progress=1.

**When to use:** a footer or bottom action bar that should fully disappear; a header timeline that should fully disappear. The element must be out of normal layout flow (see “Footer layout” above).

**Direction:**
- Footer (slides down): `translateY(calc(var(--scroll-hide-progress, 0) * 100%))`
- Header (slides up): `translateY(calc(-100% * var(--scroll-hide-progress, 0)))`

**Example — task detail footer (`TaskDetailBottomActions`):**

```tsx
// Parent (TaskDetailSlidePageContent)
const {
  scrollRef,
  isHidden,
  isAtEdge,
  hideProgressContainerRef,
} = useScrollHide({
  revealAtEdge: "bottom",
  edgeOffset: BOTTOM_ACTIONS_EDGE_OFFSET_PX,
});
const isFooterHidden = isHidden && !isAtEdge;

<div ref={hideProgressContainerRef} className="flex h-full flex-col bg-background">
  <PullToRefresh scrollRef={scrollRef} ...>{content}</PullToRefresh>
  <TaskDetailBottomActions isHidden={isFooterHidden} ... />
</div>

// TaskDetailBottomActions — fixed/absolute overlay, slides down
<div
  className={cn(
    "absolute bottom-0 left-0 right-0 z-10 will-change-transform",
    isHidden ? "pointer-events-none" : null,
  )}
  style={{
    transform:
      "translateY(calc(var(--scroll-hide-progress-footer, 0) * 100%))",
    opacity: "calc(1 - var(--scroll-hide-progress-footer, 0))",
    transition:
      "transform var(--scroll-snap-duration-footer, var(--scroll-snap-duration, 0ms)) ease-out, opacity var(--scroll-snap-duration-footer, var(--scroll-snap-duration, 0ms)) ease-out",
  }}
>
  ...
</div>
```

---

### Pattern B — Wrapper partial translation (pinned section stays visible)

The wrapper translates by a fixed amount equal to the height of the section that should disappear, not by the wrapper's full height. This leaves a "pinned" section (e.g. a search bar) at the top edge at progress=1, fully visible.

The collapsing section inside the wrapper only fades — the wrapper translation handles the movement. No `overflow: hidden` needed; the section exits through the viewport top naturally.

**When to use:** a header that has one collapsing section at the top and one persistent section (search bar, primary action) that should remain visible and slide up to the top edge.

**Key detail:** the translation amount is a fixed CSS var (`--type-picker-height`), not `100%`. It equals the collapsing section's height and must be tuned to match the rendered element.

**Example — `TasksView` header wrapper:**

```tsx
// TasksView — wrapper translates by collapsing section height only
const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();

<div className="relative flex-1 min-h-0">
  <div
    ref={hideProgressContainerRef}
    className="absolute inset-x-0 top-0 z-10 will-change-transform"
    style={{
      transform: "translateY(calc(-1 * var(--type-picker-height, 56px) * var(--scroll-hide-progress, 0)))",
      transition: "transform var(--scroll-snap-duration, 0ms) ease-out",
      pointerEvents: isHidden ? "none" : undefined,
    }}
  >
    <TasksHeader ... />
  </div>
  {/* The long list is a sibling, outside the CSS-var invalidation subtree. */}
  <PullToRefresh scrollRef={scrollRef} ...>{content}</PullToRefresh>
</div>

// TasksHeader — collapsing section fades only (wrapper handles movement)
<div className="relative flex flex-col bg-background">
  <div
    className="px-4 pb-2 pt-3 will-change-[opacity]"
    style={{
      opacity: "calc(1 - var(--scroll-hide-progress, 0))",
      transition: "opacity var(--scroll-snap-duration, 0ms) ease-out",
    }}
  >
    <BoxSlidePicker ... />  {/* this is the collapsing section */}
  </div>

  {/* pinned section — no animation */}
  <div className="relative z-10 bg-background px-4 py-2">
    <SearchBar ... />
  </div>
</div>
```

---

### Pattern C — Absolute child with z-index mask

A secondary section sits `position: absolute` at `top: 100%` of a relative ancestor (just outside the ancestor's layout box). It has its own `translateY(-100%)` animation that slides it up on top of the wrapper translation. A sibling with `position: relative; z-index; background` acts as an opaque mask — the section disappears behind it. No `overflow: hidden` needed.

**When to use:** a secondary section (e.g. filter pills) that should slide up and hide behind a persistent element (e.g. a search bar) while a Pattern B wrapper is already translating the whole structure. The section is outside the layout flow so it does not affect the ancestor's height.

**Key detail:** the section's total upward movement at progress=1 equals its own height (`translateY(-100%)`) plus the wrapper's translation. The mask sibling must have an opaque background matching the page background.

**Example — filter pills in `TasksHeader`:**

```tsx
// Search bar — mask element, must have opaque bg and z-index above pills
<div className="relative z-10 bg-background px-4 py-2">
  <SearchBar ... />
</div>

// Pills — absolute, top:100% places them just below the search bar (outside layout box).
// Own translateY(-100%) + wrapper translation together slide them behind the search bar.
<div
  className="absolute inset-x-0 bg-background [will-change:transform,opacity]"
  style={{
    top: "100%",
    transform: "translateY(calc(-100% * var(--scroll-hide-progress, 0)))",
    opacity: "calc(1 - var(--scroll-hide-progress, 0))",
    transition: "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
  }}
>
  <HorizontalScrollArea ...>
    <BoxPicker ... />
  </HorizontalScrollArea>
</div>
```

---

### Choosing a pattern

| Scenario | Pattern |
|---|---|
| Single element hides completely (footer, timeline header) | A — full-height translation, out of normal layout flow |
| Header with a collapsing top section and a persistent section that slides to the top edge | B — wrapper partial translation by collapsing section height |
| Secondary section hides behind a persistent sibling (e.g. pills behind search bar) | C — absolute `top:100%` + z-index mask, combines with Pattern B wrapper |

Patterns B and C are always used together: B handles the wrapper and the collapsing top section, C handles the secondary section below the persistent element.

---

## Implementation and review checklist

Use this checklist whenever creating another scroll-visibility utility or wiring a new consumer.

### Shared controller

- [ ] Scroll and touch listeners are passive.
- [ ] Continuous scroll state and progress live in refs, not React state.
- [ ] Scroll events perform calculations only; DOM writes are coalesced into at most one queued `requestAnimationFrame`.
- [ ] The animation frame reads the latest ref value rather than a value captured by an earlier scroll event.
- [ ] Active dragging maps directly to progress. There is no recursive per-frame lerp or animation loop after scrolling stops.
- [ ] Release direction chooses the endpoint; the decision to animate compares against last visual progress, not only logical progress.
- [ ] A touch-active guard makes `touchend` / `touchcancel` idempotent for one gesture.
- [ ] A pending direct-progress frame is cancelled before a release snap starts.
- [ ] Touch interruption cancels pending snap work and resumes from the estimated visual position.
- [ ] Ordinary direction updates may be suppressed during release snap, but physical-edge overrides are still evaluated during native momentum.
- [ ] Snap completion preserves an active edge override.
- [ ] Header/core and edge-aware footer channels can use independent durations.
- [ ] Cleanup cancels every pending rAF and timeout.

### Consumer

- [ ] `scrollRef` is attached to the element whose `scrollTop`, `scrollHeight`, and `clientHeight` describe the intended content.
- [ ] `hideProgressContainerRef` is attached to the narrowest ancestor containing all CSS-var consumers.
- [ ] A long list, image grid, or unrelated page subtree is not placed below the progress ref unless it also consumes the vars.
- [ ] Only `transform` and `opacity` are progressively animated.
- [ ] `will-change` is limited to the small elements that animate.
- [ ] `isHidden` / `isAtEdge` control semantics and pointer events, not visual progress.
- [ ] Large list children do not all re-render when endpoint state changes; data objects, handlers, and memo boundaries are stable.
- [ ] An out-of-flow footer has matching scroll-content bottom padding.
- [ ] An edge-aware footer uses the footer progress and footer duration variables.
- [ ] `edgeOffset` is measured from the physical scroll edge and accounts for intentional bottom padding/gutter.

### Required regression coverage

- [ ] Multiple scroll events before a paint produce one DOM-write frame using the newest progress.
- [ ] A fast swipe that reaches logical `0` or `1` before paint still animates from the last visual value.
- [ ] Bubbling `touchend` is handled once and cannot reverse the finalized direction.
- [ ] `revealAtEdge` activates while directional processing is suspended.
- [ ] An in-flight footer hide retargets to visible when momentum enters `edgeOffset`.
- [ ] Snap completion receives the retargeted footer endpoint and preserves `isAtEdge`.
- [ ] Plain relative mode behaves unchanged when `revealAtEdge` is omitted.

### Source-of-truth files

| Responsibility | File |
|---|---|
| Direction, thresholds, independent core/footer channels, edge override | `packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts` |
| rAF coalescing, visual progress, touch lifecycle, snap and duration vars | `packages/ui/src/components/primitives/scroll-visibility/use-scroll-progress-css-var.ts` |
| Scroll/touch listener wiring and physical edge measurements | `packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts` |
| Standard relative-mode defaults | `packages/ui/src/components/primitives/scroll-visibility/use-scroll-hide.ts` |
| State and edge regression tests | `packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.test.ts` |
| Frame, swipe, duplicate-release, and footer-retarget regression tests | `packages/ui/src/components/primitives/scroll-visibility/use-scroll-progress-css-var.test.ts` |

---

## Registration safety — why cleanup cannot use `null`

A naïve cleanup of `registerScrollElement(null)` breaks during animated tab transitions. `AnimatePresence` keeps the old page mounted during its exit animation, so:

1. New page mounts → registers its scroll element
2. Old page finishes exit animation → cleanup fires → `registerScrollElement(null)` → wipes the new page's element

The `registerScrollElement` function returns a closure that uses a functional `setState` with identity check:

```ts
return () => {
  setScrollElement((prev) => (prev === element ? null : prev));
};
```

Only the element that is currently active can deregister itself. A stale cleanup from a completed exit animation is a no-op. Always use the returned cleanup as the `useEffect` return value — never call `registerScrollElement(null)` manually.

---

## Z-index stacking

Shell-level elements that use `useScrollVisibilityContext()` must sit above page content but below the nav bar and all surfaces.

| Layer | Element | z-index |
|---|---|---|
| Page content | Tab outlet | none |
| Shell card | `LastActiveStepCard` | `z-[49]` |
| Navigation | `BottomTabBar` | `z-[50]` |
| Surfaces / slides / sheets | All overlays | `z-[100]+` |

`BottomTabBar` is a flex item of the `AppShell` div. Per the CSS Flexbox spec, flex items with a `z-index` value create a stacking context even without `position: relative`. This makes `z-[50]` on the nav effective without adding a position class.

`LastActiveStepCard` is `position: fixed` and participates in the root stacking context. `z-[49]` places it above page content and below the nav.

---

## Decision tree

```
Does the element live in the app shell (fixed/persistent across pages)?
  YES → useScrollVisibilityContext() — reads global isHidden
        Mode is set once in AppScrollElementProvider (currently "relative")

Does the element live inside a surface / slide / drawer?
  Is it inside a <StagedForm>?
    YES → Nothing to do. StagedForm handles scroll hide internally.
  NO  → useScrollHide() — local, isolated
          1. Attach hideProgressContainerRef to the narrowest ancestor of the animated targets.
          2. Attach scrollRef to the scroll element.
          3. Animated children use CSS var inline styles (not isHidden class toggles).
          4. isHidden is only used for pointer-events-none.
          5. Keep long, unrelated content outside the CSS-var subtree when possible.
        Never touches global state.

Does the page need to register its scroll container?
  Is it inside a package?           → PTR auto-registers (mechanism A)
  Does it pass scrollRef to PTR?    → useRegisterScrollElement() (mechanism B)
  No PTR at all?                    → useRegisterScrollElement() + separate scroll div (mechanism C)

Which mode to use?
  Element responds to a fixed anchor (top/bottom edge)?  → mode: "absolute"
  Element responds to mid-page scroll gestures?          → mode: "relative" via useScrollHide()
```

---

## What this contract forbids

- **Never call `useScrollVisibilityContext()` inside a surface or slide.** It reads page scroll, not surface scroll — the wrong element hides.
- **Never call `registerScrollElement(null)` manually.** Always use the returned cleanup function. Manual null calls bypass the identity check and corrupt the global state.
- **Never combine `flex flex-col` with `overflow-y-auto` on the same scroll container element.** Flex shrinks children — they will not overflow. Separate the scroll container from the layout div.
- **Never call `useRegisterScrollElement()` inside a package (`@beyo/*`).** Packages cannot depend on app-level providers. Use PTR without an external ref (mechanism A) instead.
- **Never add a new shell-level element above `z-[50]` without also raising surface z-indices.** Surfaces must always be above the nav bar.
- **Never pass `hysteresis` when using `mode: "relative"`** — it has no effect. Control the dead band with `hideThreshold` / `showThreshold` instead.
- **Never leave `hideProgressContainerRef` unattached.** If the ref is not on a DOM element, CSS vars are never written and the animation silently does not work. Always confirm the ref is on a real ancestor of the animated children.
- **Never attach `hideProgressContainerRef` higher than necessary.** Inherited custom-property updates can invalidate styles through that descendant subtree. Do not wrap a long list when only its header or footer animates.
- **Never use `isHidden` for the visual animation.** Use it only for `pointer-events-none`. The visual animation is driven exclusively by `--scroll-hide-progress` via inline `style`. Using `isHidden` for class-based animation produces a binary snap with no progressive feel.
- **Never make an animated footer a flex child (`shrink-0`).** Make it an absolute or fixed bottom overlay. A flex-child footer still occupies layout space when translated away, preventing the scroll area from gaining the space the footer vacated.
- **Never store continuous scroll progress in React state.** Use refs and CSS variables. React state is reserved for semantic endpoints such as `isHidden` and `isAtEdge`.
- **Never use recursive frame-based lerp for finger tracking.** Coalesce to one rAF and write the latest value. Lerp creates input latency, refresh-rate-dependent behavior, and extra work after scrolling ends.
- **Never let release-snap suppression skip a configured edge override.** Native momentum can reach and stop at the edge before suppression expires, leaving the footer hidden indefinitely.
- **Never use the core duration variable for an edge-aware footer.** Use `--scroll-snap-duration-footer` with a fallback to `--scroll-snap-duration`.
- **Never animate layout geometry progressively during scroll.** Restrict the progressive path to `transform` and `opacity` so the compositor can handle the visual work.
- **Never assume `memo()` protects a long list when the parent creates new object props on every render.** Stabilize the props or memoize/isolate the list subtree from endpoint state changes.
