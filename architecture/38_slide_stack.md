# 38 — Slide Stack Contract

## Purpose

`SlideStack` (`@beyo/ui`) is the single primitive for **multi-container forward/back slide navigation**: two or more panes occupying the same region, where navigating forward slides the new pane in fading on top of the current one, and navigating back slides the top pane off to the right revealing the pane beneath — like turning a book page. It owns the stacked animation, interactive finger-tracking drags in both directions, drag gating conditions, and the integration with `SlidePageSurface`'s slide-to-close.

Never hand-roll an `AnimatePresence` pane switcher for this interaction pattern. `StagedForm` is itself a consumer of this primitive — any new composition of sliding containers uses `SlideStack` directly.

---

## When to use / when not

| Situation | Use |
|---|---|
| Staged/step form navigation | `StagedForm` (already built on SlideStack) |
| Any other multi-pane forward/back composition (browse → detail, wizard-like flows, drill-downs inside one surface) | `SlideStack` directly |
| Whole-page overlay that opens over the app | `SlidePageSurface` (28_surfaces.md) — not a stack pane |
| The app shell's main pages (nav-bar tabs) | `SlideStack`, one pane per `TAB_ORDER` entry — see *App-shell tab stack* below |
| Horizontal switching between peers *inside* a page | Tab patterns (31_animations.md `tabVariants`) |

The mental model: a stack is **hierarchical** (later panes sit *on top of* earlier ones); tabs are peers. If "back" reveals something that was underneath, it is a stack.

The shell's main pages are the deliberate exception: they are peers, but they are ordered, and modelling them as a stack is what gives them one shared transition and a swipe that agrees with the nav bar.

---

## Anatomy

```tsx
import { SlideStack, SlideStackPane } from "@beyo/ui";

<div className="relative h-full overflow-x-hidden overflow-y-auto">   {/* container contract */}
  <SlideStack
    activeId={activePane}
    onBack={goBack}
    onForward={goForward}
    canForward={() => isCurrentPaneReady()}
  >
    <SlideStackPane id="list">…</SlideStackPane>
    <SlideStackPane id="detail">…</SlideStackPane>
    <SlideStackPane id="editor">…</SlideStackPane>
  </SlideStack>
</div>
```

**Container contract (mandatory):** the stack must be mounted inside a **positioned (`relative`) container that clips horizontal overflow**. Panes overlap in absolute position during transitions (`AnimatePresence mode="popLayout"`), and drag ghosts pin themselves inside this container. A scroll container is fine — content rendered *above* the panes inside it (headers, timelines) stays visually above the transition; ghosts anchor below it automatically.

Only the **active pane is mounted**. Inactive panes unmount — see *Unmount semantics* below.

---

## Props reference

### `SlideStack`

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `activeId` | `string` | — | Id of the pane to show. Must match a pane child's `id`. |
| `onBack` | `() => void` | — | Navigate one pane back. **Enables** the rightward drag and the surface integration. Omit to disable both. |
| `onForward` | `() => void` | — | Navigate one pane forward. **Enables** the leftward drag. Omit (or pass `undefined` conditionally) to disable. |
| `canBack` | `SlideStackCondition` | allowed | Gate for the backward drag. |
| `canForward` | `SlideStackCondition` | allowed | Gate for the forward drag (e.g. current step valid). |
| `direction` | `1 \| -1` | inferred | Controlled navigation direction. When omitted, inferred from pane child order (later child = forward). |
| `animateInitial` | `boolean` | `false` | Animate the first pane in on mount. |
| `awaitNavigation` | `boolean` | `false` | Set when honoring `onBack`/`onForward` changes `activeId` **asynchronously** (react-router data router). See *Navigation ownership*. |
| `onCommit` | `(type) => void` | — | Fired at the release of a committed drag, one settle before the navigation — for chrome outside the stack (steppers, indicators). |

`SlideStackCondition = boolean | (() => boolean | Promise<boolean>)` — see *Drag conditions*.

### `SlideStackPane`

| Prop | Type | Meaning |
|---|---|---|
| `id` | `string` | Pane identity; matched against `activeId` and used for ordering. |
| `className` | `string` | Sizing/padding. Base is `relative w-full bg-background` — add your own height (`min-h-full`) and padding. |
| `data-testid` | `string` | Defaults to `slide-stack-pane-<id>` (ghost copies get the `-ghost` suffix). |

---

## Navigation ownership

The stack **never owns navigation state**. The consumer owns `activeId`; `onBack`/`onForward` are requests (from a committed drag, or from the surface's back arrow). The consumer decides whether to honor them by updating `activeId` — declining is legal (e.g. validation failed inside the callback) and the stack recovers the pane to rest on its own.

`onBack`/`onForward` must update state **synchronously** when they do navigate (a plain `setState`), so the ghost handoff and the navigation land in the same render batch.

**If they cannot** — a react-router data router's `navigate()` resolves a tick later — pass `awaitNavigation`. The stand-in ghost is then held until `activeId` actually changes (or ~400 ms, if the navigation never lands). Without it, the render that removes the ghost still shows the *outgoing* pane parked at its drag pose, which reads as the page you just left flashing back for a frame. Do not set it for synchronous consumers: they would keep the ghost — the next pane's content — on screen for the fallback window every time they decline to navigate.

---

## Interactive drags

With `onBack`/`onForward` provided, panes are finger-draggable using the same gesture strategy as the surface dismiss (raw touch listeners, 10px axis lock, `preventDefault` after lock, commit at 45% width or a 0.35 px/ms fling; honors `data-slide-dismiss-ignore` regions):

- **Rightward (back)**: the pane follows the finger 1:1, fading, while the previous pane is revealed beneath.
- **Leftward (forward)**: the *next* pane tracks the finger in from the right edge on top; the current pane recedes beneath it.

During a drag the stack renders a **ghost copy** of the target pane. Ghosts are `pointer-events-none` visual stand-ins; on commit the real pane replaces the ghost seamlessly (enter animation suppressed). Consecutive swipes never wait: a new touch fast-forwards any still-settling transition instantly.

The animation is compositor-only (`transform` + `opacity`), safe for image-heavy panes. All pose constants live in `slideStackPose` (`slide-stack.variants.ts`) — tune there, never fork per-consumer variants.

---

## Drag conditions

`canBack` / `canForward` gate whether a drag **engages at all** — a refused direction shows no ghost, no movement, no animation.

| Form | Behavior |
|---|---|
| `boolean` | Static allow/deny. |
| `() => boolean` | Evaluated at the moment the gesture would engage. |
| `() => Promise<boolean>` | The gesture stays **visually inert** while resolving; engages from the live finger position on `true`, stays inert on `false`. Suited for async validation. |

Conditions gate **only the drags**. The surface close interception (below) still routes to `onBack` — guard inside `onBack` itself if that path must also be blocked.

For staged forms: `useStagedForm` exposes `validateAdvance()` (runs the `onBeforeAdvance` guard without navigating). Pass it as the forward condition so a swipe on an invalid step animates nothing and still surfaces the step's errors:

```tsx
<StagedForm canAdvance={staged.validateAdvance} … />
```

---

## SlidePageSurface integration

When a `SlideStack` with `onBack` sits inside a `SlidePageSurface` (28_surfaces.md):

| Stack position | Edge swipe right | Header back arrow |
|---|---|---|
| First pane | Closes the surface (normal slide-to-close) | Closes the surface |
| Beyond first pane | Drags the **pane** back (surface never moves) | Pops one pane (`onBack`) |

This works through the surface controller: while deep, the stack sets `setSwipeDismissDisabled(true)` and registers `setCloseInterceptor(onBack)`; both release at the first pane. It is automatic — do not wire it manually.

**Single-slot rule:** the surface has one interceptor slot and one swipe-disabled flag. A page must **not** drive `setCloseInterceptor` / `setSwipeDismissDisabled` itself (e.g. a dirty-form guard) while a deep stack with `onBack` is mounted on that surface — they would clobber each other. Choose one owner per surface.

Outside any surface, all of this no-ops safely; the drags still work.

---

## Nested stacks

Stacks nest: a drill-down stack inside a pane of another stack (the workers home sections → steps stack lives inside the shell's Home tab pane). Touch events bubble through both panes, so both stacks see the same finger. Arbitration is automatic and needs no wiring:

- The **innermost** stack that can serve the direction claims the touch (its listener locks the axis first) and drives the drag alone.
- A stack that **refuses** the direction (first pane on a back drag, last pane on a forward drag, or a `canBack`/`canForward` that said no) never claims, so the gesture falls through to the stack above it.

So on the second pane of an inner stack a right-swipe goes back one pane; on its first pane the same swipe moves the shell to the previous tab. An async condition claims the finger while it resolves — a `false` verdict makes the gesture inert for that touch rather than handing it upward.

---

## App-shell tab stack

Each app's `TabSlideStack` renders one `SlideStackPane` per `TAB_ORDER` entry, so nav-bar taps and swipes produce the same transition and a swipe direction that matches the tab's place in the order.

Consequences worth knowing before touching the shell:

- **Tab pages are rendered by the shell, not the router.** Route entries for tab paths carry an empty element; the components come from `TAB_ROUTE_COMPONENTS` (`lib/primary-tab-preload.ts`). A drag has to mount the *neighbouring* tab as its ghost, and the router only ever renders the matched route. Add a tab = add it to `TAB_ORDER`, to `TAB_ROUTE_COMPONENTS`, and to the router's `TAB_ROUTES` list.
- **Non-tab routes** (surface hydrators, deep-linked pages) render in a layer above the stack; the tab that opened them stays mounted underneath (`TabNavigationProvider.activeTab` follows `location.state.background`), so closing a surface restores the tab without a remount.
- **Tab panes carry `contain-[paint]`.** Tab pages render `fixed` chrome (FABs, bottom action bars) that must anchor to the tab area above the nav bar, not to the viewport. Paint containment makes the pane that containing block at all times — don't rely on the pane's transform, which only exists mid-drag.
- **The nav-bar indicator** reads `displayTab`, which runs ahead of the route for the length of a committed swipe's settle (`SlideStack.onCommit` → `previewTab`), so it moves when the finger lifts.

---

## Unmount semantics

Inactive panes **unmount**. This is deliberate (flat memory, cheap transitions) and has two consequences:

1. **Pane-local state resets** on return. State that must survive navigation lives above the stack (consumer state, zustand store, query cache) — never in pane-local `useState`.
2. **Backend images do not re-shimmer.** `BackendImage` reveals a cached image without its skeleton on remount, via two mechanisms: a session registry of URLs that decoded once, and a pre-paint `img.complete` check that catches images the registry never recorded (a pane left before its async `decode()` resolved, or the short-lived ghost copy rendered during a drag). Always render backend images through `BackendImage` inside panes — a raw `<img>` with manual loading UI reintroduces the reload flash.

If a future composition genuinely needs a live inactive pane (e.g. playing media), that is a keep-alive feature request for the primitive — do not work around it with `display: none` forks.

### Ghost panes run effects

During a drag the target pane is mounted as a **live copy**, so its effects run for real — and a committed drag mounts that pane's tree twice in a row (ghost mount → unmount → real mount). Pane content must therefore tolerate **overlapping and repeated mounts**:

- Data fetching is fine (query caches dedupe).
- Registering *global singleton state* is not, unless the registry handles overlap. A "clear it if it is still mine" cleanup leaves the app with nothing after a cancelled drag, because the ghost's cleanup runs while the real pane is still mounted and will not re-register. Keep a **stack** of registrations and fall back to the previous one (see `AppScrollElementProvider` in the workers app).
- Anything with a side effect on mount that is not idempotent (analytics "viewed" events, one-shot mutations) must not live in a pane.

---

## Pitfalls

- **Missing positioned container** → popped/ghost panes anchor to the wrong ancestor and transitions render at the wrong offset. The direct wrapper must be `relative` and clip horizontal overflow.
- **Transparent pane backgrounds** → panes must stay opaque (`bg-background` is in the base classes; don't override with a transparent bg) or the pane beneath shows through the stacked transition.
- **Registering a surface interceptor alongside a deep stack** → violates the single-slot rule above.
- **Async work in `onForward` that navigates later** → navigation must be synchronous when honored; the stack treats "no `activeId` change" as a decline and restores the pane.
- **Gating with conditions but expecting the header back arrow to be blocked too** → conditions gate drags only; guard `onBack` for the rest.
- **Horizontal gesture children** (carousels, swipeable rows) inside panes → mark the region `data-slide-dismiss-ignore`, same contract as the surface dismiss. `HorizontalScrollArea` and `SwipeableRow` already mark themselves; a hand-rolled `overflow-x-auto` row or a bespoke drag does not.

---

## Testing

Vitest (jsdom) covers stack behavior with dispatched `TouchEvent`s — see `packages/ui/src/components/primitives/slide-stack/SlideStack.test.tsx` (gesture simulation helpers, surface mocking via `SurfaceHeaderContext.Provider`) , `SlideStack.consecutive-drags.test.tsx` (stateful consumer, consecutive drags, settle fast-forward) and `SlideStack.nested-stacks.test.tsx` (inner stack claims a drag it can serve; falls through to the outer stack when it cannot). Reuse the `dispatchTouch` pattern; panes have `slide-stack-pane-<id>` testids and ghosts `-ghost`.

For Playwright on the mobile project, remember taps inside `PullToRefresh` need `tap()` (see the filterTaps workaround note) and drags are real touch sequences.
