# PLAN_task_creation_staged_form_title_header_20260707

## Metadata

- Plan ID: `PLAN_task_creation_staged_form_title_header_20260707`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T00:00:00Z`
- Last updated at (UTC): `2026-07-07T07:43:45Z`
- Related issue/ticket: `—`
- Intention plan: `—` (scoped directly from user request; no separate intention doc)

## Goal and intent

- Goal 1: Add a title bar above the `<StagedForm>` in the three manager task-creation slide pages (Internal, Pre-Order, Return) that displays the form's name and slides up/fades out on scroll, exactly like the existing `StagedFormTimeline` and footer already do.
- Goal 2: Fix a side effect of relative-mode scroll visibility: an element hidden via `useScrollHide()`/`useScrollVisibility({ mode: "relative" })` currently only reappears after the user reverses scroll direction by `showThreshold` px. If the user scrolls straight to the end of the content without ever reversing, the element (e.g. `StagedForm`'s footer) stays hidden — even though the user has nowhere further to scroll and needs it. Add an opt-in capability for a component to guarantee itself visible once the scroll container is within a configurable offset of a physical edge (top or bottom), and wire it into `StagedForm`'s own internal `useScrollHide()` call so its footer/navigation is always reachable at the end of a step's content.
- Business/user intent: These three slide pages call `header?.setHeaderHidden(true)`, so the app's native slide header (with its title) is fully hidden today. Users lose the "what am I filling out" context once the header disappears. A lightweight, scroll-reactive title row restores that context without bringing back the native header (and its back button, which these forms intentionally don't use — closing/navigation is handled by the footer). Separately, the footer/navigation being permanently hidden at the bottom of a long step (because the user scrolled straight down and never scrolled back up) is a pre-existing usability bug across every `StagedForm` consumer, not just these three forms — fixing it here benefits all six current consumers.
- Non-goals:
  - No back/close button in the new header — title text only.
  - No changes to `WorkerInternalTaskSlidePage` / `WorkerInternalFormContent` (those already show the native header via `setTitle`, untouched).
  - No new Zustand store. See "Rejected approach" below — the codebase's existing CSS-custom-property mechanism already achieves zero re-renders, which is strictly better than a store-backed subscription for this value.
  - No change to `mode: "absolute"` scroll visibility, and no change to the global pattern (`ScrollVisibilityProvider` / `useScrollVisibilityContext()`). Edge-reveal is scoped to the local relative-mode pattern only, per the user's request.
  - No change to any other `useScrollHide()`/`useScrollVisibility()` call site outside `StagedForm` (there are close to twenty across `packages/*` and the pre-migration `apps/managers-app`/`apps/workers-app` trees, e.g. `TasksView`, `TaskDetailSlidePage`, `PullToRefresh`, `EmailThreadView`, `CasesView`) — the new option is opt-in and `undefined` by default, so none of them change behavior.

## Scope

- In scope:
  - `packages/ui` — add an optional `header` prop to the `StagedForm` primitive so it can render a title row above `StagedFormTimeline`, wired into the exact same internal `useScrollHide()` instance StagedForm already owns.
  - `packages/ui` — extend the relative-mode scroll-visibility primitive (`scroll-visibility.types.ts`, `use-scroll-state.ts`, `use-scroll-visibility.ts`, `use-scroll-hide.ts`) with an opt-in "reveal at edge" capability, and turn it on inside `StagedForm.tsx` for its footer/navigation.
  - `packages/task-creation` — a small shared presentational title-bar component, and its use from the three manager form contents (`InternalFormContent`, `PreOrderFormContent`, `ReturnFormContent`).
  - `architecture/36_scroll_visibility.md` — document the new capability so future consumers know it exists and when to reach for it.
- Out of scope:
  - `TaskWorkingSectionsSlidePage`, `QuickTaskAssignSlidePage`, `CustomerCoordinationEmailSlidePage` (other `StagedForm` consumers) — the `header` prop is optional and additive, so these are unaffected and require no changes.
  - `mode: "absolute"` scroll visibility and the global pattern (`ScrollVisibilityProvider`, `useScrollVisibilityContext()`) — edge-reveal is relative-mode-only and local-pattern-only, per the user's request. `ScrollVisibilityProvider.tsx` is not touched.
  - Every other individual `useScrollHide()`/`useScrollVisibility()` call site — the capability is added to the shared primitive but only *enabled* inside `StagedForm`; every other consumer keeps calling the hook exactly as today and sees no behavior change.
- Assumptions:
  - The three slide page titles are exactly: `"Internal Task"`, `"Pre-Order"`, `"Return"` (as given by the user), matching the step-timeline's already-hardcoded top-offset convention (fixed height assumption, not measured).
  - Header height matches the native slide header's height (`min-h-14` / 56px) for visual consistency with the chrome it replaces.
  - "Reaching the scroll limit" for edge-reveal purposes means the physical DOM boundary of the scroll container (`scrollTop <= edgeOffset` for the top edge, `scrollHeight - clientHeight - scrollTop <= edgeOffset` for the bottom edge) — independent of `inverted`, which only affects hide/show *direction* semantics, not which physical edge a consumer cares about.

## Clarifications required

None — the mechanism is fully determined by the existing `36_scroll_visibility.md` contract and the `StagedForm` primitive's existing footer-prop precedent. No ambiguity remains after reading the contract and the primitive's source.

## Rejected approach — why no store

The user's request suggested "we have stores for this type of scenario" to avoid over-rendering when extracting the scroll-visibility value into the new header. That instinct is right in general, but this exact scenario is already solved without React state at all:

- `StagedForm` already drives its footer and timeline purely through two CSS custom properties (`--scroll-hide-progress`, `--scroll-snap-duration`) written imperatively via `el.style.setProperty(...)` on `hideProgressContainerRef` (`packages/ui/.../use-scroll-progress-css-var.ts`). Consumers read the vars via inline `style`, with **zero React re-renders per scroll frame** — see `architecture/36_scroll_visibility.md` §"Progressive CSS var animation".
- A Zustand store (even with a selector) would still cause a React re-render on every `isHidden` flip, and would be strictly worse than CSS vars for the continuous progress value (which updates every rAF frame — a store would either throttle that, losing smoothness, or re-render at 60fps, which is what we're trying to avoid).
- The only boolean state involved (`isCompact`, used solely for `pointer-events-none`) is already local to `StagedForm`'s own `useScrollHide()` call. Since the new header will be rendered *inside* `StagedForm` (as a new prop, analogous to `footer`), it has direct closure access to that boolean — no context, no store, no prop drilling across a subtree boundary.
- Per `architecture/06_client_state.md`, a store is for state shared across components/routes without a common ancestor, or that must survive navigation. This value has a common ancestor (`StagedForm` itself) and is page-scoped — textbook case for `06_client_state.md`'s "prefer local" rule, not a store.

Net effect: the "avoid unnecessary re-renders" goal is met more completely than a store could achieve, with less code.

## Design — relative-mode edge reveal

### The gap

`useScrollState`'s relative-mode branch tracks distance from the last direction-reversal point (`directionAnchorRef`). Hiding accumulates while scrolling in the hide direction; showing only accumulates while scrolling in the *opposite* direction. There is no path back to visible other than reversing direction — so a user who scrolls straight down to the end of a step's content (a very common gesture — most users don't scroll past the end and back up, they just stop at the bottom) leaves the footer/navigation permanently hidden at exactly the moment they need it to submit or advance. This reproduces on any `StagedForm` step whose content is taller than the viewport.

### The fix

Add an opt-in override, evaluated only in relative mode, only when configured:

- `revealAtEdge?: "top" | "bottom"` — which physical DOM edge, if any, forces the element visible when approached. Physical, not `inverted`-relative: a consumer says "the bottom of my scroll container" or "the top of my scroll container" directly, regardless of which direction that hook's `inverted` flag treats as "forward."
- `edgeOffset?: number` (default `0`) — how many px of proximity to that edge counts as "reached." A consumer with a fixed-height footer sets this to the footer's measured height, so the override engages exactly when the user has scrolled past the last real content and into the reserved gutter for that footer — not only once they've hit the literal maximum `scrollTop`.

Mechanism inside `useScrollState`: each `onScroll` call additionally receives the scroll element's `distanceFromStart` (`scrollTop`) and `distanceFromEnd` (`scrollHeight - clientHeight - scrollTop`), computed by the caller only when `revealAtEdge` is set. When the relevant distance is `<= edgeOffset`, the state machine locks `progress` at `0` (fully visible) and skips the normal direction-based computation entirely, exactly as if the user had just fully reversed direction. Leaving the zone re-anchors at the current position (still visible) and hands control back to the existing direction-based logic for the very next scroll delta — so there is no jump, no double-animation, and no interference with the lerp/snap system already in `use-scroll-progress-css-var.ts` (which keeps smoothing `progressRef.current` regardless of *why* it changed).

### Why exiting the zone by scrolling up doesn't flicker or fight the show-direction logic

This is the interaction that has to be gotten right, so it's worth spelling out explicitly rather than leaving it implicit in the code:

1. **While inside the zone**, every scroll event — up or down — hits the `if (atEdge) { ...; return; }` branch and is swallowed before it reaches the direction-anchor logic. `progress` stays pinned at `0` the entire time; small back-and-forth wiggles near the boundary (rubber-banding, momentum) never touch `directionAnchorRef`/`movingForwardRef` at all, so there is nothing for them to desync.
2. **The exact frame the user leaves the zone**, the exit branch sets `directionAnchorRef.current = value` (the current position) and `progressAtAnchorRef.current = 0` *before* falling through to the existing computation. That makes `distanceFromAnchor = value - directionAnchorRef.current = 0` for that same frame, so the existing formula evaluates to `newProgress = 0` — the same value it already had. The hand-off from "edge lock" to "direction-based" control produces an identical answer on both sides of the seam, so there is no discontinuity to render.
3. **If the user keeps scrolling up from the hand-off point**, they're moving in the show direction, whose contribution to `newProgress` is subtracted and then clamped with `Math.max(0, ...)`. It can only ever stay at `0` — there is no code path where continuing to scroll up right after leaving the zone can push progress back toward hidden. "Edge lock says visible" and "show-direction math says visible" are not two competing systems reaching for the same variable; the second one simply has no way to disagree with the first at that boundary.
4. **Hiding again requires a genuine reversal** — the user has to scroll back down and cover a fresh `hideThreshold` (40px) from wherever they left the zone, identical to how relative mode already requires `hideThreshold` px after any direction reversal. Nothing about edge-reveal shortens or bypasses that.
5. **The visual smoothing is unaffected** — `progressRef.current` is still just a number that `use-scroll-progress-css-var.ts` lerps toward every rAF frame regardless of which branch last wrote it. Entering the lock from `progress = 1` (fully hidden) therefore *animates* down to `0` over the same handful of frames it always would for a "reached show-threshold" transition — it does not snap.

This is a pure extension: `revealAtEdge`/`edgeOffset` are `undefined` by default, so every existing call site (there are ~20 across `packages/*` and the two remaining `apps/*` trees) computes nothing extra and behaves identically. Only `StagedForm.tsx`'s own internal `useScrollHide()` call opts in, using its already-measured `footerHeight` (from the existing `ResizeObserver` that sizes the scroll container's `paddingBottom`) as `edgeOffset` — no new measurement code needed, the value already exists in that component.

### Why this belongs in the shared primitive, not a StagedForm-local workaround

`useScrollState` is the single source of truth for relative-mode hide/show math (`architecture/36_scroll_visibility.md`: "Changing them changes every consumer at once"). A StagedForm-local reimplementation of edge detection would duplicate the anchor/progress bookkeeping and risk drifting from the primitive's lerp/snap timing. Extending the primitive keeps the fix in one place, available to any future local-pattern consumer that has the same problem (e.g. a footer inside `TaskDetailSlidePage`'s own `useScrollHide()` usage), while remaining entirely inert for the many consumers that don't need it.

## Acceptance criteria

1. `InternalTaskSlidePage`, `PreOrderTaskSlidePage`, `ReturnTaskSlidePage` each show a title row (`"Internal Task"`, `"Pre-Order"`, `"Return"`) above the step timeline when the form is at scroll-top.
2. Scrolling down inside the staged form's step content causes the title row to translate up and fade out in lockstep with the existing timeline (same `--scroll-hide-progress` driver), then reappear on scroll-up — matching `StagedFormTimeline`'s existing feel exactly (same thresholds, same lerp).
3. No new React state, context, or store is introduced for the scroll value; the title row consumes only inline `style` reading the existing CSS custom properties, plus the existing local `isCompact` boolean (already in scope inside `StagedForm`) for `pointer-events-none`.
4. The other three `StagedForm` consumers (`TaskWorkingSectionsSlidePage`, `QuickTaskAssignSlidePage`, `CustomerCoordinationEmailSlidePage`) render identically to before — no visual or behavioral change, since `header` is optional and undefined for them.
5. `WorkerInternalTaskSlidePage` / `WorkerInternalFormContent` are untouched.
6. Step content does not render underneath the new title row at scroll-top (scroll container top padding accounts for the added height).
7. In any `StagedForm` step whose content is taller than the viewport, scrolling straight down to the bottom (never reversing direction) reveals the footer/navigation once within `edgeOffset` (the footer's measured height) of the true end of the content.
8. The footer stays visible while the scroll position remains within that edge zone, even if the user makes small back-and-forth scroll movements inside it.
9. Scrolling back up and out of the edge zone by more than `hideThreshold` px re-hides the footer, exactly as relative mode already behaves today — the override only suspends the direction-based logic while inside the zone, it doesn't disable it.
10. Every other `useScrollHide()`/`useScrollVisibility()` call site (all of them outside `StagedForm.tsx`) is behaviorally unchanged, and `mode: "absolute"` consumers are entirely unaffected — `revealAtEdge` is a no-op unless explicitly passed, and is only ever evaluated in relative mode.

## Contracts and skills

### Contracts loaded

- `architecture/36_scroll_visibility.md`: authoritative source for the CSS-var progressive animation mechanism, the "Local pattern" (`useScrollHide()`), Pattern A (single element, full-height translation, header-slides-up formula), and the explicit rule that elements inside `<StagedForm>` need no extra wiring.
- `architecture/06_client_state.md`: confirms this value does not qualify for a Zustand store (local, common-ancestor-scoped, not shared across unrelated routes) — grounds the "Rejected approach" section above.
- `architecture/07_components.md`: shared UI primitive vs. feature component signature — the new title bar is a small presentational component taking `title: string` via props, no context consumption.
- `architecture/14_styling.md`: token/utility conventions for text styling, reused to match the native header's `text-base font-semibold` title treatment.

### Local extensions loaded

- None found (no `36_scroll_visibility_local.md`, `06_client_state_local.md`, `07_components_local.md`, or `14_styling_local.md` exist in `architecture/`).

### File read intent — pattern vs. relational

- Reading `packages/ui/src/components/primitives/staged-form/StagedForm.tsx` — relational: understanding the exact existing `footer` prop wiring to mirror it for `header` (contract 36 documents the CSS var mechanism in the abstract; the concrete `FOOTER_STYLE` constant and JSX structure are implementation detail that must be read directly, not re-derived from the contract).
- Reading `packages/ui/src/components/primitives/staged-form/StagedFormTimeline.tsx` — relational: confirming it already applies its own independent `--scroll-hide-progress` style so the new header's identical, separate style block will animate in sync without needing to wrap both in a shared transform.
- Reading `packages/ui/src/components/surfaces/SlidePageSurface.tsx` — relational: matching the native header's height (`min-h-14`) and title styling (`text-base font-semibold`) for visual continuity with the chrome being replaced.
- Reading `packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts` in full — relational: the exact anchor/progress bookkeeping (`directionAnchorRef`, `progressAtAnchorRef`, `movingForwardRef`, `applyHidden`) must be understood precisely to insert the edge-lock branch without breaking the existing direction-based computation or its `snap`/`resetState`/`initialize` reset paths.
- Reading `packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts` and `ScrollVisibilityProvider.tsx` — relational: confirming both wrap the same shared `useScrollState`, so the new `onScroll` parameter must stay backward-compatible for the (untouched) `ScrollVisibilityProvider.tsx` call path.
- Reading `packages/ui/src/components/primitives/scroll-visibility/use-scroll-progress-css-var.ts` — relational: confirming the rAF lerp loop smooths `progressRef.current` regardless of what changed it, so snapping `progressRef.current` to `0` inside the edge-lock branch will animate smoothly rather than jump.
- Enumerated every `useScrollHide`/`useScrollVisibility` call site via `grep` (~20 across `packages/*` and the remaining `apps/managers-app`/`apps/workers-app` trees) — relational: confirming the new optional fields are truly additive and none of those call sites need touching.
- No pattern reads were needed for hooks/providers/DTOs — this task does not touch server state, mutations, or DTOs.

### Skill selection

- Primary skill: `skills/cross_cutting/planning_contract_selection/SKILL.md`
- Trigger terms: `scroll visibility`, `staged form`, `header`, `re-render`
- Excluded alternatives: none — no domain-specific skill (e.g., a forms or scroll skill) exists in `skills/` beyond the cross-cutting planning skill.

## Implementation plan

1. **`packages/ui/src/components/primitives/staged-form/staged-form.types.ts`** — add `header?: ReactNode;` to `StagedFormProps` (placed near `footer` for symmetry).

2. **`packages/ui/src/components/primitives/staged-form/StagedForm.tsx`**:
   - Destructure the new `header` prop.
   - Add a `HEADER_STYLE` constant mirroring `FOOTER_STYLE`, using the header formula from `36_scroll_visibility.md`:
     ```ts
     const HEADER_STYLE: React.CSSProperties = {
       transform: "translateY(calc(-100% * var(--scroll-hide-progress, 0)))",
       opacity: "calc(1 - var(--scroll-hide-progress, 0))",
       transition:
         "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
     };
     ```
   - Change the top-offset class applied to the scroll container from the current unconditional `STAGED_FORM_TIMELINE_OFFSET_CLASS = "pt-14"` to a value that also reserves space for the header when present: introduce `STAGED_FORM_HEADER_AND_TIMELINE_OFFSET_CLASS = "pt-28"` (56px header + 56px timeline, matching the existing hardcoded-height convention already used for the timeline alone — not dynamically measured, consistent with current precedent) and select `header ? STAGED_FORM_HEADER_AND_TIMELINE_OFFSET_CLASS : STAGED_FORM_TIMELINE_OFFSET_CLASS` for the scroll container's className.
   - Restructure the existing absolute top wrapper:
     ```tsx
     <div className="absolute inset-x-0 top-0 z-10 flex flex-col">
       {header ? (
         <div
           className={cn("shrink-0", isCompact ? "pointer-events-none" : null)}
           style={HEADER_STYLE}
         >
           {header}
         </div>
       ) : null}
       <StagedFormTimeline />
     </div>
     ```
     (`isCompact` is the existing local variable already destructured from `useScrollHide()` in this component — no new state.)
   - No changes to `StagedFormTimeline.tsx` — it keeps its own independent `--scroll-hide-progress` style block; since both it and the new header wrapper read the same inherited CSS var from the same `hideProgressContainerRef` ancestor, they animate in lockstep automatically.

3. **New file `packages/task-creation/src/components/TaskCreationStagedFormHeader.tsx`** — presentational, no context consumption:
   ```tsx
   type TaskCreationStagedFormHeaderProps = {
     title: string;
   };

   export function TaskCreationStagedFormHeader({
     title,
   }: TaskCreationStagedFormHeaderProps): React.JSX.Element {
     return (
       <div className="flex min-h-14 items-center px-4">
         <h1 className="truncate text-base font-semibold">{title}</h1>
       </div>
     );
   }
   ```
   (Height and text styling matches `SlidePageSurface`'s native `<header>` — `min-h-14`, `text-base font-semibold` — so the replacement header reads as visually equivalent chrome.)

4. **`packages/task-creation/src/components/InternalFormContent.tsx`** — import `TaskCreationStagedFormHeader`; pass `header={<TaskCreationStagedFormHeader title="Internal Task" />}` to the existing `<StagedForm ...>` call (no other props change).

5. **`packages/task-creation/src/components/PreOrderFormContent.tsx`** — same, with `title="Pre-Order"`.

6. **`packages/task-creation/src/components/ReturnFormContent.tsx`** — same, with `title="Return"`.

No changes to `InternalTaskSlidePage.tsx`, `PreOrderTaskSlidePage.tsx`, or `ReturnTaskSlidePage.tsx` — they already call `header?.setHeaderHidden(true)`, which is exactly what's still wanted (the native header stays hidden; the new title row is the in-form replacement).

7. **`packages/ui/src/components/primitives/scroll-visibility/scroll-visibility.types.ts`** — add to `ScrollVisibilityOptions`:
   ```ts
   /**
    * Relative mode only. Forces the element fully visible whenever the scroll
    * container is within `edgeOffset` px of this physical edge — independent of
    * `inverted`, which only affects hide/show direction semantics, not which
    * physical edge this refers to.
    *
    * Use for elements that must be guaranteed visible once the user reaches the
    * end of the content (e.g. a footer action bar that must be reachable once
    * the user scrolls to the bottom), even if the user scrolled straight there
    * without ever reversing direction (relative mode alone would keep it hidden).
    *
    * Omit to keep the element governed purely by direction-based hide/show
    * (existing behavior, unaffected).
    */
   revealAtEdge?: "top" | "bottom";
   /**
    * Distance in px from `revealAtEdge`'s physical edge at which the forced-visible
    * override activates. Typically set to the height of the element being revealed
    * (e.g. the footer's measured height) so the override engages exactly when the
    * user scrolls past the last real content and into the reserved gutter for that
    * element. Defaults to 0 (only the exact boundary). No effect without `revealAtEdge`.
    */
   edgeOffset?: number;
   ```

8. **`packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts`**:
   - Add `revealAtEdge?: "top" | "bottom"; edgeOffset?: number;` to `ScrollStateOptions`.
   - Add a `ScrollEdgeMeta = { distanceFromStart: number; distanceFromEnd: number }` type and change `onScroll`'s signature to `(value: number, edgeMeta?: ScrollEdgeMeta) => void`.
   - Add `const isAtEdgeRef = useRef(false);` alongside the other relative-mode refs.
   - Inside `onScroll`, immediately after the existing `if (delta === 0) return;` guard (relative-mode branch only, `mode === "absolute"` already returns earlier and is untouched), insert the edge-lock check *before* the existing direction-anchor computation:
     ```ts
     if (revealAtEdge && edgeMeta) {
       const distanceToEdge =
         revealAtEdge === "top" ? edgeMeta.distanceFromStart : edgeMeta.distanceFromEnd;
       const atEdge = distanceToEdge <= (edgeOffset ?? 0);

       if (atEdge) {
         if (!isAtEdgeRef.current) {
           isAtEdgeRef.current = true;
           progressRef.current = 0;
           progressAtAnchorRef.current = 0;
           directionAnchorRef.current = value;
           movingForwardRef.current = false;
           applyHidden(false);
         }
         return;
       }

       if (isAtEdgeRef.current) {
         isAtEdgeRef.current = false;
         directionAnchorRef.current = value;
         progressAtAnchorRef.current = 0;
         movingForwardRef.current = false;
         // Fall through — the existing computation below now starts from a
         // fresh anchor at the current position, so this frame's distanceFromAnchor
         // is 0 and there is no jump.
       }
     }

     // ...existing direction-anchor / progress computation, unchanged...
     ```
   - Add `revealAtEdge, edgeOffset` to the `onScroll` `useCallback` dependency array.
   - Reset `isAtEdgeRef.current = false;` inside `resetState`, `initialize`, and `snap` (each already forces a fresh visible state today; the edge lock must not survive a step change, a manual reset, or a snap).

9. **`packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts`**:
   - Destructure `revealAtEdge` and `edgeOffset` from the incoming options and pass both through to `useScrollState(...)`.
   - Inside the scroll `handler`, compute edge metadata only when configured and pass it to `onScroll`:
     ```ts
     const handler = () => {
       const value = getScrollValue(element, inverted);
       const edgeMeta = revealAtEdge
         ? {
             distanceFromStart: element.scrollTop,
             distanceFromEnd:
               element.scrollHeight - element.clientHeight - element.scrollTop,
           }
         : undefined;
       onScroll(value, edgeMeta);
       if (mode === "relative") {
         onProgress(progressRef.current);
       }
     };
     ```
   - Add `revealAtEdge` to the effect's dependency array (the handler closure now reads it).
   - `ScrollVisibilityProvider.tsx` is **not** touched — it keeps calling `onScroll(value)` with no second argument, which is valid since `edgeMeta` is optional and `revealAtEdge` is never passed there (global pattern, out of scope per the Non-goals above).

10. **`packages/ui/src/components/primitives/scroll-visibility/use-scroll-hide.ts`** — accept an optional passthrough so callers can opt in without dropping the shared thresholds:
    ```ts
    import type { ScrollVisibilityOptions } from "./scroll-visibility.types";
    import { useScrollVisibility } from "./use-scroll-visibility";

    type UseScrollHideOptions = Pick<ScrollVisibilityOptions, "revealAtEdge" | "edgeOffset">;

    export function useScrollHide(options?: UseScrollHideOptions) {
      return useScrollVisibility({
        mode: "relative",
        hideThreshold: 40,
        showThreshold: 24,
        ...options,
      });
    }
    ```

11. **`packages/ui/src/components/primitives/staged-form/StagedForm.tsx`** — reorder so `footerHeight` is known before calling the hook, then opt in:
    - Move the existing `hasFooter = Boolean(footer) || showNavigation` derivation (currently computed just before the `return`) up to right after the component's props are destructured — it only depends on props, moving it is side-effect-free.
    - Move the `footerHeight` state + `footerObserverRef` + `footerCallbackRef` declarations above the `useScrollHide()` call (currently `useScrollHide()` is the first statement in the component body; the footer-measuring code comes after it).
    - Change the hook call:
      ```ts
      const {
        scrollRef,
        hideProgressContainerRef,
        isHidden: isCompact,
        reset,
        suspend,
      } = useScrollHide({
        revealAtEdge: hasFooter ? "bottom" : undefined,
        edgeOffset: footerHeight,
      });
      ```
    - No other changes to this file's footer/timeline/header JSX — the reveal is entirely handled inside the scroll-visibility primitive; `StagedForm` only supplies the two option values.

12. **`architecture/36_scroll_visibility.md`** — add a new subsection under "Local pattern — surfaces and slides" (after the existing "`useScrollHide()` vs `useScrollVisibility()`" table) documenting `revealAtEdge`/`edgeOffset`: what problem it solves (direction-only relative mode never reveals on straight-through scrolling to an edge), the option shapes, the `StagedForm` usage as the canonical example (`edgeOffset: footerHeight`), and an explicit note that it is relative-mode-only and does not apply to the global pattern.

## Risks and mitigations

- Risk: Hardcoding `pt-28` for the combined header+timeline height can drift if either row's real rendered height changes (e.g., a longer title wraps to two lines, or the timeline gains a taller alert-icon row).
  Mitigation: This mirrors the pre-existing `pt-14` hardcoding for the timeline alone (already accepted precedent, not measured via `ResizeObserver`). Title strings here are short, fixed, single-line (`"Internal Task"`, `"Pre-Order"`, `"Return"`) with `truncate` applied, so wrapping cannot occur. If a future consumer needs a taller/variable header, that is a separate follow-up (upgrade to `ResizeObserver`-measured padding, matching the existing footer's pattern) — not needed here.
- Risk: Adding `flex flex-col` to the absolute top wrapper could subtly change `StagedFormTimeline`'s layout for the other three `StagedForm` consumers that don't pass `header`.
  Mitigation: `StagedFormTimeline` is a single block-level child; wrapping it alone in `flex flex-col` with no siblings is a no-op visually (a flex container with one child lays out identically to a block container with one child, for this markup). Verify via the existing Playwright coverage for those three consumers (see Validation plan) to confirm no regression.
- Risk: Forgetting `pointer-events-none` on the new header when fully hidden would let it swallow taps in the now-empty space it used to occupy.
  Mitigation: Explicitly wired via `isCompact` on the header wrapper, mirroring the footer's existing `isCompact ? "pointer-events-none" : null` handling.
- Risk: Reading `element.scrollHeight`/`element.clientHeight` on every scroll event adds layout reads that weren't there before.
  Mitigation: Gated behind `revealAtEdge ? {...} : undefined` inside the handler — consumers that don't opt in (the vast majority) pay zero extra cost. For the one consumer that does (`StagedForm`), this read happens in the same passive scroll handler that already reads `element.scrollTop`; browsers batch same-frame geometry reads, so this is not a new forced-synchronous-layout class of cost.
- Risk: `footerHeight` starts at `0` before the `ResizeObserver` first reports the footer's real height, so `edgeOffset` is briefly `0` on mount (the edge zone is just the literal last pixel of scroll instead of the footer's full height).
  Mitigation: Self-corrects within the same paint the observer fires on, which is the same startup gap `StagedForm`'s `paddingBottom` calculation already has today (also driven by `footerHeight`, also `0` until the observer reports) — not a new class of bug, and only affects the very first render before any scrolling has occurred.
- Risk: A future consumer could pass an `edgeOffset` larger than the scroll container's actual scrollable distance, permanently locking the element visible (never able to hide).
  Mitigation: This is a caller-configuration responsibility, not a primitive defect — analogous to `topOffset` in absolute mode already requiring the caller to measure correctly. Document the "`edgeOffset` = height of the element being revealed" convention in the `36_scroll_visibility.md` update (step 12) so future consumers copy the correct pattern from `StagedForm`.
- Risk: Inserting the edge-lock branch in the wrong place inside `onScroll` (e.g. after the direction-anchor computation instead of before) could let one stray frame of direction-based hiding slip through right as the user enters the edge zone.
  Mitigation: The plan places the check immediately after the `delta === 0` guard and before any read of `directionAnchorRef`/`movingForwardRef`, so the edge check always has first refusal each scroll event before the normal computation runs — verify this ordering literally in code review, not just by testing the happy path.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/ui` and `@beyo/task-creation`.
- `npm run test -- --grep StagedForm`: existing `StagedForm` unit/component tests (if any) continue to pass with `header` undefined; add/extend coverage asserting the header row renders when `header` is passed and is absent otherwise.
- `npx playwright test --grep "internal task|pre-order|return" --project=mobile`: title rows visible at scroll-top for all three forms; scrolling the active step down hides the title row; scrolling up restores it. Confirms no regression to existing footer/timeline behavior in the same specs.
- `npx playwright test --grep "task working sections|quick task assign|customer coordination" --project=mobile`: confirms the three other `StagedForm` consumers are visually and behaviorally unchanged (no header prop passed).
- `npx playwright test --project=desktop`: same specs, desktop viewport, confirming no layout regression at wider widths.
- `npm run test -- --grep "use-scroll-state|scroll-visibility"`: new unit coverage for `useScrollState` — `revealAtEdge: "bottom"` forces `isHidden === false` once `distanceFromEnd <= edgeOffset` even while `movingForward` is `true` (straight-down scroll, no reversal); leaving the zone and continuing to scroll in the hide direction by more than `hideThreshold` re-hides; `revealAtEdge` unset behaves identically to the current implementation (regression guard).
  - Explicit transition case: drive the state machine into the edge lock from a `progress = 1` (hidden) starting point, dispatch a few small up/down deltas while still inside the zone and assert `applyHidden`/`isHidden` never toggles and `progressRef.current` stays `0` (no flicker); then dispatch the delta that crosses back out of the zone while still moving up and assert `progressRef.current` remains exactly `0` on that same event (no transient jump above `0` before settling); then dispatch further up deltas and assert progress never leaves `0`; then reverse and assert hiding only resumes after a fresh `hideThreshold` of downward movement from the exit point.
- `npx playwright test --grep "internal task|pre-order|return" --project=mobile`: extend the same specs (already updated for Goal 1) with a step whose content is taller than the viewport — scroll straight to the bottom without reversing, assert the footer is visible; scroll back up past `hideThreshold`, assert it hides again.
- `npx playwright test --grep "task detail" --project=mobile`: spot-check one other `StagedForm`-adjacent or `useScrollHide()`-based footer consumer (e.g. `TaskDetailSlidePage`) to confirm its footer behavior is pixel-for-pixel unchanged, since it does not opt into `revealAtEdge`.

## Review log

- `2026-07-07` `Claude (planning)`: Initial plan authored directly from user request; no separate intention doc created since scope and mechanism were fully resolved during contract research (see "Rejected approach" section for the store-vs-CSS-var decision rationale).
- `2026-07-07` `Claude (planning)`: Added Goal 2 — relative-mode "reveal at edge" capability for `useScrollHide()`/`useScrollVisibility()`, requested by the user as a follow-up improvement to the same plan (footer/navigation was permanently hidden if the user scrolled straight to the bottom of a step without reversing direction). Extended Scope, added a "Design — relative-mode edge reveal" section, appended acceptance criteria 7–10, implementation steps 7–12, five new risks, and edge-reveal-specific validation checks. No new intention doc — mechanism was fully resolved by reading `use-scroll-state.ts`, `use-scroll-visibility.ts`, and `ScrollVisibilityProvider.tsx` directly.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David` (awaiting explicit approval before handing to Codex)
