# 36 — Scroll Visibility Contract

## Purpose

Scroll visibility is the pattern where UI elements hide when the user scrolls down and reappear when they scroll back up. Two distinct patterns exist in this app, and choosing the wrong one causes either the wrong element to hide, or the shell-level card's behaviour to break after navigation.

---

## The two patterns

| Pattern | Hook | Scope | Use for |
|---|---|---|---|
| **Global** | `useScrollVisibilityContext()` | Reads app-wide state | Shell-level elements that respond to the active page's scroll |
| **Local** | `useScrollVisibility()` | Creates private state | Surfaces / slides that manage their own scroll and their own hide targets |

These two patterns are completely independent. A component using `useScrollVisibilityContext()` never interferes with a component using `useScrollVisibility()`, and vice versa. Both support all visibility modes.

---

## Visibility modes

Every visibility controller — global and local — accepts a `mode` option that controls when hiding and showing are triggered.

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
- `hideThreshold` and `showThreshold` each fall back to `threshold` when omitted, so passing only
  `threshold` keeps the dead band symmetric. Provide them separately for asymmetric feel — e.g. a
  larger `hideThreshold` so the element is harder to dismiss than to reveal (`TaskDetailSlidePage`
  uses `hideThreshold: 16`, `showThreshold: 8`).
- `hysteresis` is unused in this mode.
- Use for elements that should respond fluidly to mid-page scroll gestures.

### `inverted` flag — composes with both modes

`inverted` flips which direction is "forward" (increasing scroll value). It is independent of `mode`.

| `mode` | `inverted` | Hides when | Shows when |
|---|---|---|---|
| `"absolute"` | `false` | scrolled past `threshold` from top | back within `hysteresis` of top |
| `"absolute"` | `true` | scrolled past `threshold` from bottom | back within `hysteresis` of bottom |
| `"relative"` | `false` | scrolled down `hideThreshold` px from last reversal | scrolled up `showThreshold` px from last reversal |
| `"relative"` | `true` | scrolled up `hideThreshold` px from last reversal | scrolled down `showThreshold` px from last reversal |

### App defaults

| Controller | Mode | Reason |
|---|---|---|
| Global (`AppScrollElementProvider`) | `"relative"` | `LastActiveStepCard` hides mid-page on scroll-down, reappears on scroll-up without requiring top |
| Local slides (e.g. `TaskDetailSlidePage`) | `"relative"` | Footer / action buttons respond fluidly to mid-content scroll gestures |

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
    <m.div
      className={cn(
        "fixed bottom-[60px] left-0 right-0 z-[49]",
        "transition-transform duration-200 ease-out",
        isHidden && "translate-y-full",
      )}
    >
      ...
    </m.div>
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

Surfaces and slides have their own scroll containers and their own elements to hide (e.g. a footer action bar). They must not interact with the global scroll state — doing so would clobber the page scroll registration behind them and leave the page broken when the surface closes.

Use `useScrollVisibility()` instead. It is self-contained: it creates its own `scrollRef` and its own `isHidden` boolean with no connection to `AppScrollElementProvider`.

```tsx
import { useScrollVisibility } from "@beyo/ui";

function TaskDetailSlidePageContent(): React.JSX.Element {
  const { scrollRef, isHidden } = useScrollVisibility({ mode: "relative" });

  return (
    <div className="relative flex h-full flex-col">
      <PullToRefresh scrollRef={scrollRef} onRefresh={refetch}>
        {content}
      </PullToRefresh>

      {/* Footer hides on scroll-down, shows on scroll-up */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 transition-transform duration-300",
          isHidden ? "translate-y-full" : "translate-y-0",
        )}
      >
        <ActionButton />
      </div>
    </div>
  );
}
```

Because `scrollRef` is an external ref passed to `PullToRefresh`, PTR does not auto-register — which is exactly the isolation required.

`useScrollVisibility()` accepts all options:

```tsx
const { scrollRef, isHidden } = useScrollVisibility({
  mode: "relative",   // "absolute" | "relative" — default "absolute"
  threshold: 56,      // px before hiding/showing (default 56)
  hideThreshold: 16,  // relative mode: hide distance; falls back to `threshold`
  showThreshold: 8,   // relative mode: show distance; falls back to `threshold`
  hysteresis: 8,      // dead band for absolute mode only (default 8)
  inverted: false,    // true for bottom-anchored scroll containers
});
```

Multiple `useScrollVisibility()` calls with different modes coexist independently. Each has its own state machine and is unaffected by others.

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
  YES → useScrollVisibility({ mode: "relative" }) — local, isolated
        Never touches global state

Does the page need to register its scroll container?
  Is it inside a package?           → PTR auto-registers (mechanism A)
  Does it pass scrollRef to PTR?    → useRegisterScrollElement() (mechanism B)
  No PTR at all?                    → useRegisterScrollElement() + separate scroll div (mechanism C)

Which mode to use?
  Element responds to a fixed anchor (top/bottom edge)?  → mode: "absolute"
  Element responds to mid-page scroll gestures?          → mode: "relative"
```

---

## What this contract forbids

- **Never call `useScrollVisibilityContext()` inside a surface or slide.** It reads page scroll, not surface scroll — the wrong element hides.
- **Never call `registerScrollElement(null)` manually.** Always use the returned cleanup function. Manual null calls bypass the identity check and corrupt the global state.
- **Never combine `flex flex-col` with `overflow-y-auto` on the same scroll container element.** Flex shrinks children — they will not overflow. Separate the scroll container from the layout div.
- **Never call `useRegisterScrollElement()` inside a package (`@beyo/*`).** Packages cannot depend on app-level providers. Use PTR without an external ref (mechanism A) instead.
- **Never add a new shell-level element above `z-[50]` without also raising surface z-indices.** Surfaces must always be above the nav bar.
- **Never pass `hysteresis` when using `mode: "relative"`** — it has no effect. Control the dead band with `threshold` (symmetric) or `hideThreshold` / `showThreshold` (asymmetric) instead.
