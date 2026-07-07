# PLAN_staged_form_manual_footer_edge_offset_20260707

## Metadata

- Plan ID: `PLAN_staged_form_manual_footer_edge_offset_20260707`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T00:00:00Z`
- Last updated at (UTC): `2026-07-07T10:37:42Z`
- Related issue/ticket: `—`
- Intention plan: `—` (follow-up request after reviewing the implemented prior plans)
- Prior plans in this lineage: `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_20260707.md`, `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_corrections_20260707.md`, `docs/architecture/archives/implementation/PLAN_staged_form_footer_edge_reveal_decoupling_20260707.md`, `docs/architecture/archives/implementation/PLAN_staged_form_header_scrollable_content_20260707.md`, `docs/architecture/archives/implementation/PLAN_staged_form_timeline_scrollable_content_20260707.md`

## Goal and intent

- Goal: `StagedForm.tsx` currently derives its footer's edge-reveal threshold (`edgeOffset`, passed to `useScrollHide()`) exclusively from `footerHeight` — a value measured live via `ResizeObserver` on the rendered footer element. Add the ability to set this value manually instead, the same way `TaskDetailSlidePage.tsx`'s standalone `useScrollHide()` call already does with its `BOTTOM_ACTIONS_EDGE_OFFSET_PX` constant.
- Business/user intent: a fixed, manually-chosen threshold is simpler and more predictable than one that tracks a footer's live rendered height — especially for `TaskCreationAssignmentFooter`, whose height genuinely varies (it grows when the working-sections shortcut bar is shown on the assignment step). A manual value gives a consistent, known reveal distance regardless of which sub-elements of the footer happen to be rendered at any given moment, matching the approach already proven out in `TaskDetailSlidePage`.
- Non-goals:
  - **Not a breaking change.** `StagedForm` is a shared primitive with six consumers; only the three task-creation forms (Internal, Pre-Order, Return) are being switched to a manual value. The other three consumers (`TaskWorkingSectionsSlidePage`, `QuickTaskAssignSlidePage`, `CustomerCoordinationEmailSlidePage`) keep the existing auto-measured behavior — they were never reported as having an issue, and their footers don't have the shortcut-bar-driven height variability that motivated this change.
  - No change to `paddingBottom`'s calculation — it keeps using the live-measured `footerHeight` exactly as today. A manual `edgeOffset` only changes *when the reveal triggers*; it does not change how much scroll-container space is reserved for the footer, so there is no risk of step content being clipped behind the footer even if the manual value under- or over-estimates the footer's real height.
  - No change to the scroll-visibility primitive itself (`use-scroll-state.ts`, `use-scroll-progress-css-var.ts`, `use-scroll-visibility.ts`) — `edgeOffset` is already a plain `number` option there; this plan only changes *what value* `StagedForm` computes and passes in, not how the primitive consumes it.

## Scope

- In scope:
  - `packages/ui/src/components/primitives/staged-form/staged-form.types.ts` (new optional `footerEdgeOffset?: number` prop).
  - `packages/ui/src/components/primitives/staged-form/StagedForm.tsx` (use it when provided, fall back to the existing measured `footerHeight` otherwise).
  - `packages/task-creation/src/components/TaskCreationAssignmentFooter.tsx` (export a shared constant for the manual value, co-located with the component whose height it represents).
  - `packages/task-creation/src/components/InternalFormContent.tsx`, `PreOrderFormContent.tsx`, `ReturnFormContent.tsx` (pass the new prop).
  - `architecture/36_scroll_visibility.md` (document the new prop).
- Out of scope: the three other `StagedForm` consumers — they continue to omit `footerEdgeOffset` and keep today's auto-measured behavior, unchanged.
- Assumptions: an exact pixel value for `TaskCreationAssignmentFooter`'s manual offset cannot be derived from source alone (no browser measurement available in this planning pass) — see Risks for how this is handled honestly rather than presented as a precise figure.

## Clarifications required

None. This is an additive, backward-compatible capability applied to the three consumers whose footer height variability motivated the request; the other three consumers are explicitly left alone per their own established behavior.

## Design

### Why fall back rather than require

`footerHeight` (via `ResizeObserver`) remains the only source of truth for `paddingBottom` — that must always match the footer's *actual* rendered height or content could be clipped behind it, for any consumer, including ones that never set `footerEdgeOffset`. Making the new prop optional with a fallback (`footerEdgeOffset ?? footerHeight`) means the three consumers who don't need this get the exact behavior they have today, with zero risk of a silent behavior change from adding the prop to the shared primitive.

```ts
// StagedForm.tsx
const {
  scrollRef,
  hideProgressContainerRef,
  isHidden: isCompact,
  isAtEdge,
  reset,
  suspend,
} = useScrollHide({
  revealAtEdge: hasFooter ? "bottom" : undefined,
  edgeOffset: footerEdgeOffset ?? footerHeight,
});
```

### Where the manual value lives

`TaskCreationAssignmentFooter.tsx` is the component whose height this value approximates, so the constant is exported from there rather than duplicated across the three form-content files that use it:

```ts
// TaskCreationAssignmentFooter.tsx
/**
 * Manual edge-reveal threshold for StagedForm's footer, used instead of the
 * live-measured footer height. TaskCreationAssignmentFooter's real height varies
 * (it grows when the working-sections shortcut bar renders on the assignment
 * step) — a fixed value gives a predictable reveal distance regardless of which
 * of its sub-elements happen to be visible. Does not affect the scroll
 * container's reserved padding, which still tracks the real measured height.
 */
export const TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX = 152;
```

Each of `InternalFormContent.tsx`, `PreOrderFormContent.tsx`, `ReturnFormContent.tsx` imports it and passes it straight through:

```tsx
<StagedForm
  ...
  footer={<TaskCreationAssignmentFooter ... />}
  footerEdgeOffset={TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX}
  ...
>
```

## Contracts and skills

### Contracts loaded

- `architecture/36_scroll_visibility.md`: same governing contract as every plan in this lineage; needs a short addition documenting that `StagedForm`'s footer edge-reveal threshold can be overridden manually via `footerEdgeOffset`, mirroring the manual-constant pattern already documented for the local pattern (`TaskDetailSlidePage`'s `useScrollHide()` usage).

### Local extensions loaded

- None found.

### File read intent — pattern vs. relational

- Re-read `StagedForm.tsx` in its current (post-timeline-plan) state — relational: confirmed exactly where `footerHeight` currently feeds into `useScrollHide()`'s `edgeOffset` and that `paddingBottom` is a separate, independent use of the same measured value.
- Re-read `TaskCreationAssignmentFooter.tsx` and `StagedFormNavigation.tsx` — relational: confirmed the footer's rendered height is genuinely variable (base nav row plus a conditional working-sections shortcut bar on the assignment step), which is the concrete reason a fixed value is preferable to a live-tracked one for this specific consumer, not just a stylistic preference.
- Re-read `TaskDetailSlidePage.tsx`'s `BOTTOM_ACTIONS_EDGE_OFFSET_PX` usage (from the prior Goal 2 plan) as the direct precedent this plan mirrors.

### Skill selection

- Primary skill: `skills/cross_cutting/planning_contract_selection/SKILL.md`
- Trigger terms: `staged form`, `edge offset`, `manual`, `footer`
- Excluded alternatives: none.

## Implementation plan

1. **`packages/ui/src/components/primitives/staged-form/staged-form.types.ts`** — add to `StagedFormProps`:
   ```ts
   /**
    * Manual override for the footer's bottom-edge-reveal threshold (passed as
    * `edgeOffset` to the internal `useScrollHide()` call). When omitted, falls
    * back to the footer's live-measured height via ResizeObserver (existing
    * behavior). Use this when the footer's rendered height varies and a fixed,
    * predictable reveal distance is preferable to one that tracks it live.
    */
   footerEdgeOffset?: number;
   ```

2. **`packages/ui/src/components/primitives/staged-form/StagedForm.tsx`**:
   - Destructure `footerEdgeOffset` from props.
   - Change `edgeOffset: footerHeight` to `edgeOffset: footerEdgeOffset ?? footerHeight` in the `useScrollHide(...)` call.
   - No other changes — `footerHeight` state, the `ResizeObserver` wiring, and `paddingBottom`'s calculation are all untouched.

3. **`packages/task-creation/src/components/TaskCreationAssignmentFooter.tsx`** — export `TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX` as shown in the Design section. Pick the exact number during implementation by measuring the component's actual rendered height in both states (shortcut bar shown and hidden) rather than reusing `TaskDetailSlidePage`'s `152` by coincidence — see Risks.

4. **`packages/task-creation/src/components/InternalFormContent.tsx`, `PreOrderFormContent.tsx`, `ReturnFormContent.tsx`** — import `TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX` and pass `footerEdgeOffset={TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX}` to each `<StagedForm ...>` call, alongside the existing `footer={<TaskCreationAssignmentFooter .../>}`.

5. **`architecture/36_scroll_visibility.md`** — under the existing `StagedForm` bullets, add a short note: the footer's edge-reveal threshold defaults to the live-measured footer height, but can be overridden with `footerEdgeOffset` for footers with variable content, matching the manual-constant convention already used by standalone local-pattern consumers like `TaskDetailSlidePage`.

## Risks and mitigations

- Risk: I don't have a way to measure `TaskCreationAssignmentFooter`'s actual rendered pixel height from source alone, so `152` (or any other number I could suggest) would be a guess presented with false precision, not a verified measurement.
  Mitigation: Implementation step 3 explicitly calls for measuring the real component (both with and without the shortcut bar visible) rather than trusting a number carried over from a different component with different content. This is a case where the plan defines the *mechanism* precisely but leaves the *constant's value* to be measured at implementation time, same as any other visual-tuning detail.
- Risk: A manual value that's too small would make the reveal engage later than the footer's actual height requires, meaning the very bottom of the scrollable content sits behind the (still-hidden) footer for a moment before the reveal catches up.
  Mitigation: `paddingBottom` (reserved scroll space) is unaffected by this change and still matches the *real* footer height exactly — so this risk is purely about reveal *timing* being a bit late relative to the ideal, never about actual content clipping. Bias the chosen constant toward the larger end of the footer's observed height range (i.e. the shortcut-bar-visible state) to minimize this.
- Risk: If `TaskCreationAssignmentFooter`'s markup changes later (new content, different padding), the manual constant could drift out of sync with the component's real height without anyone noticing, since nothing enforces the relationship.
  Mitigation: The constant is exported from the same file as the component it describes, with a doc comment explaining what it represents — the next person touching that file's markup has the explanation right next to what they're changing.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/ui` and `@beyo/task-creation`.
- Manual smoke check: open each of the Internal Task, Pre-Order, and Return creation forms, navigate to the Assignment step (with a major category that has available working sections, so the shortcut bar renders), and scroll to the bottom both with and without the shortcut bar visible. Confirm the footer reveals at a consistent, similar scroll distance from the bottom in both cases (rather than the reveal point shifting based on whether the shortcut bar happens to be showing, which is what the live-measured value would do).
- Manual smoke check: open `TaskWorkingSectionsSlidePage`, `QuickTaskAssignSlidePage`, or `CustomerCoordinationEmailSlidePage` and confirm their footer edge-reveal behavior is completely unchanged (still driven by live-measured height, since none of them pass `footerEdgeOffset`).
- `npx playwright test --grep "task-creation-form-flow" --project=mobile` and `--project=desktop`: the existing footer-reveal-at-bottom-edge assertion (added by the decoupling plan, corrected by the timeline plan) should continue to pass — it checks that the footer becomes visible near the bottom, not a specific pixel distance, so it is not expected to need changes, but confirm rather than assume.

## Review log

- `2026-07-07` `Claude (planning)`: Authored directly from a follow-up user request, comparing `StagedForm`'s auto-measured footer edge-offset to `TaskDetailSlidePage`'s manual constant and asking for the same manual-override capability. Scoped as an additive, opt-in prop rather than a change to the shared primitive's default behavior, since `StagedForm`'s other three consumers were never reported as having an issue with the auto-measured approach.
- `2026-07-07` `Codex (implementation)`: Added `footerEdgeOffset` to `StagedForm`, wired the task-creation forms to a shared manual footer edge-offset constant, updated the scroll-visibility contract note, passed `npm run typecheck`, and wrote `docs/architecture/implemented_summaries/SUMMARY_PLAN_staged_form_manual_footer_edge_offset_20260707.md`.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `Codex`
