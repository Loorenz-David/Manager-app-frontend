# PLAN_task_creation_staged_form_title_header_corrections_20260707

## Metadata

- Plan ID: `PLAN_task_creation_staged_form_title_header_corrections_20260707`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T00:00:00Z`
- Last updated at (UTC): `2026-07-07T08:09:48Z`
- Related issue/ticket: `—`
- Intention plan: `—` (corrections plan, scoped directly from a post-implementation review)
- Source plan: `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_20260707.md`
- Source summary: `docs/architecture/implemented_summaries/SUMMARY_task_creation_staged_form_title_header_20260707.md`

## Goal and intent

- Goal: Fix three issues found while reviewing the implementation of `PLAN_task_creation_staged_form_title_header_20260707` against its own plan, plus close the test-coverage gap that let the most serious one ship unnoticed.
- Business/user intent: `PLAN_task_creation_staged_form_title_header_20260707` shipped with `npm run typecheck` as its only validation step. One of the three deviations from that plan is a live, reachable bug (a footer/scroll-visibility feedback loop) that affects the "assignment" step of all three manager task-creation forms (Internal, Pre-Order, Return) whenever the item's major category has available working sections — a common case, not an edge case. This plan corrects that bug, tightens an API surface that was widened beyond what the original plan specified, aligns a conditional that was implemented unconditionally, and adds the test coverage the original plan called for but never received.
- Non-goals:
  - No new features. Every change here brings the implementation back in line with `PLAN_task_creation_staged_form_title_header_20260707`'s own stated design, or fixes a bug that design didn't anticipate — nothing new is being added to scope.
  - No changes to the `header` prop, `TaskCreationStagedFormHeader`, or any of the three form contents' `header={...}` wiring — that part of the original implementation matches its plan and has no known issues.
  - No changes to `ScrollVisibilityProvider.tsx` or the global scroll-visibility pattern — still out of scope, unaffected by any of these fixes.

## Scope

- In scope:
  - `packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts` — stop `onScroll` from changing identity when `edgeOffset`/`revealAtEdge` change.
  - `packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts` — stop the listener-attachment effect from re-running when `edgeOffset` changes.
  - `packages/ui/src/components/primitives/scroll-visibility/use-scroll-hide.ts` — narrow the passthrough option type back to `revealAtEdge`/`edgeOffset` only.
  - `packages/ui/src/components/primitives/staged-form/StagedForm.tsx` — gate `revealAtEdge` on `hasFooter`, matching the original plan.
  - `architecture/36_scroll_visibility.md` — tighten the `useScrollHide()` passthrough wording so it doesn't read as a blanket override of "the single source of truth" sentence two lines above it.
  - Test coverage: `use-scroll-state` unit tests (new file) and updates to the existing `apps/managers-app/.../tests/playwright/features/testing_forms/staged-form-scroll-collapse.spec.ts` and `.../task_creation/task-creation-form-flow.spec.ts` specs.
- Out of scope: everything already listed out of scope in the source plan (other `StagedForm` consumers, `mode: "absolute"`, the global pattern, every other `useScrollHide()`/`useScrollVisibility()` call site).
- Assumptions:
  - `TaskCreationAssignmentFooter.tsx`'s `isHidden`-driven `grid-rows-[0fr]`/`grid-rows-[1fr]` collapse of its `WorkingSectionShortcutBar` (lines 64–84) is intentional, pre-existing behavior and is not itself being changed — only the mechanism that lets its resulting height change corrupt the scroll-visibility state is being fixed.

## Clarifications required

None — each fix is a direct, mechanical correction against the source plan's own stated design (issues 2 and 3) or a scoped fix to a traced, reproduced causal chain (issue 1). No product or design decision is open.

## Issues being corrected

### Issue 1 (high) — footer-height ↔ scroll-visibility feedback loop on the assignment step

**Root cause.** `StagedForm.tsx` calls `useScrollHide({ revealAtEdge: "bottom", edgeOffset: footerHeight })`, where `footerHeight` is state updated by a `ResizeObserver` on the actual footer DOM node. `edgeOffset` sits in two places that control re-execution:

- `use-scroll-state.ts`'s `onScroll` `useCallback` dependency array includes `edgeOffset`/`revealAtEdge` — so `onScroll` gets a new identity every time `footerHeight` changes.
- `use-scroll-visibility.ts`'s listener-attachment `useEffect` depends on `onScroll` (and, redundantly, on `revealAtEdge`/`edgeOffset` directly too) — so that effect tears down the scroll/touch listeners and calls `initialize()` again every time `footerHeight` changes.
- Relative-mode `initialize()` unconditionally does `setIsHidden(false)` — forcing the footer/timeline/header visible again, regardless of current scroll position.

`TaskCreationAssignmentFooter.tsx:38` reads that same `isHidden` via `useScrollVisibilityContext()` and uses it (lines 64–84) to collapse/expand its `WorkingSectionShortcutBar` through a `grid-template-rows` transition — which changes the footer's own rendered height. On the "assignment" step, whenever `availableSections.length > 0` (i.e. whenever the item's major category has assignable working sections — the common case, not a rare one):

1. User scrolls down → relative-mode logic hides the footer → `isHidden = true`.
2. The shortcut bar starts collapsing (`grid-rows-[0fr]`) → the footer's measured height shrinks.
3. `ResizeObserver` reports the new `footerHeight` → `onScroll`/the listener effect re-run → `initialize()` forces `isHidden = false`.
4. The shortcut bar re-expands → height grows back → `ResizeObserver` fires again → repeat.

A `grid-template-rows` transition reports intermediate box sizes on close to every frame, so this can cycle many times within the 220ms collapse animation. Net effect: the footer/shortcut bar on the assignment step of all three forms flickers or never actually stays hidden — the opposite of both the original plan's goals.

**Fix.** Read `revealAtEdge`/`edgeOffset` through refs that are updated on every render but are *not* part of any `useCallback`/`useEffect` dependency array, so `onScroll`'s identity — and therefore the listener-attachment effect — stays stable regardless of how often `footerHeight` changes. The scroll-visibility state machine should only ever tear down and reinitialize for the reasons it did before this feature existed (element/mode/inverted changes), never because a revealed element's own height fluctuated.

```ts
// packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts
export function useScrollState({
  threshold,
  topOffset,
  hideThreshold,
  showThreshold,
  revealAtEdge,
  edgeOffset,
  hysteresis,
  mode,
}: ScrollStateOptions): ScrollStateResult {
  // ...existing refs...
  const isAtEdgeRef = useRef(false);

  // Always-fresh, non-dependency reads — edgeOffset in particular can churn on every
  // ResizeObserver tick (e.g. StagedForm's footerHeight). Neither field may appear in
  // onScroll's dependency array: doing so gives onScroll a new identity on every
  // fluctuation, which cascades into use-scroll-visibility.ts's listener-attachment
  // effect re-running and calling initialize() — forcing the element visible again
  // regardless of scroll position. See PLAN_task_creation_staged_form_title_header_corrections_20260707
  // for the reproduction (footer height ↔ isHidden feedback loop on StagedForm's
  // assignment step, via TaskCreationAssignmentFooter's isHidden-driven grid collapse).
  const revealAtEdgeRef = useRef(revealAtEdge);
  revealAtEdgeRef.current = revealAtEdge;
  const edgeOffsetRef = useRef(edgeOffset);
  edgeOffsetRef.current = edgeOffset;

  // ...

  const onScroll = useCallback(
    (value: number, edgeMeta?: ScrollEdgeMeta) => {
      // ...unchanged suppress/delta/debug/absolute-mode code...

      if (delta === 0) return;

      const currentRevealAtEdge = revealAtEdgeRef.current;
      if (currentRevealAtEdge && edgeMeta) {
        const distanceToEdge =
          currentRevealAtEdge === "top"
            ? edgeMeta.distanceFromStart
            : edgeMeta.distanceFromEnd;

        if (distanceToEdge <= (edgeOffsetRef.current ?? 0)) {
          isAtEdgeRef.current = true;
          progressRef.current = 0;
          progressAtAnchorRef.current = 0;
          directionAnchorRef.current = value;
          movingForwardRef.current = false;
          applyHidden(false);
          return;
        }

        if (isAtEdgeRef.current) {
          isAtEdgeRef.current = false;
          directionAnchorRef.current = value;
          progressAtAnchorRef.current = 0;
          movingForwardRef.current = false;
        }
      }

      // ...existing direction-anchor / progress computation, unchanged...
    },
    [
      applyHidden,
      threshold,
      topOffset,
      hideThreshold,
      showThreshold,
      hysteresis,
      mode,
      // revealAtEdge, edgeOffset intentionally excluded — read via the refs above.
    ],
  );
```

```ts
// packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts
export function useScrollVisibility({
  threshold = 56,
  topOffset = 0,
  hideThreshold,
  showThreshold,
  revealAtEdge,
  edgeOffset = 0,
  hysteresis = 8,
  inverted = false,
  mode = "absolute",
}: ScrollVisibilityOptions = {}): UseScrollVisibilityResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hideProgressContainerRef = useRef<HTMLDivElement>(null);

  // Same rationale as use-scroll-state.ts: revealAtEdge must not be a dependency of
  // the listener-attachment effect below, or footerHeight-driven edgeOffset churn
  // tears the scroll listener down and reinitializes it on every ResizeObserver tick.
  const revealAtEdgeRef = useRef(revealAtEdge);
  revealAtEdgeRef.current = revealAtEdge;

  const { isHidden, progressRef, getSnapDirection, snap, suspend, onScroll, resetState, initialize } =
    useScrollState({ threshold, topOffset, hideThreshold, showThreshold, revealAtEdge, edgeOffset, hysteresis, mode });

  // ...onSnapComplete, useScrollProgressCssVar wiring unchanged...

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    initialize(getScrollValue(element, inverted));

    const handler = () => {
      const value = getScrollValue(element, inverted);
      const edgeMeta =
        revealAtEdgeRef.current !== undefined
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

    element.addEventListener("scroll", handler, { passive: true });
    // ...touch listeners unchanged...

    return () => {
      // ...unchanged cleanup...
    };
  }, [
    initialize,
    inverted,
    mode,
    onProgress,
    onScroll,
    onTouchCancel,
    onTouchEnd,
    onTouchStart,
    progressRef,
    // revealAtEdge, edgeOffset intentionally excluded — see revealAtEdgeRef above and
    // use-scroll-state.ts's own refs. onScroll's identity no longer depends on them.
  ]);

  // ...reset callback and return, unchanged...
}
```

No change to `ScrollVisibilityProvider.tsx` — it never passes `revealAtEdge`, so it was never affected by this bug, and stays out of scope per the source plan.

The `isAtEdgeRef` entering-branch (unconditionally re-running the enter-reset on every scroll event while already inside the edge zone, rather than only on the leading edge) is left as-is: tracing it confirms it produces the same end state as a guarded version would (`directionAnchorRef`/`progressAtAnchorRef` are overwritten identically on exit regardless of how many times the enter-branch re-ran while inside the zone), so it is redundant but not incorrect — not worth touching in this corrections pass.

### Issue 2 (medium) — `useScrollHide()`'s option type is wider than the source plan specified

The source plan's step 10 specified `Pick<ScrollVisibilityOptions, "revealAtEdge" | "edgeOffset">`. The shipped code accepts the full `ScrollVisibilityOptions`, silently permitting any future caller to override `mode`, `hideThreshold`, `showThreshold`, `inverted`, etc. per call site — contradicting `useScrollHide`'s own docstring ("Changing the thresholds here changes the feel for all consumers at once") and `36_scroll_visibility.md`'s existing decision table, which recommends `useScrollVisibility({ mode: "relative", ...custom thresholds })` directly for that rare case rather than widening `useScrollHide()`.

**Fix.**

```ts
// packages/ui/src/components/primitives/scroll-visibility/use-scroll-hide.ts
import type { ScrollVisibilityOptions } from "./scroll-visibility.types";
import { useScrollVisibility } from "./use-scroll-visibility";

type UseScrollHideOptions = Pick<ScrollVisibilityOptions, "revealAtEdge" | "edgeOffset">;

/**
 * Standard relative-mode scroll hide hook.
 * Use this everywhere a component should hide on scroll-down and reveal on scroll-up.
 * Changing the thresholds here changes the feel for all consumers at once.
 */
export function useScrollHide(options: UseScrollHideOptions = {}) {
  return useScrollVisibility({
    mode: "relative",
    hideThreshold: 40,
    showThreshold: 24,
    ...options,
  });
}
```

And tighten `architecture/36_scroll_visibility.md`'s corresponding paragraph (added under "`StagedForm` — built-in scroll hide") from "also accepts additive `ScrollVisibilityOptions` overrides" to name only the two fields:

```md
For rare local cases, `useScrollHide()` also accepts two additive fields — nothing else
from `ScrollVisibilityOptions` is exposed through it; a genuinely custom threshold or
mode still requires calling `useScrollVisibility()` directly, per the table above:

- `revealAtEdge: "top" | "bottom"` forces the element fully visible whenever the scroll
  container is within `edgeOffset` px of that physical edge.
- `edgeOffset` defaults to `0`. Use the hidden element's height when the reveal should
  engage as the user enters that reserved gutter.
- This override is relative-mode-only and opt-in; callers that omit it keep the existing
  direction-based behavior unchanged.
```

### Issue 3 (low, currently inert) — `revealAtEdge` applied unconditionally instead of `hasFooter ? "bottom" : undefined`

The source plan's step 11 specified gating `revealAtEdge` on `hasFooter` (`Boolean(footer) || showNavigation`), so that a hypothetical `StagedForm` usage with no footer and `showNavigation={false}` doesn't force-reveal the header/timeline at the exact last pixel of scroll. The shipped code passes `revealAtEdge: "bottom"` unconditionally, and computes `hasFooter` separately, further down, without wiring it in. All six current consumers pass either a `footer` or leave `showNavigation` at its default `true`, so this has no observable effect today — but it should still match the documented design so a future footerless usage doesn't inherit unexplained behavior.

**Fix.** In `StagedForm.tsx`, move the `hasFooter` derivation up (it only depends on the `footer`/`showNavigation` props, already destructured at the top — moving it is side-effect-free) and use it:

```ts
export function StagedForm({
  // ...
  showNavigation = true,
  header,
  footer,
  // ...
}: StagedFormProps): React.JSX.Element {
  const hasFooter = Boolean(footer) || showNavigation;

  const footerObserverRef = useRef<ResizeObserver | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);

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

  // ...remove the now-duplicate `const hasFooter = ...` further down in the file...
```

## Contracts and skills

### Contracts loaded

- `architecture/36_scroll_visibility.md`: same contract governing the feature being corrected; this plan's fixes keep the primitive's behavior consistent with what this contract documents (and issue 2's fix keeps the contract's own wording internally consistent).
- `architecture/08_hooks.md`: relevant to the ref-vs-dependency-array pattern used to fix issue 1 — reading live values through a ref instead of a `useCallback`/`useEffect` dependency is a standard React pattern for values that must not trigger effect re-runs; not previously encountered elsewhere in this exact form in this codebase's hook contract, but consistent with its general "avoid re-render/re-init churn" guidance.

### Local extensions loaded

- None found (no `36_scroll_visibility_local.md` or `08_hooks_local.md` exist in `architecture/`).

### File read intent — pattern vs. relational

- Re-reading `use-scroll-state.ts`, `use-scroll-visibility.ts`, `StagedForm.tsx`, `use-scroll-hide.ts`, `TaskCreationAssignmentFooter.tsx` in their *current, already-implemented* state — relational: these are the exact files being corrected; understanding their present behavior (not a contract's abstract description of intended behavior) is the entire basis for this plan.
- No pattern reads — this is a bug-fix pass on primitive code already written; there is no "how do other features do X" question to answer here.

### Skill selection

- Primary skill: `skills/cross_cutting/planning_contract_selection/SKILL.md`
- Trigger terms: `scroll visibility`, `feedback loop`, `useCallback dependency`, `regression`
- Excluded alternatives: none.

## Implementation plan

1. **`packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts`** — add `revealAtEdgeRef`/`edgeOffsetRef`, updated unconditionally on every render (not inside `useEffect`); change the edge-lock branch inside `onScroll` to read `revealAtEdgeRef.current`/`edgeOffsetRef.current` instead of the closed-over `revealAtEdge`/`edgeOffset` parameters; remove `revealAtEdge`/`edgeOffset` from `onScroll`'s `useCallback` dependency array. No change to `resetState`/`initialize`/`snap` (their `isAtEdgeRef.current = false` resets are unaffected and still correct).

2. **`packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts`** — add a `revealAtEdgeRef`, updated unconditionally on every render; change the `handler` closure inside the listener-attachment `useEffect` to check `revealAtEdgeRef.current !== undefined` instead of the closed-over `revealAtEdge`; remove `revealAtEdge` and `edgeOffset` from that effect's dependency array (they still flow into `useScrollState(...)` as call arguments — only the *effect's own* dependency list changes).

3. **`packages/ui/src/components/primitives/scroll-visibility/use-scroll-hide.ts`** — narrow the parameter type from `ScrollVisibilityOptions` to `Pick<ScrollVisibilityOptions, "revealAtEdge" | "edgeOffset">`.

4. **`packages/ui/src/components/primitives/staged-form/StagedForm.tsx`** — move the `hasFooter` derivation above the `useScrollHide()` call (right after props are destructured); change the hook call to `revealAtEdge: hasFooter ? "bottom" : undefined`; delete the now-duplicate `hasFooter` declaration further down.

5. **`architecture/36_scroll_visibility.md`** — replace the "also accepts additive `ScrollVisibilityOptions` overrides" paragraph with the narrower two-field wording shown in Issue 2's fix above.

6. **New file `packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.test.ts`** (or the project's established test-file convention for this package if different — check for an existing `vitest`/testing-library setup in `packages/ui` before choosing the runner):
   - `revealAtEdge: "bottom"` forces `isHidden === false` once `distanceFromEnd <= edgeOffset`, even while `movingForward` is `true` (straight-down scroll, no reversal).
   - Regression test for Issue 1: call `onScroll` repeatedly with a *changing* `edgeOffset` value passed via re-invoking `useScrollState` with new props (simulating `footerHeight` churn) while scroll position is fixed at/near the edge, and assert `isHidden` does not toggle and the scroll state is not reset — i.e. assert `onScroll`'s behavior remains stable across `edgeOffset` changes now that it's read via ref. (This test should fail against the pre-correction code and pass after.)
   - Exit-transition case: drive the state machine into the edge lock from `progress = 1` (hidden), exit while moving up, assert `progressRef.current` stays at `0` through the transition (no flicker), then reverse and assert hiding only resumes after a fresh `hideThreshold` of downward movement.
   - `revealAtEdge` unset behaves identically to a plain relative-mode instance (regression guard for the base behavior).

7. **`apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/testing_forms/staged-form-scroll-collapse.spec.ts`** — add a case that reproduces Issue 1 directly: open a task-creation form's assignment step with at least one available working section (so the shortcut bar renders), scroll down until the footer hides, and assert it stays hidden (no flicker/reappearance) for at least one full animation cycle (~300ms) rather than immediately bouncing back to visible.

8. **`apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/task_creation/task-creation-form-flow.spec.ts`** — extend with the edge-reveal case from the source plan's validation section: scroll a step whose content is taller than the viewport straight to the bottom without reversing, assert the footer becomes visible; scroll back up past `hideThreshold`, assert it hides again.

## Risks and mitigations

- Risk: Reading `revealAtEdge`/`edgeOffset` via refs instead of dependencies means `onScroll` could read a slightly stale `edgeOffset` for one scroll event if a render hasn't committed yet between a prop change and the next scroll tick.
  Mitigation: The ref is written unconditionally on every render (not inside an effect), so it's current as of the most recent commit — the same staleness window that already exists for every other ref-based "latest value" pattern in this codebase (e.g. `hiddenTargetRef` itself). Worst case is one scroll event using the previous `footerHeight`, which is imperceptible (footer height differs by at most a few dozen px between states).
- Risk: Removing `edgeOffset`/`revealAtEdge` from the effect dependency arrays could be flagged by `eslint-plugin-react-hooks`'s `exhaustive-deps` rule.
  Mitigation: Add a targeted `// eslint-disable-next-line react-hooks/exhaustive-deps` with the same explanatory comment already planned for the dependency array, or restructure with a lint-clean ref pattern if the project's lint config requires it — confirm during implementation which the codebase's existing precedent favors (check other refs-not-in-deps patterns in `packages/ui` for the established style).
- Risk: The new Playwright case in `staged-form-scroll-collapse.spec.ts` needs a form/step combination where `availableSections.length > 0` is reliably true in the test fixture data; if the seeded item's major category has no working sections, the shortcut bar never renders and the regression can't be reproduced.
  Mitigation: Reuse whatever fixture the existing `task-creation-form-flow.spec.ts` already uses to reach the assignment step with a "seat" (or other section-bearing) major category — confirm during implementation rather than inventing new fixture data.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/ui`.
- `npm run test -- --grep "use-scroll-state"`: new unit tests pass, including the Issue 1 regression test (must fail on the pre-correction code, verified by temporarily reverting steps 1–2 locally and confirming the new test fails, then reapplying).
- `npx playwright test --grep "staged-form-scroll-collapse" --project=mobile`: new assignment-step footer-stability case passes.
- `npx playwright test --grep "task-creation-form-flow" --project=mobile`: edge-reveal case passes; no regression to the existing flow assertions.
- `npx playwright test --project=desktop`: same specs, desktop viewport.
- Manual smoke check (since this bug was specifically missed by `npm run typecheck` alone last time): open the Internal Task creation form, pick an item whose major category has available working sections, go to the Assignment step, and scroll — visually confirm the footer/shortcut bar hides smoothly and stays hidden without flicker.

## Review log

- `2026-07-07` `Claude (review)`: Reviewed the implemented `PLAN_task_creation_staged_form_title_header_20260707` against its own plan text and found three deviations (one high-severity live bug, one medium API-widening drift, one low-severity inert drift) plus a missing-test-coverage gap. This corrections plan was authored directly from that review.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David` (awaiting explicit approval before handing to Codex)
