# PLAN_working_section_shortcut_bar_footer_signal_fix_20260707

## Metadata

- Plan ID: `PLAN_working_section_shortcut_bar_footer_signal_fix_20260707`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T00:00:00Z`
- Last updated at (UTC): `2026-07-07T10:53:24Z`
- Related issue/ticket: `—`
- Intention plan: `—` (bug report on a follow-up implementation, investigated and root-caused in this planning pass)
- Prior plans in this lineage: `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_20260707.md`, `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_corrections_20260707.md`, `docs/architecture/archives/implementation/PLAN_staged_form_footer_edge_reveal_decoupling_20260707.md`, `docs/architecture/archives/implementation/PLAN_staged_form_header_scrollable_content_20260707.md`, `docs/architecture/archives/implementation/PLAN_staged_form_timeline_scrollable_content_20260707.md`, `docs/architecture/archives/implementation/PLAN_staged_form_manual_footer_edge_offset_20260707.md`

## Bug report

On the Internal Task form's "assignment" (working-section selection) step, scrolling to the bottom edge makes the footer's buttons reveal correctly, but the working-section shortcut-bar pills above them don't appear even though the space reserved for them is visible — and continuing to scroll causes the footer to rapidly flicker open/closed ("fighting to close and open").

## Root cause

Two independent, compounding bugs, both pre-dating this specific report but only surfaced now because the assignment step is the one place they interact:

### Bug A — `WorkingSectionShortcutBar` reads the wrong CSS variable

`WorkingSectionShortcutBar.tsx`'s `animationMode="translate"` style block still reads the **core** signal:

```tsx
style={
  animationMode === "translate"
    ? {
        transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
        opacity: "calc(1 - var(--scroll-hide-progress, 0))",
        ...
      }
    : undefined
}
```

`PLAN_staged_form_footer_edge_reveal_decoupling_20260707` deliberately made the **core** signal (`--scroll-hide-progress`) never respond to edge-reveal — only the **footer-specific** signal (`--scroll-hide-progress-footer`) does. Every other footer element inside `StagedForm` (`FOOTER_STYLE` in `StagedForm.tsx`, `TaskDetailBottomActions.tsx`) was updated to read the footer-specific var at the time that capability was built. `WorkingSectionShortcutBar.tsx` was missed.

Effect: the shortcut bar's *own* `TaskCreationAssignmentFooter`'s outer wrapper correctly reads the edge-aware `isHidden` from context (via `useScrollVisibilityContext()`) and expands its reserved space at the bottom edge — but the shortcut bar's own `translateY`/`opacity` is still driven by the core signal, which stays at "hidden" (the user scrolled down past `hideThreshold` and never reversed). Reserved space appears; the pills inside it stay translated off-screen and invisible. This is exactly the reported symptom.

This bug is not specific to the task-creation footer — `WorkingSectionShortcutBar` with `animationMode="translate"` is also used by `TaskWorkingSectionsSlidePage.tsx`, `TaskWorkingSectionsReassignSlidePage.tsx`, and `QuickTaskAssignSlidePage.tsx`, all of which render it inside a `StagedForm` `footer` prop and are equally affected — they just haven't been scrolled-to-the-bottom-and-noticed yet. Fixing the shared component fixes all four call sites at once.

### Bug B — `TaskCreationAssignmentFooter` doubles up two incompatible hide mechanisms

`TaskCreationAssignmentFooter.tsx` wraps `WorkingSectionShortcutBar` in a **layout-collapsing** wrapper:

```tsx
<div
  className={cn(
    "grid overflow-hidden px-4 transition-[grid-template-rows] duration-220 ...",
    isHidden ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
  )}
>
  <div className="min-h-0">
    <WorkingSectionShortcutBar ... animationMode="translate" ... />
  </div>
</div>
```

This is the wrapper pattern that belongs with `WorkingSectionShortcutBar`'s *other* mode (`animationMode="collapse"`, the default — see `WorkingSectionPickerField.tsx`'s `max-h-0`/`max-h-24` wrapper for the correct pairing). `animationMode="translate"` is designed to be **self-contained** — it already handles its own hide/show via `transform`/`opacity`, and does not need (or expect) an outer layout-collapsing wrapper. The three other "translate" mode call sites (`TaskWorkingSectionsSlidePage.tsx`, `TaskWorkingSectionsReassignSlidePage.tsx`, `QuickTaskAssignSlidePage.tsx`) all use a plain, non-collapsing `<div className="px-4 pt-3">` — confirmed by reading all four call sites side by side. `TaskCreationAssignmentFooter.tsx` is the only one that gets this wrong.

Effect — the actual "fighting to close and open" oscillation:

1. `grid-template-rows` is a **layout** property — collapsing it from `1fr` to `0fr` genuinely shrinks the element's rendered height (unlike `transform: translateY`, which only repaints, never changes layout size).
2. `StagedForm`'s `ResizeObserver` (`footerCallbackRef`) measures the *entire* footer element's real height, including this now-shrinking/growing shortcut-bar wrapper, into `footerHeight` state.
3. `footerHeight` still drives `paddingBottom` on the scroll container (unchanged, unrelated to the manually-set `footerEdgeOffset`) — so `paddingBottom` shrinks and grows in lockstep with the grid collapse.
4. Changing `paddingBottom` changes the scroll container's `scrollHeight`, which changes `distanceFromEnd` (`scrollHeight - clientHeight - scrollTop`) **for the same physical scroll position** — which is exactly the quantity `isAtEdge` is computed from.
5. So: reaching the edge → `isHidden` (edge-aware) flips to `false` → grid expands → `scrollHeight` grows → `distanceFromEnd` grows → `isAtEdge` can flip back to `false`-meaning-"not at edge" → `isHidden` flips back to `true` → grid collapses → `scrollHeight` shrinks → `distanceFromEnd` shrinks → back at the edge → repeat. A genuine feedback loop through DOM geometry, not through React state or effect dependencies — the ref-based fix from `PLAN_task_creation_staged_form_title_header_corrections_20260707` (which fixed a *different*, already-resolved feedback loop through `edgeOffset`'s identity churn) cannot catch this one, because this loop runs entirely through `scrollHeight`, which no amount of ref/dependency-array tuning touches.

The fix is not a workaround — it's removing the double mechanism. `WorkingSectionShortcutBar` in translate mode already doesn't change layout size when it hides (that's the entire point of using a transform instead of a collapsing property). Once Bug A is fixed and the outer grid wrapper is removed, the shortcut bar's rendered layout height becomes **constant** while scrolling — it only changes when `showShortcutBar` itself changes (step navigation or major-category selection), which is a discrete, rare event, not something that fires on every scroll tick. The geometric feedback loop cannot exist if the geometry doesn't move.

## Goal and intent

- Goal: Fix both bugs at their root — the shared `WorkingSectionShortcutBar` component and `TaskCreationAssignmentFooter`'s incorrect wrapper — rather than patching around the symptom (e.g., tuning `TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX` further, which cannot fix either bug since neither is caused by that value).
- Business/user intent: the shortcut bar should appear reliably and smoothly whenever the footer is visible — whether from normal scroll-up or from the bottom-edge reveal — with no flicker.
- Non-goals:
  - No change to `TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX`'s value — the user's tuned value is unrelated to either bug and is left as-is.
  - No change to `WorkingSectionPickerField.tsx`'s shortcut-bar usage — it uses `animationMode="collapse"` (the default) with the matching max-height wrapper, which is the *correct* pairing and is unaffected by either bug.
  - No change to the scroll-visibility primitive (`use-scroll-state.ts`, `use-scroll-progress-css-var.ts`, `use-scroll-visibility.ts`) — both bugs are in consumer code, not the primitive.

## Scope

- In scope: `packages/ui/src/components/primitives/working-section-shortcut-bar/WorkingSectionShortcutBar.tsx` (Bug A) and `packages/task-creation/src/components/TaskCreationAssignmentFooter.tsx` (Bug B).
- Out of scope: `TaskWorkingSectionsSlidePage.tsx`, `TaskWorkingSectionsReassignSlidePage.tsx`, `QuickTaskAssignSlidePage.tsx` — their wrapper markup is already correct (plain, non-collapsing `<div>`); they only need Bug A's shared-component fix, which they get automatically with no changes of their own required.
- Assumptions: none beyond what's verified above by reading all four call sites directly.

## Clarifications required

None — both root causes were traced completely by reading the actual component and all of its call sites; no part of the fix depends on an assumption that couldn't be verified in source.

## Design

### Fix Bug A — `WorkingSectionShortcutBar.tsx`

```tsx
style={
  animationMode === "translate"
    ? {
        transform:
          "translateY(calc(var(--scroll-hide-progress-footer, 0) * 100%))",
        opacity: "calc(1 - var(--scroll-hide-progress-footer, 0))",
        transition:
          "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
      }
    : undefined
}
```

Only the two CSS custom property names change (`--scroll-hide-progress` → `--scroll-hide-progress-footer`); `--scroll-snap-duration` is shared between both signals already and needs no change. The `isHidden`-driven `pointer-events-none` class (also in this file, for translate mode) already reads `isHidden` from `useScrollVisibilityContext()`, which `StagedForm` already provides as the edge-aware value — that part was already correct and needs no change.

### Fix Bug B — `TaskCreationAssignmentFooter.tsx`

Replace the grid-collapsing wrapper with the same plain wrapper pattern used by the three other "translate" mode call sites:

```tsx
{showShortcutBar ? (
  <div className="px-4">
    <WorkingSectionShortcutBar
      shortcuts={shortcuts}
      availableSections={availableSections}
      selectedSectionIds={selectedSectionIds}
      onShortcutPress={handleShortcutPress}
      animationMode="translate"
      className="pb-3 pt-3"
      data-testid="task-creation-working-sections-shortcut-bar"
      trackClassName="mt-3"
    />
  </div>
) : null}
```

(`px-4` only — no `pt-3` on the wrapper, since `WorkingSectionShortcutBar`'s own `className="pb-3 pt-3"` already supplies vertical spacing; adding it to both would double it up.)

Remove the now-unused `isHidden` destructuring and `useScrollVisibilityContext` import from this file — after this change nothing in it reads `isHidden` anymore (`WorkingSectionShortcutBar` reads the context itself, independently).

## Contracts and skills

### Contracts loaded

- `architecture/36_scroll_visibility.md`: same governing contract as every plan in this lineage. Worth a small addition: when composing a layout-collapsing wrapper (`max-height`/`grid-template-rows`) around any element that is *also* independently reading `--scroll-hide-progress`/`--scroll-hide-progress-footer` for its own transform, the collapsing wrapper's height changes will feed back into any `ResizeObserver`-measured ancestor (like `StagedForm`'s footer measurement) — the two mechanisms must not be combined on the same element.
- `architecture/07_components.md`: unaffected — both files remain simple presentational/feature components; no context-consumption pattern changes beyond removing an unused hook call.

### Local extensions loaded

- None found.

### File read intent — pattern vs. relational

- Read `WorkingSectionShortcutBar.tsx` in full — relational: this is the exact file being fixed.
- Read all four call sites of `WorkingSectionShortcutBar` with `animationMode="translate"` (`TaskCreationAssignmentFooter.tsx`, `TaskWorkingSectionsSlidePage.tsx`, `TaskWorkingSectionsReassignSlidePage.tsx`, `QuickTaskAssignSlidePage.tsx`) side by side — relational: this comparison is what proved `TaskCreationAssignmentFooter.tsx`'s grid wrapper is the outlier/bug rather than an intentional variant, and confirmed the correct replacement pattern is already established and working elsewhere in the same codebase.
- Read `WorkingSectionPickerField.tsx`'s shortcut-bar usage (`animationMode="collapse"`, unspecified/default) — relational: confirmed the max-height collapsing wrapper is the *correct* pairing for that mode, which is what makes it clear `TaskCreationAssignmentFooter.tsx` mismatched a collapse-style wrapper with a translate-style component instead of introducing a new pattern.
- Re-read `StagedForm.tsx`'s `footerCallbackRef`/`ResizeObserver`/`paddingBottom` wiring — relational: this is what confirmed the geometric feedback-loop mechanism (Bug B) precisely, distinguishing it from the already-fixed reference/dependency-array feedback loop from an earlier plan.

### Skill selection

- Primary skill: `skills/cross_cutting/planning_contract_selection/SKILL.md`
- Trigger terms: `working section shortcut bar`, `footer flicker`, `scroll-hide-progress-footer`, `grid-template-rows`
- Excluded alternatives: none.

## Implementation plan

1. **`packages/ui/src/components/primitives/working-section-shortcut-bar/WorkingSectionShortcutBar.tsx`** — in the `animationMode === "translate"` branch of the root `style` prop, change both `var(--scroll-hide-progress, 0)` references to `var(--scroll-hide-progress-footer, 0)`. No other changes to this file.

2. **`packages/task-creation/src/components/TaskCreationAssignmentFooter.tsx`**:
   - Replace the `grid overflow-hidden px-4 transition-[grid-template-rows] ...` wrapper `<div>` (and its inner `min-h-0` `<div>`) around `<WorkingSectionShortcutBar>` with a single plain `<div className="px-4">`, matching the Design section above.
   - Remove `useScrollVisibilityContext` from the `@beyo/ui` import and the `const { isHidden } = useScrollVisibilityContext();` line — no longer used anywhere in this file.

## Risks and mitigations

- Risk: Removing the grid wrapper changes the collapse/expand *feel* from a 220ms `grid-template-rows` transition to whatever `WorkingSectionShortcutBar`'s own translate transition timing produces (driven by `--scroll-snap-duration` — `0ms` during active scroll, ~400ms on snap).
  Mitigation: This is the same transition mechanism every other "translate" mode consumer already uses and that `StagedForm`'s own footer/header/timeline already use — it's the established, tested feel for this codebase's scroll-hide elements, not a novel or unproven timing.
- Risk: The three other `WorkingSectionShortcutBar` "translate" consumers get their visual behavior changed by the Bug A fix (their pills will now correctly track the footer-specific signal instead of the core one) without any code change of their own — a behavior change arriving "for free."
  Mitigation: This is the intended fix, not a side effect to guard against — they had the same latent bug, just not yet observed. Their pills should now correctly reveal at the bottom edge exactly like the buttons next to them already do, which is strictly more correct than before. Manual smoke check covers this explicitly.
- Risk: Forgetting to remove the now-dead `useScrollVisibilityContext`/`isHidden` import from `TaskCreationAssignmentFooter.tsx` would leave a harmless but incorrect unused-import lint warning.
  Mitigation: Explicit sub-step in implementation step 2; `npm run typecheck`/lint would flag it if missed.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/ui` and `@beyo/task-creation`.
- Manual smoke check (the reported bug): open the Internal Task form, select an item whose major category has available working sections, go to the Assignment step, scroll to the bottom. Confirm the shortcut-bar pills reveal smoothly alongside the footer buttons (not left invisible), and confirm no flicker/oscillation continuing to scroll near the bottom edge.
- Manual smoke check (regression on the fixed files' other call sites): open `TaskWorkingSectionsSlidePage`, `TaskWorkingSectionsReassignSlidePage`, and `QuickTaskAssignSlidePage` (wherever a shortcut bar renders) and confirm their pills now also correctly reveal at the bottom edge alongside their footer buttons, with no flicker.
- Manual smoke check (unaffected path): open `WorkingSectionPickerField`'s own shortcut bar (collapse mode, e.g. within a task detail or creation step where it's used as inline field content) and confirm its collapse/expand behavior is completely unchanged.
- `npx playwright test --grep "task-creation-form-flow" --project=mobile` and `--project=desktop`: re-run the existing footer-edge-reveal assertions; should continue to pass unmodified.

## Review log

- `2026-07-07` `Claude (planning)`: User reported a visual bug (shortcut-bar pills not appearing, footer flickering) after tuning `TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX`. Traced to two independent, pre-existing bugs unrelated to that value: `WorkingSectionShortcutBar` reading the wrong (core, not footer-specific) CSS variable, and `TaskCreationAssignmentFooter` combining a layout-collapsing wrapper with a component mode designed to be self-contained, creating a geometric feedback loop through `ResizeObserver`-measured `scrollHeight`. Confirmed both diagnoses by comparing against the three other call sites of the same shared component, all of which use the correct pattern.
- `2026-07-07` `Codex (implementation)`: Switched `WorkingSectionShortcutBar` translate mode to `--scroll-hide-progress-footer`, removed the collapsing wrapper from `TaskCreationAssignmentFooter`, documented the staged-form footer composition rule in `architecture/36_scroll_visibility.md`, passed `npm run typecheck`, and wrote `docs/architecture/implemented_summaries/SUMMARY_PLAN_working_section_shortcut_bar_footer_signal_fix_20260707.md`.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `Codex`
