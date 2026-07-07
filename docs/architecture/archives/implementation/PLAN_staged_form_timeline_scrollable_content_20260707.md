# PLAN_staged_form_timeline_scrollable_content_20260707

## Metadata

- Plan ID: `PLAN_staged_form_timeline_scrollable_content_20260707`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T00:00:00Z`
- Last updated at (UTC): `2026-07-07T09:42:12Z`
- Related issue/ticket: `—`
- Intention plan: `—` (follow-up correction after reviewing the implemented prior plan)
- Prior plans in this lineage: `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_20260707.md`, `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_corrections_20260707.md`, `docs/architecture/archives/implementation/PLAN_staged_form_footer_edge_reveal_decoupling_20260707.md`, `docs/architecture/archives/implementation/PLAN_staged_form_header_scrollable_content_20260707.md`
- Also touches (unrelated, deliberately preserved): `docs/architecture/archives/implementation/PLAN_staged_form_absolute_timeline_20260606.md`, `docs/architecture/archives/implementation/PLAN_centralize_staged_form_scroll_visibility_20260615.md`, `docs/architecture/archives/implementation/PLAN_staged_form_scroll_collapse_20260521.md` — the timeline's collapse-on-scroll behavior these plans established was a deliberate feature, and this plan does not remove it for consumers that don't use `header` (see Scope).

## Goal and intent

- Goal: `PLAN_staged_form_header_scrollable_content_20260707` moved `StagedForm`'s `header` prop out of the scroll-visibility overlay so it scrolls with the content — but `StagedFormTimeline` (the step-progress line and labels) is still in the absolutely-positioned, scroll-reactive overlay above it, so it still fades/slides and collapses on scroll. The user wants the timeline to also become part of the scrollable content, exactly like the header now is, and wants the header to render above the timeline (both scrolling together, in that order).
- Business/user intent: consistency. Once the title header stopped being an animated overlay, having the step-progress line right below it still animate independently reads as an inconsistent, half-finished version of the same idea. Both should behave the same way: plain content that scrolls with the form.
- Non-goals:
  - **Do not remove the timeline's collapse-on-scroll behavior for the other five `StagedForm` consumers** (`TaskWorkingSectionsSlidePage`, `QuickTaskAssignSlidePage`, `CustomerCoordinationEmailSlidePage`, `TaskWorkingSectionsReassignSlidePage`, and the dedicated "testing forms" harness covered by `staged-form-scroll-collapse.spec.ts`) — none of them pass a `header` prop, and the collapsing timeline is a deliberate, separately-planned feature for them (`PLAN_staged_form_absolute_timeline_20260606.md`, `PLAN_centralize_staged_form_scroll_visibility_20260615.md`, `PLAN_staged_form_scroll_collapse_20260521.md`). This plan makes the timeline's behavior conditional on whether `header` is present, not global.
  - No change to the footer's edge-aware reveal or the scroll-visibility primitive itself — this plan is scoped entirely to `StagedForm.tsx` and `StagedFormTimeline.tsx`.
  - No change to `TaskCreationStagedFormHeader`, the three task-creation form contents' `header={...}` usage, or `staged-form.types.ts`'s public `header?: ReactNode` prop.

## Scope

- In scope: `packages/ui/src/components/primitives/staged-form/StagedForm.tsx`, `packages/ui/src/components/primitives/staged-form/StagedFormTimeline.tsx`, `packages/ui/src/components/primitives/staged-form/staged-form.types.ts` (one new internal context field), and the Playwright spec covering the three task-creation forms.
- Out of scope: every other `StagedForm` consumer and `staged-form-scroll-collapse.spec.ts` (the dedicated collapse-behavior test harness) — both must continue to work exactly as they do today, unchanged.
- Assumptions: "part of the scroll like the header is" means fully static — no opacity/transform animation, no compact/collapsed state, the timeline just renders at whatever size it always renders at and moves with the scroll like any other content block. This mirrors exactly what `PLAN_staged_form_header_scrollable_content_20260707` did for the header.

## Clarifications required

None. The scoping question (conditional-on-`header` vs. global) is resolved by the user's own framing — they're describing this specifically in relation to "the current header," a feature that only exists for the three task-creation forms, not as a general request to change `StagedForm`'s default behavior for every consumer. Making it global would silently break five other pages and a dedicated test harness for behavior nobody asked to change.

## Design

### Why this can't be "just move the JSX" the way the header was

The header had no internal behavior of its own tied to scroll — it was purely wrapped by `StagedForm` in an animated `<div>`. Moving it out was enough. `StagedFormTimeline` is different: it reads `isTimelineCompact` from `StagedFormContext` and uses it to drive three separate things internally — a CSS-var-driven `opacity`/`transform` on its own root `style`, a `grid-template-rows` collapse on the step-labels row, and a margin change on the progress bar. Relocating the JSX alone would leave all three of those still reacting to `--scroll-hide-progress`, which is written continuously regardless of where in the DOM a consumer sits (CSS custom properties cascade to any descendant of `hideProgressContainerRef`, overlay or not).

### The fix: one new context flag, read only inside `StagedFormTimeline`

Add `isTimelineStatic: boolean` to `StagedFormContextValue`, computed in `StagedForm.tsx` as `Boolean(header)` (i.e., true exactly when the three task-creation forms render it, false for every other consumer — no new prop needed on `StagedForm` itself, it's fully derived from the existing `header` prop). `StagedFormTimeline` combines it with the existing `isTimelineCompact` to derive a single `compact` value used everywhere the component currently reads `isTimelineCompact` directly:

```tsx
const {
  steps, activeStepId, navigationMode, stepStatusMap, onNavigate,
  isTimelineCompact, isTimelineStatic,
} = useStagedFormContext();

const compact = !isTimelineStatic && isTimelineCompact;

// ...
<div
  className="overflow-x-auto scrollbar-none"
  data-compact={compact ? 'true' : 'false'}
  data-testid="staged-form-timeline"
  style={
    isTimelineStatic
      ? undefined
      : {
          opacity: "calc(1 - var(--scroll-hide-progress, 0))",
          transform: "translateY(calc(-100% * var(--scroll-hide-progress, 0)))",
          transition:
            "opacity var(--scroll-snap-duration, 0ms) ease-out, transform var(--scroll-snap-duration, 0ms) ease-out",
        }
  }
>
  {/* ...px-6 wrapper, unchanged... */}
  <div className={cn('grid transition-[grid-template-rows] ...', compact ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}>
    {/* ...unchanged... */}
  </div>
  <div className={cn('relative h-0.5 w-full ...', compact ? 'mt-0' : 'mt-3')}>
    {/* ...unchanged... */}
  </div>
</div>
```

`StagedForm.tsx` itself keeps passing `isTimelineCompact: isCompact` exactly as it does today (unchanged) — it doesn't need any conditional logic of its own for that field. The one new field, `isTimelineStatic`, is the only thing it adds to the context value, and `StagedFormTimeline` does all the "should this actually be compact" reasoning locally. This keeps the change small and keeps `StagedForm.tsx`'s existing behavior for the other five consumers completely untouched — they simply never set `isTimelineStatic` to anything but its default `false`.

### `StagedForm.tsx`: conditional placement

```tsx
const hasHeader = Boolean(header);

// ...

const contextValue = {
  // ...unchanged fields...
  isTimelineCompact: isCompact,
  isTimelineStatic: hasHeader,
  // ...
} as const;

return (
  <StagedFormContext.Provider value={contextValue}>
    <div ref={hideProgressContainerRef} className={cn("relative flex h-full flex-col", className)} data-testid={testId}>
      {!hasHeader ? (
        <div className="absolute inset-x-0 top-0 z-10">
          <StagedFormTimeline />
        </div>
      ) : null}

      <ScrollVisibilityContext.Provider value={{ isHidden: isFooterHidden, reset, suspend }}>
        <div
          ref={scrollRef}
          className={cn(
            "relative flex-1 overflow-x-hidden overflow-y-auto overscroll-y-none",
            hasHeader ? null : STAGED_FORM_TIMELINE_OFFSET_CLASS,
          )}
          style={{ paddingBottom: ... }}
          data-testid="staged-form-scroll-container"
        >
          {hasHeader ? (
            <>
              {header}
              <StagedFormTimeline />
            </>
          ) : null}
          {enableKeyboardAccessory ? (
            <KeyboardAccessoryBar>{stepContent}</KeyboardAccessoryBar>
          ) : (
            stepContent
          )}
        </div>
        {/* footer, unchanged */}
      </ScrollVisibilityContext.Provider>
    </div>
  </StagedFormContext.Provider>
);
```

Two consequences worth calling out explicitly:

1. **The overlay `<div>` disappears entirely when `header` is present** — there's nothing left to put in it, since the timeline moved into the scroll container alongside the header. When `header` is absent, the overlay is rendered exactly as it always has been (unchanged).
2. **`STAGED_FORM_TIMELINE_OFFSET_CLASS` ("pt-14") is only applied when there's no header** — it existed solely to reserve scroll-container space under the fixed overlay. With the timeline no longer overlaid when `header` is present, that reserved space is no longer needed; header and timeline just take up their own natural height as regular content, exactly like any other block.

### `staged-form.types.ts`

Add `isTimelineStatic: boolean;` to `StagedFormContextValue`, next to the existing `isTimelineCompact: boolean;`.

## Contracts and skills

### Contracts loaded

- `architecture/36_scroll_visibility.md`: same governing contract as every plan in this lineage; the "Local pattern" section's `StagedForm` bullets need a small addition noting the timeline is static (not scroll-reactive) specifically when a `header` is supplied.
- `architecture/07_components.md`: unaffected — `StagedFormTimeline` remains a primitive reading from `StagedFormContext`, no new external props.

### Local extensions loaded

- None found.

### File read intent — pattern vs. relational

- Re-read `StagedForm.tsx`, `StagedFormTimeline.tsx`, `StagedFormContext.tsx`, and `staged-form.types.ts` in their current (post-header-plan) state — relational: these are exactly the files being modified; understanding their present behavior is the basis for this plan.
- Grepped every usage of `isTimelineCompact` across `packages/` — relational: confirmed it is read only inside `StagedFormTimeline.tsx` and set only inside `StagedForm.tsx`, so extending its meaning via a paired `isTimelineStatic` flag cannot have any effect outside these two files.
- Read `staged-form-scroll-collapse.spec.ts` in full (its `beforeEach` and `openTestingForms`/`openInternalTaskAssignmentStep` helpers) — relational: confirmed the bulk of that spec drives a dedicated "testing forms" harness (`task-creation-fab` → "open testing forms" → `testing-forms-form`), a `StagedForm` consumer that does **not** pass `header` — so it is entirely unaffected by this plan's conditional. Only `openInternalTaskAssignmentStep` touches a real task-creation form, and that helper is only used for one test in that file (worth a final grep-confirm during implementation that no other test in the file relies on it).
- Read `task-creation-form-flow.spec.ts`'s `data-compact` assertions (lines 119–130) — relational, and surfaced a pre-existing issue: the test titled *"internal task footer reveals at the bottom edge..."* asserts `staged-form-timeline`'s `data-compact` attribute, not anything about the footer. This looks like a mislabeled/misdirected assertion from the prior decoupling plan (whose own summary notes Playwright was never actually run to catch it). This plan's implementation step 5 corrects it rather than further calcifying a check that doesn't test what its name claims.

### Skill selection

- Primary skill: `skills/cross_cutting/planning_contract_selection/SKILL.md`
- Trigger terms: `staged form`, `timeline`, `scroll content`, `compact`
- Excluded alternatives: none.

## Implementation plan

1. **`packages/ui/src/components/primitives/staged-form/staged-form.types.ts`** — add `isTimelineStatic: boolean;` to `StagedFormContextValue`, next to `isTimelineCompact: boolean;`.

2. **`packages/ui/src/components/primitives/staged-form/StagedFormTimeline.tsx`**:
   - Destructure `isTimelineStatic` alongside the existing `isTimelineCompact`.
   - Add `const compact = !isTimelineStatic && isTimelineCompact;` and replace every remaining direct use of `isTimelineCompact` in the JSX (`data-compact`, the two `cn(...)` conditionals) with `compact`.
   - Change the root `<div>`'s `style` prop to `isTimelineStatic ? undefined : { ...existing opacity/transform/transition object... }`.

3. **`packages/ui/src/components/primitives/staged-form/StagedForm.tsx`**:
   - Add `const hasHeader = Boolean(header);` near the existing `hasFooter` derivation.
   - Add `isTimelineStatic: hasHeader` to `contextValue` (keep `isTimelineCompact: isCompact` exactly as-is).
   - Wrap the existing absolute overlay `<div>` (containing `<StagedFormTimeline />`) in `{!hasHeader ? (...) : null}`.
   - Change the scroll container's `className` to only include `STAGED_FORM_TIMELINE_OFFSET_CLASS` when `!hasHeader` (e.g. `hasHeader ? null : STAGED_FORM_TIMELINE_OFFSET_CLASS` passed to `cn(...)`).
   - Inside the scroll container, replace the current unconditional `{header}` with `{hasHeader ? (<>{header}<StagedFormTimeline /></>) : null}`, placed exactly where `{header}` currently sits (immediately before the `enableKeyboardAccessory ? ... : stepContent` expression).

4. **`architecture/36_scroll_visibility.md`** — under "`StagedForm` — built-in scroll hide", add a short note: when a `header` is supplied, the step timeline also renders as static scrollable content (not the collapsing/animated overlay) directly below the header; when no `header` is supplied, the timeline keeps its existing collapsing-overlay behavior unchanged.

5. **`apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/task_creation/task-creation-form-flow.spec.ts`** — fix the test at lines 113–131:
   - Its title ("internal task footer reveals at the bottom edge and hides again after scrolling back up") describes footer behavior, but its body only ever asserts `staged-form-timeline`'s `data-compact` attribute — that assertion is not testing what the title says, and additionally will now always read `"false"` (the timeline is static for this form). Replace those `data-compact` assertions with a new assertion that `staged-form-timeline` never has `data-compact="true"` at any point during the same scroll sequence (i.e., confirms the timeline stays static), and add the assertion the title actually describes: locate the form's footer element (add a stable `data-testid` to `TaskCreationAssignmentFooter`'s root `<div>` if one doesn't already exist) and assert it becomes visible/interactive at the bottom edge, then hides again after scrolling back up past `hideThreshold` — mirroring the footer-reveal assertions already validated for `StagedForm`'s footer in `staged-form-scroll-collapse.spec.ts`.

## Risks and mitigations

- Risk: Forgetting the `!hasHeader` guard on the absolute overlay `<div>` would render `StagedFormTimeline` **twice** (once in the overlay, once inline) whenever `header` is present.
  Mitigation: The guard is an explicit, single-line implementation step; the manual smoke check below would immediately show a duplicated timeline if missed.
- Risk: Other `StagedForm` consumers regress if `isTimelineStatic` is accidentally set to something other than `false` by default, or if the `compact` derivation is inverted.
  Mitigation: `isTimelineStatic` is only ever set via `hasHeader = Boolean(header)`, which is `false` for all five other consumers (none of them pass `header`) — their `contextValue.isTimelineStatic` is `false`, so `compact = !false && isTimelineCompact = isTimelineCompact`, identical to today's behavior. Confirm with `staged-form-scroll-collapse.spec.ts` (unmodified) continuing to pass.
- Risk: The corrected Playwright test (step 5) needs a stable selector for the footer, which may not currently exist on `TaskCreationAssignmentFooter`'s root element.
  Mitigation: Adding a `data-testid` to a component root is a low-risk, additive change; confirm no existing test already expects the absence of one before adding it.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/ui`.
- Manual smoke check: open each of the Internal Task, Pre-Order, and Return creation forms. Confirm the title header renders first, the step-progress timeline renders directly below it, both as plain scrollable content — scrolling the step moves both away together with no fade/slide/collapse animation, and both reappear naturally on scroll-up. Confirm the footer still reveals at the bottom edge and hides again correctly (unaffected by this plan).
- Manual smoke check: open the "testing forms" harness (or any of `TaskWorkingSectionsSlidePage` / `QuickTaskAssignSlidePage` / `CustomerCoordinationEmailSlidePage`) and confirm the timeline's existing collapse-on-scroll behavior is completely unchanged.
- `npx playwright test --grep "staged-form-scroll-collapse" --project=mobile` and `--project=desktop`: must pass unmodified — this is the primary regression guard that the other five consumers are untouched.
- `npx playwright test --grep "task-creation-form-flow" --project=mobile` and `--project=desktop`: run the corrected spec from implementation step 5.

## Review log

- `2026-07-07` `Claude (planning)`: Authored as a follow-up after the user reported, post-implementation of `PLAN_staged_form_header_scrollable_content_20260707`, that the step timeline still animates on scroll and should become static scrollable content like the header, positioned above it. Investigated blast radius before committing to an approach: found the timeline's collapse-on-scroll is a deliberately-planned feature for five other `StagedForm` consumers (three prior archived plans) with dedicated Playwright coverage (`staged-form-scroll-collapse.spec.ts`), so scoped this change to be conditional on `header` being present rather than global. Also found and flagged a pre-existing mislabeled test assertion (checks the timeline, not the footer, despite its title) while reading the file this plan needs to touch anyway.
- `2026-07-07` `Codex (implementation)`: Implemented the conditional inline timeline rendering for header-backed staged forms, updated the task-creation footer/timeline regression test, passed `npm run typecheck`, and wrote `docs/architecture/implemented_summaries/SUMMARY_PLAN_staged_form_timeline_scrollable_content_20260707.md`.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `Codex`
