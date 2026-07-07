# PLAN_task_working_sections_reassign_footer_edge_reveal_20260707

## Metadata

- Plan ID: `PLAN_task_working_sections_reassign_footer_edge_reveal_20260707`
- Status: `under_construction`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T00:00:00Z`
- Last updated at (UTC): `2026-07-07T00:00:00Z`
- Related issue/ticket: `—`
- Intention plan: `—` (follow-up request applying an already-built capability to a new page)
- Prior plans in this lineage: `docs/architecture/archives/implementation/PLAN_staged_form_footer_edge_reveal_decoupling_20260707.md` (built the capability), `docs/architecture/archives/implementation/PLAN_staged_form_header_scrollable_content_20260707.md` and `PLAN_worker_task_detail_footer_edge_reveal_20260707.md` (two prior direct applications to standalone `useScrollHide()` pages), `docs/architecture/archives/implementation/PLAN_working_section_shortcut_bar_footer_signal_fix_20260707.md` (fixed `WorkingSectionShortcutBar`'s CSS var + the geometric-feedback-loop class of bug this plan must avoid reintroducing)

## Why this page needs more than the previous two

The previous two applications of this capability (`packages/tasks/src/pages/TaskDetailSlidePage.tsx`, and the workers app's own `TaskDetailSlidePage.tsx`) both already had an **absolutely-positioned** footer with a **fixed** bottom-padding reservation — adding `revealAtEdge`/`edgeOffset` there was a pure wiring change with no layout restructuring.

`TaskWorkingSectionsReassignSlidePage.tsx` is structurally different in two ways that make a naïve "just add `revealAtEdge`" change actively dangerous:

1. **Its footer is a normal flex sibling, not an absolute overlay.** The page is `<div className="flex h-full min-h-0 flex-col">` containing the scroll area (`flex-1`) and `<TaskWorkingSectionsReassignFooter>` as a plain sibling below it — not `position: absolute`. There is consequently no bottom padding reserved on the scroll container today (confirmed by the user's own report) — the footer just claims its own space via normal flex layout, and the scroll area's `flex-1` height shrinks to make room for it automatically.
2. **`TaskWorkingSectionsReassignFooter` collapses its own layout height today**, via `grid-template-rows` driven by `isHidden` from `useScrollVisibilityContext()` — the exact pattern `PLAN_working_section_shortcut_bar_footer_signal_fix_20260707` just identified and removed from `TaskCreationAssignmentFooter.tsx` for causing a geometric feedback loop (footer height change → scroll container's available height changes → `distanceFromEnd` changes → `isAtEdge` flips → footer height changes again → repeat).

Wiring `revealAtEdge` onto this page's `ScrollVisibilityProvider` *without* first converting the footer to a `position: absolute` overlay (like every other footer in this lineage) would reproduce that exact bug immediately — here through `clientHeight` (the scroll container is a flex sibling whose available height grows/shrinks as the footer's flex-layout height changes) rather than through `scrollHeight`/`paddingBottom`, but it is the same underlying mistake. This is precisely why the user's own framing of the request ("we will need to add some padding at the bottom which the current page doesn't have") is correct — the padding is not a cosmetic afterthought here, it's the structural prerequisite that makes the rest of the fix safe.

## Goal and intent

- Goal: Give `TaskWorkingSectionsReassignSlidePage.tsx`'s footer the same bottom-edge-reveal behavior as `StagedForm`'s footer and both `TaskDetailSlidePage.tsx` implementations — reachable even when the user scrolls straight to the bottom without reversing — by first converting its footer to the same `position: absolute` + `--scroll-hide-progress-footer` overlay pattern used everywhere else in this lineage, then wiring `revealAtEdge`/`edgeOffset` on top of that stable foundation.
- Business/user intent: consistency and correctness. This page duplicates a large amount of markup from `TaskWorkingSectionsSlidePage.tsx`'s footer (the "main" working-sections page, which already gets this treatment for free by going through `StagedForm`'s footer slot) but reimplements it manually without `StagedForm`, and had drifted from the correct pattern in the process — this plan brings it back in line.
- Non-goals:
  - **Not migrating this page onto `StagedForm`.** It has no multi-step structure (a single view, not a staged flow), so pulling in the full `StagedForm` primitive just for its footer treatment would be a much larger, unrelated change. This plan reimplements the same local pattern `TaskDetailSlidePage.tsx` already uses directly, not `StagedForm` itself.
  - No change to `TaskWorkingSectionsSlidePage.tsx` (the "main" page) — it already gets edge-reveal for free via `StagedForm` and is unaffected.
  - No change to the scroll-visibility primitive — this plan is pure consumer restructuring plus wiring, reusing capability that already exists.

## Scope

- In scope: `packages/task-working-sections/src/pages/TaskWorkingSectionsReassignSlidePage.tsx` only (both the page-level component and the `TaskWorkingSectionsReassignFooter` function it defines in the same file).
- Out of scope: `TaskWorkingSectionsSlidePage.tsx`, `WorkingSectionShortcutBar.tsx` (already fixed in the prior plan; this page's usage of it is already correct — plain non-collapsing wrapper, `animationMode="translate"`), the scroll-visibility primitive.
- Assumptions: a fixed `edgeOffset`/`paddingBottom` value (not `ResizeObserver`-measured) is the right choice here, matching the precedent of both `TaskDetailSlidePage.tsx` implementations and avoiding reintroducing any measurement-driven feedback path — the exact figure needs visual tuning during implementation, same honest caveat as every prior constant in this lineage.

## Design

### Step 1 — replace `ScrollVisibilityProvider` with `useScrollHide()`

`ScrollVisibilityProvider` is the primitive's *global* pattern building block (normally wrapped once around the whole app shell) — this page uses it locally, scoped to its own `scrollElement` state, which works but doesn't currently expose `revealAtEdge`/`edgeOffset` (that capability was only ever wired into `useScrollVisibility()`/`useScrollHide()`, deliberately, across every plan in this lineage — see `36_scroll_visibility.md`'s decision tree: surfaces/slides should use `useScrollHide()`, never the global provider). Rather than extending `ScrollVisibilityProvider` to support a capability it was never meant to have, migrate this page onto `useScrollHide()` directly — the same "local pattern" every other page in this lineage already uses, with the capability already fully built in.

```tsx
const {
  scrollRef,
  hideProgressContainerRef,
  isHidden,
  isAtEdge,
  reset,
  suspend,
} = useScrollHide({
  revealAtEdge: "bottom",
  edgeOffset: TASK_WORKING_SECTIONS_REASSIGN_FOOTER_EDGE_OFFSET_PX,
});
const isFooterHidden = isHidden && !isAtEdge;
```

`reset`/`suspend` are needed because they must be passed into the manually-constructed `ScrollVisibilityContext.Provider` below (`WorkingSectionShortcutBar` and any other context consumer expect them on the context value, even though this page never calls them itself — there's no step navigation here to trigger a `reset()`).

### Step 2 — provide `ScrollVisibilityContext` manually and make the footer an absolute overlay

`ScrollVisibilityProvider` used to wrap children in `ScrollVisibilityContext.Provider` automatically; moving to `useScrollHide()` means this page must do that itself — exactly the way `StagedForm.tsx` does for its own footer slot:

```tsx
return (
  <div
    ref={hideProgressContainerRef}
    className="relative flex h-full min-h-0 flex-col"
    data-testid="task-working-sections-reassign-slide-page"
  >
    <ScrollVisibilityContext.Provider
      value={{ isHidden: isFooterHidden, reset, suspend }}
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3"
        style={{
          paddingBottom: `calc(${TASK_WORKING_SECTIONS_REASSIGN_FOOTER_EDGE_OFFSET_PX}px + var(--safe-bottom, 0px))`,
        }}
      >
        <div className="flex flex-col gap-4 pb-4">
          <TaskWorkingSectionsStepList />
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 z-10 will-change-transform"
        style={{
          transform: "translateY(calc(var(--scroll-hide-progress-footer, 0) * 100%))",
          opacity: "calc(1 - var(--scroll-hide-progress-footer, 0))",
          transition:
            "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
          pointerEvents: isFooterHidden ? "none" : undefined,
        }}
      >
        <TaskWorkingSectionsReassignFooter
          availableSections={availableSections}
          selectedSectionIds={selectedSectionIds}
          hasUnsavedChanges={controller.hasUnsavedChanges}
          hideShortcuts={hideShortcuts}
          isSaving={controller.isSaving}
          onClose={controller.handleCloseWithGuard}
          onSaveAndClose={controller.handleSaveAndClose}
          onShortcutPress={controller.handleShortcutPress}
        />
      </div>
    </ScrollVisibilityContext.Provider>
  </div>
);
```

Note the outer wrapper gains `relative` (required for the absolute footer to anchor to it) and the scroll container's old `pb-6` is replaced by the calculated `paddingBottom` (the small fixed gap is no longer sufficient or relevant once a real footer-height reservation exists).

### Step 3 — simplify `TaskWorkingSectionsReassignFooter` to match `TaskWorkingSectionsFooter` exactly

Remove the `useScrollVisibilityContext()` call and the outer `grid-template-rows` collapsing wrapper entirely — the parent now handles all hide/show via the absolute overlay + CSS var. What's left is the footer's actual content, unconditionally rendered:

```tsx
function TaskWorkingSectionsReassignFooter({
  availableSections,
  selectedSectionIds,
  hideShortcuts,
  hasUnsavedChanges,
  isSaving,
  onShortcutPress,
  onSaveAndClose,
  onClose,
}: {...}): React.JSX.Element {
  const canShowShortcuts = !hideShortcuts && availableSections.length > 0;

  return (
    <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
      {canShowShortcuts ? (
        <div className="px-4 pt-3">
          <WorkingSectionShortcutBar
            shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
            availableSections={availableSections}
            selectedSectionIds={selectedSectionIds}
            onShortcutPress={onShortcutPress}
            animationMode="translate"
            data-testid="task-working-sections-reassign-shortcut-bar"
            className="py-2"
            trackClassName="mt-3"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
        {/* ...close/save buttons, unchanged... */}
      </div>

      <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
    </div>
  );
}
```

This makes `TaskWorkingSectionsReassignFooter` structurally identical to `TaskWorkingSectionsSlidePage.tsx`'s own `TaskWorkingSectionsFooter` (which never had the `isHidden`/grid-collapse wrapper in the first place, because `StagedForm` already handles all of that for it) — the two footers converge on the same shape, which is the correct end state given they render near-identical content.

`WorkingSectionShortcutBar` itself keeps reading `useScrollVisibilityContext()` internally (unchanged) — after the prior plan's Bug A fix, it correctly reads the footer-specific signal and the edge-aware `isHidden` this page now provides via context.

## Contracts and skills

### Contracts loaded

- `architecture/36_scroll_visibility.md`: same governing contract. Its decision tree already says surfaces/slides should use `useScrollHide()`, never `ScrollVisibilityProvider` — this plan brings this page into compliance with a rule it was already violating, independent of the edge-reveal feature being added.

### Local extensions loaded

- None found.

### File read intent — pattern vs. relational

- Read `TaskWorkingSectionsReassignSlidePage.tsx` in full — relational: the file being restructured.
- Read `TaskWorkingSectionsSlidePage.tsx` (the "main" working-sections page) in full — relational: confirmed it already gets edge-reveal for free via `StagedForm`'s footer slot, and that its footer component (`TaskWorkingSectionsFooter`) has no `isHidden`/grid-collapse logic at all — this is what proved the reassign page's footer had drifted from the correct pattern rather than intentionally diverging, and gave the exact target shape to converge on.
- Read `ScrollVisibilityProvider.tsx` — relational: confirmed it has no `revealAtEdge`/`edgeOffset` support and was deliberately never extended to have it across every prior plan in this lineage, which is why migrating to `useScrollHide()` (not extending the provider) is the correct fix.
- Grepped for existing Playwright coverage of this page — none found, so this plan does not need to update any spec, only add manual validation.

### Skill selection

- Primary skill: `skills/cross_cutting/planning_contract_selection/SKILL.md`
- Trigger terms: `reassign slide`, `footer edge reveal`, `ScrollVisibilityProvider`, `flex sibling footer`
- Excluded alternatives: none.

## Implementation plan

1. **`packages/task-working-sections/src/pages/TaskWorkingSectionsReassignSlidePage.tsx`**:
   - Change imports: remove `ScrollVisibilityProvider`, `useScrollVisibilityContext`; add `ScrollVisibilityContext`, `useScrollHide` (all from `@beyo/ui`).
   - Add `const TASK_WORKING_SECTIONS_REASSIGN_FOOTER_EDGE_OFFSET_PX = 160;` at module scope, with a comment noting it approximates the footer's height including the shortcut bar and should be visually tuned.
   - In `TaskWorkingSectionsReassignFooter`: remove the `useScrollVisibilityContext()` call and the `grid`/`grid-rows-[0fr]/[1fr]` wrapper `<div>` (and its `overflow-hidden` inner `<div>`) — render its existing content (shortcut bar block, button row, safe-bottom spacer) directly as shown in the Design section.
   - In `TaskWorkingSectionsReassignSlidePageContent`: remove `scrollElement` state; call `useScrollHide({ revealAtEdge: "bottom", edgeOffset: TASK_WORKING_SECTIONS_REASSIGN_FOOTER_EDGE_OFFSET_PX })`; derive `isFooterHidden`; replace the `<ScrollVisibilityProvider>` wrapper and its inner JSX structure with the `hideProgressContainerRef`/`ScrollVisibilityContext.Provider`/`scrollRef`/absolute-footer structure shown in the Design section, keeping the existing `data-testid="task-working-sections-reassign-slide-page"` on the new outer `relative` wrapper.

## Risks and mitigations

- Risk: `160` is an unverified estimate for this footer's height (button row plus optional shortcut bar), not a measurement.
  Mitigation: Same honest-caveat handling as every fixed constant in this lineage — visually confirm during implementation with the shortcut bar both shown and hidden, biasing toward the taller (shortcuts-shown) state to avoid content clipping, per the Validation plan below.
- Risk: Removing `ScrollVisibilityProvider` changes how `WorkingSectionShortcutBar` (and any other context consumer rendered inside this page) receives `isHidden` — from an automatically-wrapped provider to a manually-constructed one.
  Mitigation: The manually-constructed `ScrollVisibilityContext.Provider value={{ isHidden: isFooterHidden, reset, suspend }}` provides the exact same shape (`ScrollVisibilityContextValue`) `ScrollVisibilityProvider` already provided — this is a mechanical equivalent, not a behavioral change to the context's shape, only to who constructs it and what value it carries (now edge-aware instead of pure direction-based).
  Mitigation: This is the standard "clean up if unused" step already applied consistently across every file touched in this lineage.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/task-working-sections`.
- Manual smoke check: open the task working-sections reassign slide for a task whose major category has available working sections (so the shortcut bar renders) and enough sections/content to make the list scrollable. Scroll straight down to the bottom without reversing — confirm the footer (buttons + shortcut bar together) reveals, with no content clipped behind it at any scroll position. Scroll up away from the bottom and confirm it hides again only after a genuine further scroll-down.
- Manual smoke check: repeat with `hideShortcuts` true / a major category with no available sections, to confirm the shorter (buttons-only) footer state also reveals correctly and doesn't leave excess empty space that looks broken.
- Manual smoke check: confirm unsaved-changes guard (`handleCloseWithGuard`) and Save button disabled/enabled states are all unaffected — this plan changes only visibility/positioning, not any of the save/close logic.

## Review log

- `2026-07-07` `Claude (planning)`: User requested the edge-reveal capability for this page and specifically flagged the missing bottom padding — investigation confirmed this page's footer is a normal flex sibling with a self-collapsing layout height (the same bug class just fixed in `TaskCreationAssignmentFooter.tsx`), not an absolute overlay like every other footer in this lineage, so a straightforward "add revealAtEdge" wiring would have reintroduced the geometric feedback loop. Also found the page uses `ScrollVisibilityProvider` (the primitive's global-pattern component) locally rather than `useScrollHide()` (the local-pattern hook this whole lineage has consistently used), which does not support `revealAtEdge` at all — migrated to `useScrollHide()` rather than extending the global provider. Compared against `TaskWorkingSectionsSlidePage.tsx`'s already-correct footer (which gets this treatment for free via `StagedForm`) to derive the exact target shape.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David` (awaiting explicit approval before handing to Codex)
