# PLAN_staged_form_header_scrollable_content_20260707

## Metadata

- Plan ID: `PLAN_staged_form_header_scrollable_content_20260707`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T00:00:00Z`
- Last updated at (UTC): `2026-07-07T09:07:48Z`
- Related issue/ticket: `—`
- Intention plan: `—` (scoped directly from a follow-up user request)
- Prior plans in this lineage: `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_20260707.md`, `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_corrections_20260707.md`, `docs/architecture/archives/implementation/PLAN_staged_form_footer_edge_reveal_decoupling_20260707.md`

## Goal and intent

- Goal 1: `StagedForm`'s `header` prop currently renders as an absolutely-positioned overlay that slides up and fades based on the core scroll-visibility signal (same mechanism as the step timeline). Change it to render as normal scrollable content instead — no animation, no scroll-visibility involvement at all. It should scroll away naturally with the rest of the step content, the same way any other block of content does, and reappear naturally when the user scrolls back up.
- Goal 2: `TaskDetailSlidePage.tsx`'s bottom action bar (`TaskDetailBottomActions`) hides on scroll-down via its own standalone `useScrollHide()` call (the "local pattern" from `36_scroll_visibility.md`, unrelated to `StagedForm`), but never reappears if the user scrolls straight to the bottom of a task's details without reversing direction — the same class of bug `PLAN_task_creation_staged_form_title_header_20260707` fixed for `StagedForm`'s own footer. Wire the same `revealAtEdge`/`edgeOffset` capability into this page's `useScrollHide()` call so the action bar reliably reappears at the bottom.
- Business/user intent:
  - Goal 1: the animated-overlay treatment was carried over from mirroring the timeline/footer pattern, but the title header doesn't need that treatment — it's simpler and more predictable for it to just be part of the page content, scrolling like everything else.
  - Goal 2: a user reading a long task's details (images, upholstery section, flow timeline, etc.) who scrolls straight down currently loses access to "Close & Back" / "Edit" (and the "Assign Stages" CTA when relevant) right at the point they've finished reading and are most likely to act — the same usability gap already fixed once for `StagedForm`.
- Non-goals:
  - No change to the step timeline — it keeps its existing absolutely-positioned, scroll-reactive behavior, unaffected.
  - No change to the footer's edge-aware reveal or the two-channel scroll-visibility primitive itself (`use-scroll-state.ts`, `use-scroll-progress-css-var.ts`, `use-scroll-visibility.ts`) — **neither goal touches the primitive.** Goal 1 removes the header from scroll-visibility entirely; Goal 2 is a pure consumer of the capability the primitive already exposes generically since the decoupling plan. This is exactly the payoff of having built that capability as a general, reusable primitive feature rather than something StagedForm-specific.
  - No change to the `header` prop's public shape (`header?: ReactNode` on `StagedFormProps`) or to `TaskCreationStagedFormHeader` — only where and how `StagedForm` renders it changes.
  - No change to `TaskDetailBottomActions`'s markup, buttons, or the "Assign Stages" CTA timing logic — only which CSS custom property and which `isHidden` value it's fed.
  - No `ResizeObserver`-based dynamic height measurement for `TaskDetailBottomActions` (unlike `StagedForm`'s footer, which already had that infrastructure for its own reasons). See Risks below for why a fixed `edgeOffset` is an acceptable, consistent choice here instead.

## Scope

- In scope:
  - `packages/ui/src/components/primitives/staged-form/StagedForm.tsx` (Goal 1: remove the header's overlay/animation wiring, render it as scrollable content instead).
  - `architecture/36_scroll_visibility.md` (Goal 1: remove the now-incorrect claim that the header slides/fades on scroll).
  - `packages/tasks/src/pages/TaskDetailSlidePage.tsx` (Goal 2: add `revealAtEdge`/`edgeOffset` to its `useScrollHide()` call, derive an edge-aware `isHidden` for the footer).
  - `packages/tasks/src/components/detail/TaskDetailBottomActions.tsx` (Goal 2: read the footer-specific CSS var instead of the core one).
- Out of scope: `staged-form.types.ts`, `TaskCreationStagedFormHeader.tsx`, the three task-creation form contents, `TasksView.tsx` (initially suspected as the Goal 2 target; confirmed with the user to be a different page — `TasksView.tsx` has no footer that hides on scroll today, only a header using Pattern B, and is untouched by this plan), and the entire scroll-visibility primitive.
- Assumptions:
  - Goal 1: the header rendering *after* the timeline's reserved top offset (i.e., visually directly below the timeline strip, at the top of the scrollable area) rather than *above* it is acceptable. This is a structural consequence of the timeline remaining a fixed overlay pinned to the very top of the viewport — scrollable content can only start below a fixed overlay's reserved space, it cannot render above it. The header still appears above all step content, which is what was originally asked for; it no longer appears above the timeline specifically.
  - Goal 2: a fixed `edgeOffset` matching the existing hardcoded `9.5rem` (152px) scroll-content bottom padding already used in this same file is an acceptable approximation of `TaskDetailBottomActions`'s real height, consistent with the pre-existing precedent of that padding value itself already being a fixed guess (see Risks).

## Clarifications required

None. Goal 1 is a direct simplification request with only one structural consequence (noted above). Goal 2's target file was confirmed directly with the user after an initial investigation of `TasksView.tsx` (the file that prompted the request) found no scroll-hiding footer there at all — see Review log.

## Design — deleting, not adding

This is the rare case where "clean and optimal" means removing code rather than writing new code. The header's animated-overlay treatment was built by mirroring the timeline's existing plumbing (`HEADER_STYLE` mirroring the timeline's inline style, a shared absolutely-positioned wrapper, a conditional scroll-container top-offset to reserve space for both, `pointer-events-none` gating). None of that plumbing is needed for plain scrollable content — normal document flow already handles "moves out of view when the container scrolls," which is the entire behavior being asked for.

Concretely:

- The absolutely-positioned top overlay (`<div className="absolute inset-x-0 top-0 z-10 ...">`) reverts to containing only `<StagedFormTimeline />`, exactly as it was before the `header` prop existed.
- `header` is rendered as the **first child inside the scroll container**, before the `AnimatePresence`-managed step content:

  ```tsx
  <div ref={scrollRef} className={...} style={{ paddingBottom: ... }} data-testid="staged-form-scroll-container">
    {header}
    {enableKeyboardAccessory ? (
      <KeyboardAccessoryBar>{stepContent}</KeyboardAccessoryBar>
    ) : (
      stepContent
    )}
  </div>
  ```

  Because `header` sits outside `AnimatePresence`/`getActiveStepChild`, it stays mounted and untouched across step navigation — only the step content beneath it slides between steps (`StagedFormStep` uses a horizontal `x` transform in normal flow, not absolute positioning, so a persistent sibling above it is unaffected either way).

- `HEADER_STYLE` is deleted (no longer referenced anywhere).
- `STAGED_FORM_HEADER_AND_TIMELINE_OFFSET_CLASS` is deleted, along with the `scrollTopOffsetClass = header ? ... : STAGED_FORM_TIMELINE_OFFSET_CLASS` conditional — the scroll container's top offset only ever needs to reserve space for the timeline now (`header` no longer occupies any of that reserved overlay space), so `STAGED_FORM_TIMELINE_OFFSET_CLASS` ("pt-14") applies unconditionally, exactly as it did before `header` existed.
- The `isCompact ? "pointer-events-none" : null` gating on the header wrapper is deleted along with the wrapper itself — plain scrollable content never needs pointer-events suppression, it simply isn't there to receive pointer events once scrolled out of view.
- `isCompact`/`isAtEdge`/`isFooterHidden` and everything else in the component is untouched — they still exist for the timeline and footer, which keep their current behavior exactly as-is.

Net diff shape: two constants deleted, one conditional deleted, one wrapper `<div>` deleted, `header` moved from one JSX location to another. No new state, no new refs, no new CSS custom properties.

## Design — Goal 2: reusing the existing footer-signal capability for `TaskDetailBottomActions`

### Why this is small

`PLAN_staged_form_footer_edge_reveal_decoupling_20260707` already generalized `useScrollHide()`/`useScrollVisibility()` to expose a *second*, independently-animated signal (`footerProgressRef` → `--scroll-hide-progress-footer`, plus `isAtEdge`) whenever `revealAtEdge` is configured — and, as a fixed rule of that redesign, the *core* signal (`progressRef`/`isHidden`/`--scroll-hide-progress`) never responds to `revealAtEdge` at all, regardless of which consumer is asking. That rule was built generically, not StagedForm-specifically, so applying it to `TaskDetailSlidePage.tsx`'s own standalone `useScrollHide()` call requires zero changes to the primitive — only to the two files that consume it.

`TaskDetailSlidePageContent` is a good fit for this because, unlike `StagedForm`, nothing else in that page shares the core signal with the footer — there's no header or timeline reading `isHidden`/`--scroll-hide-progress` there (the native surface header is fully hidden via `setHeaderHidden(true)`). So Goal 2 doesn't need to reconcile competing consumers the way Goal 2 of the very first plan in this lineage did — it's a pure "move this one consumer onto the footer-specific signal" change.

### The two-file change

**`packages/tasks/src/pages/TaskDetailSlidePage.tsx`** — mirror exactly how `StagedForm.tsx` wires its own footer:

```ts
// A fixed, generous estimate of TaskDetailBottomActions's own height (excluding
// safe-bottom, which is layered on separately) — kept in sync with the 9.5rem used
// in this file's scroll-content bottom padding below. Not dynamically measured;
// see PLAN_staged_form_header_scrollable_content_20260707 Goal 2 for why a fixed
// value is an acceptable, consistent choice here.
const BOTTOM_ACTIONS_EDGE_OFFSET_PX = 152; // 9.5rem

// ...

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

// ...

<TaskDetailBottomActions
  isHidden={isFooterHidden}
  onEdit={controller.openEditTask}
  onOpenWorkingSections={controller.openWorkingSectionsSlide}
  shouldRenderAssignStages={shouldRenderAssignStages}
/>
```

(The `[scroll-debug][task-detail] isHidden` debug log a few lines above can keep logging the raw `isHidden` or switch to `isFooterHidden` — either is fine, it's a debug aid only; prefer `isFooterHidden` since that's what actually drives the visible UI.)

**`packages/tasks/src/components/detail/TaskDetailBottomActions.tsx`** — change both CSS var references from the core to the footer-specific signal (the component's `isHidden` prop already means "should this be visually/interactively hidden," which is exactly what the caller now computes as edge-aware before passing it in — no prop-type change needed):

```tsx
style={{
  transform: "translateY(calc(var(--scroll-hide-progress-footer, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress-footer, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
}}
```

## Contracts and skills

### Contracts loaded

- `architecture/36_scroll_visibility.md`: same governing contract; this plan removes a documented behavior (header slides on scroll) that this exact contract file currently asserts, so the doc must be corrected in the same change.
- `architecture/07_components.md`: unaffected — `StagedForm` remains a shared UI primitive receiving `header` via props with no context consumption; only its internal rendering choice for that prop changes.

### Local extensions loaded

- None found.

### File read intent — pattern vs. relational

- Re-read `StagedForm.tsx` in its current (post-decoupling-plan) state and `StagedFormStep.tsx` — relational: confirmed `StagedFormStep` uses an in-flow horizontal transform (not `position: absolute`), so a persistent sibling rendered before the `AnimatePresence` block cannot conflict with the step-transition animation.
- Grepped the two Playwright specs touched by prior plans in this lineage (`staged-form-scroll-collapse.spec.ts`, `task-creation-form-flow.spec.ts`) for any header-specific scroll assertions — none found, so no test updates are required by this change.
- Dispatched an Explore agent to locate the "footer" the user meant for Goal 2, since `TasksView.tsx` (the file initially referenced) turned out to have no scroll-hiding footer at all — only its `TasksHeader` (Pattern B, top). Confirmed via `TasksPage.tsx` in both the managers and sellers apps that the only bottom-anchored element there, `TaskCreationFab`, is a plain `fixed` button with no scroll-visibility wiring whatsoever. The user then identified `TaskDetailSlidePage.tsx` as the intended target — relational read of that file and `TaskDetailBottomActions.tsx` confirmed the existing Pattern-A local-pattern wiring this plan now extends.

### Correction note

The initial investigation for Goal 2 targeted the wrong file (`TasksView.tsx`, per the user's first message and the currently-open editor tab) — a repo-wide search found no footer there that hides on scroll. Rather than guess at what "the footer" meant, this was clarified directly with the user via a multiple-choice question before any plan content was written, which surfaced the correct target (`TaskDetailSlidePage.tsx`). No wasted implementation, only wasted (cheap) exploration.

### Skill selection

- Primary skill: `skills/cross_cutting/planning_contract_selection/SKILL.md`
- Trigger terms: `staged form`, `header`, `scroll content`
- Excluded alternatives: none.

## Implementation plan

1. **`packages/ui/src/components/primitives/staged-form/StagedForm.tsx`**:
   - Delete the `HEADER_STYLE` constant.
   - Delete the `STAGED_FORM_HEADER_AND_TIMELINE_OFFSET_CLASS` constant and the `scrollTopOffsetClass` variable; use `STAGED_FORM_TIMELINE_OFFSET_CLASS` directly in the scroll container's `className`.
   - Revert the absolute top wrapper to `<div className="absolute inset-x-0 top-0 z-10"><StagedFormTimeline /></div>` (drop `flex flex-col` and the conditional `header` block — both existed only to accommodate the header there).
   - Add `{header}` as the first child inside the scroll container `<div ref={scrollRef} ...>`, immediately before the existing `enableKeyboardAccessory ? <KeyboardAccessoryBar>{stepContent}</KeyboardAccessoryBar> : stepContent` expression.

2. **`architecture/36_scroll_visibility.md`** — under "`StagedForm` — built-in scroll hide", remove the bullet "An optional `header` prop slides **up** and fades on scroll-down." (added by the first plan in this lineage) since it's no longer true; optionally add a short note that `header` renders as ordinary scrollable content above the step content and is not part of the scroll-visibility system at all.

3. **`packages/tasks/src/pages/TaskDetailSlidePage.tsx`**:
   - Add the `BOTTOM_ACTIONS_EDGE_OFFSET_PX = 152` constant (module scope, with the "keep in sync with the 9.5rem padding below" comment shown in the Design section).
   - Change `const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();` to also request `revealAtEdge: "bottom", edgeOffset: BOTTOM_ACTIONS_EDGE_OFFSET_PX` and destructure `isAtEdge`.
   - Add `const isFooterHidden = isHidden && !isAtEdge;`.
   - Pass `isFooterHidden` (not `isHidden`) to `<TaskDetailBottomActions isHidden={...} .../>`.

4. **`packages/tasks/src/components/detail/TaskDetailBottomActions.tsx`** — change the two `var(--scroll-hide-progress, 0)` references in the inline `style` to `var(--scroll-hide-progress-footer, 0)`. No other changes — the `isHidden` prop's meaning and its `pointer-events-none` usage are unchanged, only which underlying signal it and the CSS var now come from.

## Risks and mitigations

- Risk: A consumer relying on the header staying pinned/visible while scrolling (the previous behavior at `--scroll-hide-progress = 0`) would see a behavior change — the header now scrolls away like any other content instead of staying fixed at the top until the hide threshold.
  Mitigation: This is the explicitly requested change, not an accidental regression. The only current consumers of `header` are the three task-creation forms (Internal, Pre-Order, Return); confirm with a quick visual check that a title scrolling away with the content reads fine for all three.
- Risk: Removing the header from the absolute overlay changes the scroll container's top offset from `pt-28` back to `pt-14` for the three forms that use `header` — if `TaskCreationStagedFormHeader`'s actual rendered height differs from the old assumed 56px, step content could start with slightly more or less gap above it than before, or the header block itself could be partially under the timeline overlay.
  Mitigation: The header is a plain flow element now, not a fixed-height assumption inside someone else's offset math — its own `min-h-14` sets its own height, and the scroll container's `pt-14` only needs to clear the *timeline's* fixed overlay height (which hasn't changed at all in this plan). Visually confirm the header isn't obscured by the timeline overlay at scroll-top for all three forms.
- Risk (Goal 2): `TaskDetailBottomActions`'s real height varies — it's taller when `shouldRenderAssignStages` is true and the "Assign Stages" CTA has faded in (after a `durations.slide` delay) than when it's just the two-button row. A fixed `edgeOffset = 152` will under-estimate the reveal zone in the taller state, meaning the edge-reveal engages slightly later (closer to the literal bottom) than ideal when that CTA is showing.
  Mitigation: This is a pre-existing imprecision, not a new one — the scroll content's own `pb-[calc(var(--safe-bottom,0)+9.5rem)]` bottom padding already uses the same fixed 152px assumption and already doesn't account for the taller CTA state. This plan doesn't make that imprecision worse, and fixing it (e.g. via `ResizeObserver`, matching `StagedForm`'s footer) is a reasonable future follow-up, not required to satisfy the user's request. Note in code (via the constant's comment) that both numbers must be kept in sync if either changes.
- Risk (Goal 2): forgetting to switch `TaskDetailBottomActions`'s CSS var reference (step 4) while only updating the page (step 3) would silently no-op the whole feature — the footer would keep reading the core `--scroll-hide-progress`, which per the decoupling plan's design never reflects edge-reveal, so the bar would still never reappear at the bottom.
  Mitigation: Both files are single, explicit implementation steps in this same plan; the manual smoke check below directly exercises this and would immediately show the bar failing to reveal if step 4 were missed.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/ui` and `@beyo/tasks`.
- Manual smoke check (Goal 1): open each of the Internal Task, Pre-Order, and Return creation forms. Confirm the title header is visible at scroll-top, directly below the step timeline, and scrolls away naturally (no fade/slide animation, just moves with the content) as you scroll down through a step; confirm it reappears naturally when scrolling back to the top. Confirm the timeline and footer still behave exactly as before (timeline hides/shows on direction-based scroll; footer reveals at the bottom edge).
- Manual smoke check (Goal 2): open a task's detail slide page for a task with enough content to scroll (images, upholstery section, several flow-timeline entries). Scroll straight down to the bottom without reversing direction — confirm "Close & Back" / "Edit" reappear once you're near the end, instead of staying hidden. Scroll up away from the bottom and confirm the bar hides again only after a genuine further scroll-down, not instantly. Repeat for a `pending` task with zero assigned working sections to also confirm the "Assign Stages" CTA still appears/behaves correctly alongside the edge-reveal.
- `npx playwright test --grep "task-creation-form-flow" --project=mobile` and `--project=desktop`: confirm no regressions to the existing flow assertions (none of them assert header scroll-hide behavior, per the file-read-intent check above, so this is a pure regression guard, not new coverage).
- `npx playwright test --grep "task.detail" --project=mobile`: if an existing spec covers `TaskDetailSlidePage`, extend or spot-check it for the same bottom-edge-reveal assertion pattern used for `StagedForm`'s footer; if none exists, this is optional (not required to satisfy the user's request, but a natural place for future coverage).

## Review log

- `2026-07-07` `Claude (planning)`: Authored directly from a follow-up user request to stop the header from being scroll-visibility-reactive and make it part of the scrollable content instead — a simplification/removal of the overlay plumbing added by the first plan in this lineage, not a new capability.
- `2026-07-07` `Claude (planning)`: Added Goal 2 — user asked to also apply the `revealAtEdge` capability to "the footer" on `TasksView.tsx`. Investigation found `TasksView.tsx` has no scroll-hiding footer at all (only a Pattern-B header, and an unrelated always-fixed `TaskCreationFab` on the containing page). Clarified with the user via AskUserQuestion; correct target was `TaskDetailSlidePage.tsx` / `TaskDetailBottomActions.tsx`, which already uses the standalone local scroll-hide pattern this plan now extends. No primitive changes needed — this goal is a pure consumer of the capability already built for `StagedForm`'s footer.
- `2026-07-07` `Codex (implementation)`: Implemented the staged-form header move into normal scroll flow, wired bottom-edge reveal into `TaskDetailSlidePage` / `TaskDetailBottomActions`, passed `npm run typecheck`, and wrote `docs/architecture/implemented_summaries/SUMMARY_staged_form_header_scrollable_content_20260707.md`.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `Codex`
