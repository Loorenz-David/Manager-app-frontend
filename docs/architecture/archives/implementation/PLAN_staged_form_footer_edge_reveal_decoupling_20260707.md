# PLAN_staged_form_footer_edge_reveal_decoupling_20260707

## Metadata

- Plan ID: `PLAN_staged_form_footer_edge_reveal_decoupling_20260707`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T00:00:00Z`
- Last updated at (UTC): `2026-07-07T08:40:56Z`
- Related issue/ticket: `—`
- Intention plan: `—` (scoped directly from a post-implementation observation)
- Prior plans in this lineage: `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_20260707.md`, `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_corrections_20260707.md`

## Goal and intent

- Goal: `StagedForm`'s header and timeline currently reveal alongside the footer whenever the user scrolls to the bottom edge, because all three are driven by one shared `--scroll-hide-progress` value. Decouple this so **only** the footer (and built-in navigation) responds to bottom-edge reveal; the header and timeline must continue to be governed purely by direction-based relative-mode scroll visibility, exactly as if `revealAtEdge` did not exist for them.
- Business/user intent: after `PLAN_task_creation_staged_form_title_header_corrections_20260707` fixed the footer-height feedback loop, the footer now correctly reveals at the bottom of long steps — but so do the title header and step timeline, which is not wanted. The footer reveal is the one piece of intended behavior; the header/timeline reveal is an unintended side effect of the current single-shared-signal architecture.
- Non-goals:
  - No change to *when* the footer reveals (still bottom-edge, still `edgeOffset = footerHeight`).
  - No change to the header/timeline's existing direction-based feel (thresholds, lerp factor, snap duration) — they simply stop being affected by edge-reveal, nothing else about them changes.
  - No change to any other `useScrollHide()`/`useScrollVisibility()` consumer — this remains fully opt-in and additive, at zero cost for the ~19 call sites that never pass `revealAtEdge`.

## Scope

- In scope:
  - `packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts` — split the single relative-mode progress tracker into two independent "channels": a core channel (never edge-aware, drives the existing public `isHidden`/`progressRef`) and a footer channel (identical math, plus the edge-lock override), both fed by the same scroll deltas.
  - `packages/ui/src/components/primitives/scroll-visibility/use-scroll-progress-css-var.ts` — extend the existing rAF lerp loop and CSS-transition-driven snap to smooth and animate a second, independent progress signal (the footer channel) into its own CSS custom property, so the footer's reveal is just as smooth as the header/timeline's during active dragging — not just after finger-lift.
  - `packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts` — thread the new footer signal and snap-direction resolver through, and expose `isAtEdge` from the hook's return value.
  - `packages/ui/src/components/primitives/staged-form/StagedForm.tsx` — point the footer's style at the new footer-specific CSS var, and make the footer's `pointer-events-none` class and the `ScrollVisibilityContext` value edge-aware (so `TaskCreationAssignmentFooter`'s embedded shortcut bar — part of "the footer" as a visual unit — stays in sync with the actual footer visibility, while the header/timeline remain untouched).
  - `packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.test.ts` — rewrite the edge-reveal tests to assert against the new `isAtEdge`/`footerProgressRef` outputs instead of the shared `isHidden`/`progressRef` (which, under this fix, correctly stop reflecting edge state at all).
  - `architecture/36_scroll_visibility.md` — clarify that the bottom-edge reveal affects only the footer/navigation, not the header or timeline.
- Out of scope: everything already out of scope in the two prior plans in this lineage (other `StagedForm` consumers, `mode: "absolute"`, the global pattern, every other `useScrollHide()`/`useScrollVisibility()` call site).
- Assumptions: none new — this plan operates entirely within the scroll-visibility primitive and `StagedForm`, using the same `hasFooter`/`footerHeight` wiring already in place from the prior corrections plan.

## Clarifications required

None. The design choice this plan depends on — smooth, independently-lerped footer reveal even during active dragging, rather than a simpler instant-during-drag / smooth-after-lift approach — was confirmed directly with the user before this plan was written.

## Design — two independent relative-mode channels sharing one scroll listener

### Why a derived "clamp" isn't enough

The obvious-looking fix is: keep one shared `progressRef` for direction-tracking, and make the footer's *displayed* progress `atEdge ? 0 : progressRef.current` via a CSS `calc()` combining `--scroll-hide-progress` with a boolean `--scroll-at-edge` var. This was considered and rejected for two reasons:

1. **It doesn't decouple the signals, only their display.** The moment the footer needs a value the header/timeline must never see, they need genuinely separate state, not two views of the same number.
2. **It reintroduces the "jump on exit" problem this plan's ancestor (`PLAN_task_creation_staged_form_title_header_20260707`) specifically solved for the single-signal case.** If the footer's progress is `atEdge ? 0 : progressRef.current` and the *shared* `progressRef` was never paused while inside the edge zone, then the instant the user exits the zone, the footer's target snaps to whatever the core's progress had drifted to in the meantime — which is only guaranteed to be near `0` if `edgeOffset >= showThreshold` for that particular caller. That happens to hold for `StagedForm` today (`edgeOffset` is a real footer height, typically 60px+; `showThreshold` is a hardcoded `24`), but it's an unstated numeric coincidence, not a guarantee — a future consumer with a smaller `edgeOffset` would see a visible backward jump.

### The actual fix: two independent channels, same inputs

Both signals are computed by the exact same relative-mode formula (anchor + distance-from-anchor ÷ threshold), applied to the exact same scroll `value`/`delta` stream, using the exact same thresholds — the **only** difference is that the footer channel additionally locks to `0` while within `edgeOffset` px of the configured edge, and re-syncs its own anchor to the core channel's current anchor the instant it leaves that zone (rather than assuming the core's progress has already caught up).

```ts
type RelativeChannel = {
  directionAnchorRef: React.MutableRefObject<number>;
  movingForwardRef: React.MutableRefObject<boolean>;
  progressRef: React.MutableRefObject<number>;
  progressAtAnchorRef: React.MutableRefObject<number>;
};

function stepRelativeChannel(
  channel: RelativeChannel,
  value: number,
  delta: number,
  hideThreshold: number,
  showThreshold: number,
): number {
  const movingForward = delta > 0;
  if (movingForward !== channel.movingForwardRef.current) {
    channel.movingForwardRef.current = movingForward;
    channel.directionAnchorRef.current = value;
    channel.progressAtAnchorRef.current = channel.progressRef.current;
  }

  const distanceFromAnchor = value - channel.directionAnchorRef.current;
  const thresholdForDirection = movingForward ? hideThreshold : showThreshold;
  const newProgress = Math.min(
    1,
    Math.max(0, channel.progressAtAnchorRef.current + distanceFromAnchor / thresholdForDirection),
  );

  channel.progressRef.current = newProgress;
  return newProgress;
}
```

Because both channels run the identical formula on identical inputs, they are **mathematically identical whenever the footer channel isn't locked** — there is no drift to reconcile, no dead reckoning, and (critically) no dependency on `edgeOffset` being larger than `showThreshold`. When the footer channel exits the lock, it copies the core channel's current anchor/direction/progress-at-anchor and immediately re-steps with the current event's `value`/`delta` — which, by construction, reproduces exactly what the core channel just computed. From that point on the two channels tick forward together until the footer channel locks again.

```ts
// Inside onScroll, relative-mode branch, after the existing suppress/delta/mode guards:

const effectiveHideThreshold = Math.max(1, hideThreshold ?? threshold);
const effectiveShowThreshold = Math.max(1, showThreshold ?? threshold);

// Core channel — identical to today's behavior, never touched by revealAtEdge.
const coreProgress = stepRelativeChannel(
  coreChannel, value, delta, effectiveHideThreshold, effectiveShowThreshold,
);
if (!hiddenTargetRef.current && coreProgress >= 1) {
  applyHidden(true);
  directionAnchorRef.current = value;
  progressAtAnchorRef.current = 1;
} else if (hiddenTargetRef.current && coreProgress <= 0) {
  applyHidden(false);
  directionAnchorRef.current = value;
  progressAtAnchorRef.current = 0;
}

// Footer channel — same math, plus the edge lock.
const currentRevealAtEdge = revealAtEdgeRef.current;
let atEdge = false;
if (currentRevealAtEdge && edgeMeta) {
  const distanceToEdge =
    currentRevealAtEdge === "top" ? edgeMeta.distanceFromStart : edgeMeta.distanceFromEnd;
  atEdge = distanceToEdge <= (edgeOffsetRef.current ?? 0);
}

if (atEdge) {
  if (!isAtEdgeRef.current) {
    isAtEdgeRef.current = true;
    setIsAtEdge(true);
  }
  footerChannel.progressRef.current = 0;
  footerChannel.progressAtAnchorRef.current = 0;
  footerChannel.directionAnchorRef.current = value;
  footerChannel.movingForwardRef.current = false;
} else {
  if (isAtEdgeRef.current) {
    isAtEdgeRef.current = false;
    setIsAtEdge(false);
    // Re-sync to the core channel's current tracking state so the footer channel
    // continues from exactly where the core is, instead of replaying a stale
    // pre-lock anchor. The immediate step below then reproduces the core's own
    // just-computed progress for this event — no jump, regardless of how
    // edgeOffset compares to showThreshold.
    footerChannel.directionAnchorRef.current = coreChannel.directionAnchorRef.current;
    footerChannel.movingForwardRef.current = coreChannel.movingForwardRef.current;
    footerChannel.progressAtAnchorRef.current = coreChannel.progressAtAnchorRef.current;
  }
  stepRelativeChannel(footerChannel, value, delta, effectiveHideThreshold, effectiveShowThreshold);
}
```

`coreChannel` reuses the *existing* `directionAnchorRef`, `movingForwardRef`, `progressRef`, `progressAtAnchorRef` refs verbatim (same names, same public `progressRef` that every other consumer already reads) — this is a refactor of the existing computation into the shared helper, not a behavior change for the core signal. `footerChannel` is four new refs (`footerDirectionAnchorRef`, `footerMovingForwardRef`, `footerProgressRef`, `footerProgressAtAnchorRef`) grouped the same way.

### Smoothing the footer channel independently

`use-scroll-progress-css-var.ts`'s existing rAF loop lerps one target (`progressRef`) into one visual value (`visualProgressRef`) written to `--scroll-hide-progress`. It gains an **optional** second target/visual pair, updated in the same `requestAnimationFrame` callback so there is still only one rAF loop, not two competing ones:

- New optional inputs: `footerProgressRef?: React.MutableRefObject<number>`, `getFooterSnapDirection?: () => 0 | 1`.
- New ref: `visualFooterProgressRef`.
- New CSS var: `--scroll-hide-progress-footer`.
- `frame()` lerps both targets (when `footerProgressRef` is provided) using the same `LERP_FACTOR`/`CONVERGE_THRESHOLD`, and keeps scheduling the next frame as long as *either* hasn't converged.
- `triggerSnap()` (touch-end) computes a footer snap target too (`(getFooterSnapDirection ?? getSnapDirection)()`) and animates both CSS vars via the same `SNAP_DURATION_MS` CSS transition. Its early-return guard is widened from "core already settled" to "core **and** footer already settled" — otherwise a footer mid-transition at the exact moment of finger-lift would never get its own snap.
- `onTouchStart()` (interrupting a snap) estimates the footer's resume position the same way it already does for the core (same elapsed-time/ease-out formula, applied to the footer's own start/target refs), so grabbing the footer mid-animation doesn't cause it to jump.
- `onSnapComplete`'s signature gains an optional second parameter (`footerSnapTo?: 0 | 1`) so `use-scroll-state.ts`'s `snap()` can reconcile the footer channel's bookkeeping (anchor/progress-at-anchor) with whatever it visually settled on — the same reconciliation the core channel's `snap()` already does today, just applied to both channels now.

For every consumer that never sets `revealAtEdge`, `footerProgressRef`/`getFooterSnapDirection` are simply never passed in, so every new branch in this hook is skipped — zero behavior change, zero added cost beyond one `if (footerProgressRef)` check per frame.

### `StagedForm.tsx`: consuming the two signals correctly

- `HEADER_STYLE` and `StagedFormTimeline`'s internal style stay exactly as they are today, reading `--scroll-hide-progress` — this is what makes them correctly stop responding to edge-reveal, with no header/timeline-specific code changes at all.
- `FOOTER_STYLE` changes to read `--scroll-hide-progress-footer` instead of `--scroll-hide-progress`.
- `isAtEdge` (new, destructured from `useScrollHide(...)`) combines with the existing `isCompact` to derive `isFooterHidden = isCompact && !isAtEdge`, used for:
  - the footer wrapper's `pointer-events-none` class (so the revealed footer is actually tappable — this was the reason `isHidden` existed as a boolean in the first place; it must track the *effective* footer visibility, not the core's),
  - the value provided via `ScrollVisibilityContext.Provider` — because `TaskCreationAssignmentFooter` (rendered as the `footer` prop) reads that same context to decide whether its embedded `WorkingSectionShortcutBar` is collapsed. If the footer wrapper becomes visible at the edge but the context still reported the raw core `isHidden`, the shortcut bar would stay collapsed inside a now-visible footer — a "half-revealed footer" glitch. Making the context edge-aware keeps the footer, as the user means it, consistent as one visual unit.
- `isTimelineCompact` (passed through `StagedFormContext` to `StagedFormTimeline`) stays `isCompact` (raw core), unchanged — this is what keeps the timeline correctly unaffected.

This context change is scoped to `StagedForm`'s own `ScrollVisibilityContext.Provider` (used by its footer content and, incidentally, any step content rendered inside the same provider) — it does not touch the *global* `ScrollVisibilityContext` pattern or any other `StagedForm` consumer's behavior beyond making their own footers consistently edge-aware too, which every `StagedForm` footer already is as of the prior corrections plan.

## Contracts and skills

### Contracts loaded

- `architecture/36_scroll_visibility.md`: same governing contract; this plan's fix keeps the documented "Local pattern" self-consistent and adds the clarification that edge-reveal is footer-only within `StagedForm`.
- `architecture/06_client_state.md`: `isAtEdge` as component-local React state (not a store) is the same "prefer local, low-frequency booleans are fine as state" judgment already established for `isHidden` in the original plan — no new reasoning needed, same rule applies.

### Local extensions loaded

- None found.

### File read intent — pattern vs. relational

- Re-read `use-scroll-state.ts`, `use-scroll-visibility.ts`, `use-scroll-progress-css-var.ts`, `StagedForm.tsx` in their current, already-corrected state (post `PLAN_task_creation_staged_form_title_header_corrections_20260707`) — relational: this plan modifies exactly these files further; their present behavior is the baseline being changed.
- Re-read `use-scroll-state.test.ts` in full — relational: several existing assertions encode the *previous* (now-unwanted) behavior where edge-reveal forced the shared `isHidden`/`progressRef` visible; these need to be rewritten, not just extended, or they will assert the wrong thing going forward.
- Re-read `TaskCreationAssignmentFooter.tsx` — relational: confirms it reads `ScrollVisibilityContext`'s `isHidden` for its shortcut-bar collapse, which is why that context value must become edge-aware too, scoped precisely to this file's already-understood behavior from the prior corrections plan's investigation.

### Skill selection

- Primary skill: `skills/cross_cutting/planning_contract_selection/SKILL.md`
- Trigger terms: `scroll visibility`, `edge reveal`, `dual channel`, `lerp`
- Excluded alternatives: none.

## Implementation plan

1. **`packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts`**:
   - Add the module-level `RelativeChannel` type and `stepRelativeChannel` helper shown above.
   - Add footer channel refs: `footerDirectionAnchorRef`, `footerMovingForwardRef`, `footerProgressRef`, `footerProgressAtAnchorRef`.
   - Add `const [isAtEdge, setIsAtEdge] = useState(false);` (keep the existing `isAtEdgeRef` as the guard/bookkeeping ref, now also driving this state).
   - Add `getFooterSnapDirection = useCallback((): 0 | 1 => (isAtEdgeRef.current ? 0 : (footerMovingForwardRef.current ? 1 : 0)), []);`.
   - Rewrite the relative-mode body of `onScroll` per the Design section above: step the core channel first (identical to today's computation, just routed through `stepRelativeChannel`), then compute `atEdge` and step/lock the footer channel, including the re-sync-on-exit.
   - Update `resetState`'s relative branch and `initialize`'s relative branch to also reset the footer channel's four refs to the same "visible, anchored at current position" state as the core channel, and reset `isAtEdgeRef`/`isAtEdge` to `false`.
   - Update `snap(snapTo, currentScrollValue, footerSnapTo?)`: keep the existing core-channel reconciliation unchanged; when `footerSnapTo !== undefined`, also set `footerProgressRef.current = footerSnapTo`, `footerProgressAtAnchorRef.current = footerSnapTo`, `footerDirectionAnchorRef.current = currentScrollValue`, `footerMovingForwardRef.current = false`.
   - Update `ScrollStateResult` to add `footerProgressRef: React.MutableRefObject<number>`, `isAtEdge: boolean`, `getFooterSnapDirection: () => 0 | 1`, and widen `snap`'s type to accept the optional third parameter.

2. **`packages/ui/src/components/primitives/scroll-visibility/use-scroll-progress-css-var.ts`**:
   - Add `CSS_VAR_PROGRESS_FOOTER = "--scroll-hide-progress-footer"`.
   - Add optional inputs `footerProgressRef?: React.MutableRefObject<number>` and `getFooterSnapDirection?: () => 0 | 1` to `UseScrollProgressCssVarOptions`.
   - Add `visualFooterProgressRef`, `footerSnapStartProgressRef`, `footerSnapTargetRef` (the core's existing `snapStartTimeRef` is shared — both signals snap on the same clock).
   - Add `setFooterVar` alongside `setVar`.
   - Extend `frame()` to lerp `footerProgressRef` → `visualFooterProgressRef` → `setFooterVar` in the same pass, gated behind `if (footerProgressRef)`, and keep scheduling the next frame if either target hasn't converged.
   - Extend `triggerSnap()`: compute `footerSnapTo` via `(getFooterSnapDirection ?? getSnapDirection)()` when `footerProgressRef` is provided; widen the early-return guard to require both signals settled; save/restore the footer's snap-start state; write both vars in the snap rAF and the completion timeout; call `onSnapComplete(snapTo, footerProgressRef ? footerSnapTo : undefined)`.
   - Extend `onTouchStart()`: mirror the existing mid-snap resume estimate for the footer signal using its own start/target refs and the same `easeOut(t)` calculation; write `footerProgressRef.current` and `visualFooterProgressRef.current` to the resumed value, matching how the core's `progressRef.current`/`visualProgressRef.current` are already resynced.
   - Update the `onSnapComplete` type to `(snapTo: 0 | 1, footerSnapTo?: 0 | 1) => void`.

3. **`packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts`**:
   - Destructure `footerProgressRef`, `isAtEdge`, `getFooterSnapDirection` from `useScrollState(...)`.
   - Update `onSnapComplete` to accept and forward `footerSnapTo`: `snap(snapTo, currentValue, footerSnapTo)`.
   - Pass `footerProgressRef: revealAtEdge !== undefined ? footerProgressRef : undefined` and `getFooterSnapDirection: revealAtEdge !== undefined ? getFooterSnapDirection : undefined` into `useScrollProgressCssVar(...)`.
   - Add `isAtEdge` to the hook's returned object (`UseScrollVisibilityResult` gains `isAtEdge: boolean` — additive, `ScrollVisibilityContextValue`'s own shape is untouched).

4. **`packages/ui/src/components/primitives/staged-form/StagedForm.tsx`**:
   - Destructure `isAtEdge` alongside the existing `isHidden: isCompact` from `useScrollHide(...)`.
   - Change `FOOTER_STYLE`'s `transform`/`opacity` to reference `var(--scroll-hide-progress-footer, 0)` instead of `var(--scroll-hide-progress, 0)`.
   - Add `const isFooterHidden = isCompact && !isAtEdge;` and use it (instead of `isCompact`) for: the footer wrapper's `pointer-events-none` class, and the `ScrollVisibilityContext.Provider` value's `isHidden` field.
   - Leave `HEADER_STYLE`, the header wrapper's `pointer-events-none` (still `isCompact`), and `contextValue.isTimelineCompact` (still `isCompact`) unchanged — this is what fixes the reported issue.

5. **`packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.test.ts`** — rewrite to match the new semantics:
   - "forces the element visible near the configured bottom edge" → rename to something like "locks the footer channel visible near the configured bottom edge while leaving the core channel's own hidden state alone"; assert `result.current.isAtEdge === true` and `result.current.footerProgressRef.current === 0` once within the edge zone, **and separately** assert `result.current.isHidden` reflects only the direction-based core computation (still `true` once past `hideThreshold`, independent of edge state).
   - "keeps onScroll stable when edgeOffset changes" — keep the `onScroll` reference-stability assertion (still the regression guard for the earlier feedback-loop fix); verify the numeric `isHidden` expectation still holds under the refactored core computation (it should, since the core channel's math is unchanged — confirm rather than assume).
   - "stays visible when leaving the edge zone upward and only rehides after a fresh threshold" → rewrite against `isAtEdge`/`footerProgressRef` for the edge-zone entry/exit/re-hide sequence, and add a **new** assertion in the same test (or a new test) that `result.current.isHidden` (core) does **not** flip to `false` merely because the footer entered the edge zone — this is the direct regression test for the bug this plan fixes.
   - "preserves plain relative-mode behavior when revealAtEdge is omitted" — no behavioral change expected; keep as-is, optionally add an assertion that `footerProgressRef.current` mirrors `progressRef.current` exactly when `revealAtEdge` is never configured (documents that the footer channel is a harmless no-op mirror in that case).

6. **`architecture/36_scroll_visibility.md`** — amend the bullet added by the prior corrections plan ("Its footer/navigation also enables a bottom-edge reveal override…") to explicitly state that this override affects only the footer/navigation signal (`--scroll-hide-progress-footer`) and never the header or timeline, which continue to read the unmodified `--scroll-hide-progress`.

## Risks and mitigations

- Risk: Duplicating the relative-mode computation into two channels could drift apart if a future change is made to one copy of the formula but not the other.
  Mitigation: Both channels call the *same* `stepRelativeChannel` function — there is only one copy of the formula in the codebase; the channels differ only in which refs they're given and whether the edge-lock branch runs before stepping them.
- Risk: The footer channel's own `applyHidden`-equivalent doesn't exist — nothing publicly exposes "is the footer channel currently past `newProgress >= 1`" as a boolean the way `isHidden` does for the core.
  Mitigation: Not needed. The only boolean StagedForm needs for the footer is `isFooterHidden = isCompact && !isAtEdge`, which correctly captures "the core says hidden, and we're not currently overriding that via the edge lock" — the footer channel's raw progress only needs to be exposed as a continuous value (`footerProgressRef`) for the CSS var, never as a second discrete hidden flag.
- Risk: Widening `triggerSnap`'s early-return guard (from "core settled" to "core and footer both settled") could change behavior for the ~19 consumers that never pass `footerProgressRef`.
  Mitigation: `footerSettled` is defined as `!footerProgressRef || ...` — when `footerProgressRef` is `undefined` (every non-opted-in consumer), `footerSettled` is always `true`, so the combined guard reduces to exactly the original `coreSettled` check. No change for those consumers.
- Risk: Forgetting to reset the footer channel's refs in `resetState`/`initialize` would leave stale anchor state across a `StagedForm` step change, potentially causing a one-frame incorrect footer progress on the new step.
  Mitigation: Explicit implementation step (1) calls this out; verify with a test that changes `activeStepId` (or calls `resetState`/`initialize` directly) and asserts `footerProgressRef.current === 0` and `isAtEdge === false` immediately after.
- Risk: `ScrollVisibilityContext`'s `isHidden` becoming edge-aware could, in principle, affect a future `StagedForm` step-content component (not just the footer) that also happens to consume this same context inside the scroll area.
  Mitigation: Accepted as a minor, coherent side effect — anything consuming this context is, by construction, inside this specific `StagedForm` instance's local scope, and "should this collapse alongside the chrome" is already the context's stated purpose; tracking the *effective* (edge-aware) visibility is more correct for such a consumer than tracking the raw core value, not less. No consumer currently depends on the raw core value specifically (checked: `TaskCreationAssignmentFooter` is the only consumer inside any `StagedForm` instance today).

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/ui`.
- `npm run test -- --grep "use-scroll-state"`: rewritten unit tests pass, including the new explicit regression assertion that core `isHidden` is unaffected by edge-zone entry.
- Manual smoke check: open the Internal Task creation form, item with available working sections, Assignment step. Scroll down until the footer hides — confirm the title header (if visible on this step) and step timeline **stay hidden**, and only the footer/shortcut bar reveal once you reach the bottom. Scroll up slightly (within the footer's height of the bottom) and confirm the footer stays visible without flicker; scroll up further and confirm the footer re-hides only after clearing a fresh scroll-down of `hideThreshold` (40px) worth of motion, not instantly.
- Manual smoke check, active-drag specifically: perform the same bottom-approach scroll slowly, without lifting your finger, and confirm the footer eases into view over a few frames rather than popping in instantly — this is the behavior difference the "always smooth" design choice was specifically for.
- `npx playwright test --grep "staged-form-scroll-collapse" --project=mobile` and `--grep "task-creation-form-flow" --project=mobile`: re-run the specs added/extended by the prior corrections plan; extend the footer-visible-at-bottom assertion to also assert the header/timeline element(s) remain hidden (translated off-screen / `opacity: 0`) at the same moment the footer is visible.
- `npx playwright test --project=desktop`: same specs, desktop viewport.

## Review log

- `2026-07-07` `Claude (review)`: User reported that after the prior corrections plan shipped, the footer's edge-reveal correctly worked but incorrectly also revealed the header and timeline (all three share one `--scroll-hide-progress` signal). Presented two implementation-depth options (instant-during-drag vs. always-smooth) via clarifying question; user chose always-smooth. This plan implements the always-smooth, fully-decoupled design.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David` (awaiting explicit approval before handing to Codex)
