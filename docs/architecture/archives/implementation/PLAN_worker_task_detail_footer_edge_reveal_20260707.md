# PLAN_worker_task_detail_footer_edge_reveal_20260707

## Metadata

- Plan ID: `PLAN_worker_task_detail_footer_edge_reveal_20260707`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T00:00:00Z`
- Last updated at (UTC): `2026-07-07T11:24:01Z`
- Related issue/ticket: `—`
- Intention plan: `—` (follow-up request applying an already-built capability to a new page)
- Prior plans in this lineage: `docs/architecture/archives/implementation/PLAN_staged_form_footer_edge_reveal_decoupling_20260707.md` (built the `revealAtEdge`/`edgeOffset`/`--scroll-hide-progress-footer` capability this plan consumes), `docs/architecture/archives/implementation/PLAN_staged_form_header_scrollable_content_20260707.md` (Goal 2 applied the same capability to `packages/tasks/src/pages/TaskDetailSlidePage.tsx`, the direct precedent for this plan)

## Goal and intent

- Goal: The workers app's own `TaskDetailSlidePage.tsx` (`apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`) hides its bottom footer/CTA on scroll-down via a standalone `useScrollHide()` call, with the same "never reappears if you scroll straight to the bottom without reversing" gap that `packages/tasks/src/pages/TaskDetailSlidePage.tsx` had before it was fixed. Apply the same `revealAtEdge`/`edgeOffset` wiring here.
- Business/user intent: a worker reading a task step's details (images, upholstery section, flow timeline) who scrolls straight to the bottom currently loses access to "Close & Back" / "Help" (and the "Complete task" CTA when the step is in progress) right when they've finished reading — the same usability gap already fixed twice in this lineage, now on the workers app's own separate implementation of this page.
- Non-goals:
  - No change to the scroll-visibility primitive — this is a pure consumer wiring change, identical in shape to the fix already applied to `packages/tasks/src/pages/TaskDetailSlidePage.tsx`.
  - No change to `TaskStepDetailFooter.tsx`'s markup or its badge-dismiss-on-hide logic — only which value its `isScrollHidden` prop receives.
  - No `ResizeObserver`-based dynamic height measurement — this page already reserves scroll-content padding with a fixed `9.5rem` constant (no live measurement exists here at all, for either of the two footer elements, both `position: absolute`), so a fixed `edgeOffset` is consistent with the page's existing approach, not a new pattern being introduced.

## Scope

- In scope: `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx` only.
- Out of scope: `TaskStepDetailFooter.tsx`, `TaskStepCircularActionButton` and every other component this page renders — none of them need changes, only the two values the page passes into them.
- Assumptions: a fixed `edgeOffset` matching the page's existing `9.5rem` scroll-padding constant is a reasonable approximation of the combined footer zone's height (the always-rendered `TaskStepDetailFooter` plus, when `canShowCompletionAction` is true, the "Complete task" CTA stacked above it) — same honest-estimate caveat as the analogous constant in `packages/tasks/src/pages/TaskDetailSlidePage.tsx`.

## Clarifications required

None — this is a direct, well-precedented application of an existing capability to a structurally similar page, verified by reading the actual file rather than assumed from its name.

## Design

### What's different from the `packages/tasks` version, and why it doesn't change the approach

This page has **two** absolutely-positioned bottom elements sharing one local `FOOTER_STYLE` object and one `isHidden` boolean, not one:

1. `TaskStepDetailFooter` (`z-10`, always rendered) — "Close & Back" / "Help" buttons.
2. A conditional "Complete task" button (`z-0`, rendered only when `canShowCompletionAction`), stacked visually above the footer via a large bottom padding trick (`pb-27`) rather than normal layout stacking.

Both are `position: absolute`, so neither contributes to the scroll container's `scrollHeight` — unlike the `TaskCreationAssignmentFooter` bug found in the previous plan, there is no `ResizeObserver` anywhere in this file and no possibility of a geometric feedback loop here. Both elements just need to move onto the footer-specific signal together, since they represent one visual unit (the bottom action area) exactly the way `TaskCreationAssignmentFooter`'s button row and shortcut bar do.

### The change

```tsx
// Near the top of TaskDetailSlidePageContent, or module scope alongside other constants:
// Fixed edge-reveal distance for this page's bottom action area (footer +
// optional "Complete task" CTA). Kept in sync with the 9.5rem used in the
// scroll content's own bottom padding below — not dynamically measured, since
// neither bottom element affects scrollHeight (both position: absolute).
const TASK_DETAIL_FOOTER_EDGE_OFFSET_PX = 152; // 9.5rem

// ...

const { scrollRef, isHidden, isAtEdge, hideProgressContainerRef } = useScrollHide({
  revealAtEdge: "bottom",
  edgeOffset: TASK_DETAIL_FOOTER_EDGE_OFFSET_PX,
});
const isFooterHidden = isHidden && !isAtEdge;

// ...

const FOOTER_STYLE: React.CSSProperties = {
  transform: "translateY(calc(var(--scroll-hide-progress-footer, 0) * 100%))",
  opacity: "calc(1 - var(--scroll-hide-progress-footer, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};
```

Then replace `isHidden` with `isFooterHidden` in the three places it currently drives visible/interactive behavior:

- The "Complete task" button's `pointerEvents: isHidden ? "none" : undefined` → `isFooterHidden`.
- `TaskStepDetailFooter`'s wrapper `pointerEvents: isHidden ? "none" : undefined` → `isFooterHidden`.
- `TaskStepDetailFooter`'s `isScrollHidden={isHidden}` prop → `isScrollHidden={isFooterHidden}`. This is meaningful, not cosmetic: `TaskStepDetailFooter` uses `isScrollHidden` to auto-dismiss its unread-message badge popup when it thinks it's off-screen — if it kept reading the raw (non-edge-aware) `isHidden`, the badge would dismiss itself even while the footer is actually visible via the bottom-edge reveal.

## Contracts and skills

### Contracts loaded

- `architecture/36_scroll_visibility.md`: same governing contract as every plan in this lineage; no further doc changes needed here since it already documents the `revealAtEdge`/`edgeOffset` local-pattern usage via the `packages/tasks` precedent — this plan doesn't introduce anything new to document, only a second consumer of the same documented capability.

### Local extensions loaded

- None found.

### File read intent — pattern vs. relational

- Read `apps/workers-app/.../pages/task_steps/TaskDetailSlidePage.tsx` in full — relational: this is the exact file being modified; its current `useScrollHide()`/`FOOTER_STYLE`/`isHidden` usage is the baseline for this diff.
- Read `TaskStepDetailFooter.tsx` in full — relational: confirmed `isScrollHidden` drives real behavior (badge auto-dismiss), not just styling, which is why it must receive the edge-aware value rather than being left unchanged.
- Compared against `packages/tasks/src/pages/TaskDetailSlidePage.tsx` and `TaskDetailBottomActions.tsx` (already fixed in this lineage) — relational: confirmed this page's structure (two absolute, non-layout-affecting bottom elements, no `ResizeObserver`) is close enough to that precedent that the same fixed-offset approach applies directly, and different enough (two elements instead of one) to call out explicitly rather than silently generalize.

### Skill selection

- Primary skill: `skills/cross_cutting/planning_contract_selection/SKILL.md`
- Trigger terms: `worker task detail`, `edge reveal`, `footer`, `scroll-hide-progress-footer`
- Excluded alternatives: none.

## Implementation plan

1. **`apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`**:
   - Add the `TASK_DETAIL_FOOTER_EDGE_OFFSET_PX = 152` constant (module scope, with the "keep in sync with 9.5rem" comment shown in the Design section).
   - Change `const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();` to also pass `revealAtEdge: "bottom", edgeOffset: TASK_DETAIL_FOOTER_EDGE_OFFSET_PX` and destructure `isAtEdge`.
   - Add `const isFooterHidden = isHidden && !isAtEdge;`.
   - Update the local `FOOTER_STYLE` object's two CSS var references from `--scroll-hide-progress` to `--scroll-hide-progress-footer`.
   - Replace all three remaining uses of `isHidden` (the "Complete task" button's `pointerEvents`, `TaskStepDetailFooter`'s wrapper `pointerEvents`, and `TaskStepDetailFooter`'s `isScrollHidden` prop) with `isFooterHidden`.

## Risks and mitigations

- Risk: `152` is carried over from a different page's footer (`packages/tasks/src/pages/TaskDetailSlidePage.tsx`) rather than measured against this page's actual "Close & Back / Help" row plus the "Complete task" CTA.
  Mitigation: This page's own existing `9.5rem` scroll-padding constant already represents the same combined-zone estimate (it was presumably already tuned to avoid clipping content behind both elements) — reusing it for `edgeOffset` is at least as well-grounded as introducing a new, unverified number. As with every prior plan in this lineage, visually confirm during implementation rather than trusting the figure blindly.
- Risk: Forgetting to update `TaskStepDetailFooter`'s `isScrollHidden` prop (only updating the two `pointerEvents` usages) would leave the badge-dismiss behavior reading the stale, non-edge-aware signal.
  Mitigation: Called out as its own explicit bullet in the Design section precisely because it's easy to miss among three near-identical-looking replacements; the manual smoke check below exercises it directly (trigger a new-message badge, then scroll to the bottom edge, confirm the badge doesn't get dismissed just because the footer is edge-revealed).

## Validation plan

- `npm run typecheck`: zero TypeScript errors for the workers app.
- Manual smoke check: open a task step's detail page with enough content to scroll (images, upholstery section, several flow-timeline entries). Scroll straight down to the bottom without reversing direction — confirm "Close & Back" / "Help" reappear, and the "Complete task" CTA (if the step is `working`) also reappears, instead of staying hidden. Scroll up away from the bottom and confirm both hide again only after a genuine further scroll-down.
- Manual smoke check (badge interaction): trigger an unread-message badge on the Help button (e.g. receive a case message while on this page), scroll down until the footer hides normally (confirm badge dismisses as today), then separately scroll straight to the bottom edge and confirm reaching the edge-reveal does not incorrectly dismiss a badge that just appeared while at the edge.

## Review log

- `2026-07-07` `Claude (planning)`: Authored directly from a follow-up user request to apply the already-built edge-reveal capability to the workers app's separate `TaskDetailSlidePage.tsx` implementation, mirroring the fix already applied to the `@beyo/tasks` package version of this page. Read the actual file rather than assuming it matched that precedent exactly — found two absolutely-positioned bottom elements sharing one signal instead of one, and one non-cosmetic use of the hidden boolean (badge auto-dismiss) that needed the edge-aware value too.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
