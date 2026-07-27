# SUMMARY_PLAN_staged_form_manual_footer_edge_offset_20260707

## Metadata

- Summary ID: `SUMMARY_PLAN_staged_form_manual_footer_edge_offset_20260707`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T10:37:42Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_staged_form_manual_footer_edge_offset_20260707.md`
- Related debug plan (optional): `—`

## What was implemented

- Added an optional `footerEdgeOffset` prop to `StagedForm` so footer edge reveal can use a fixed manual threshold instead of always following the live measured footer height.
- Updated `StagedForm` to pass `footerEdgeOffset ?? footerHeight` into its internal `useScrollHide()` call, while leaving the measured `footerHeight` path unchanged for scroll-container bottom padding.
- Exported `TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX = 90` from `TaskCreationAssignmentFooter.tsx` and wired that constant into the Internal, Pre-Order, and Return task-creation forms.
- Updated the scroll-visibility contract to document that staged-form footer edge reveal defaults to measured height but can be overridden by `footerEdgeOffset`.

## Files changed

- `packages/ui/src/components/primitives/staged-form/staged-form.types.ts`: added the optional `footerEdgeOffset` prop.
- `packages/ui/src/components/primitives/staged-form/StagedForm.tsx`: switched footer edge-reveal threshold selection to `footerEdgeOffset ?? footerHeight`.
- `packages/task-creation/src/components/TaskCreationAssignmentFooter.tsx`: exported the task-creation footer edge-offset constant.
- `packages/task-creation/src/components/InternalFormContent.tsx`: passed the task-creation footer edge-offset constant to `StagedForm`.
- `packages/task-creation/src/components/PreOrderFormContent.tsx`: passed the task-creation footer edge-offset constant to `StagedForm`.
- `packages/task-creation/src/components/ReturnFormContent.tsx`: passed the task-creation footer edge-offset constant to `StagedForm`.
- `architecture/36_scroll_visibility.md`: documented the staged-form footer override behavior.

## Deviations from plan

- The constant value was set to `90` based on the existing manual-offset precedent already in the codebase (`TaskDetailSlidePage`) rather than from a fresh runtime measurement in this pass, because no browser measurement step was executed here.

## Contract adherence

- `architecture/36_scroll_visibility.md`: the staged-form section now documents both the default measured-height behavior and the manual override path.
- `task_system/frontend_contract_goal_mapping_guide.md`: implementation was limited to the scoped staged-form primitive, its task-creation consumers, and the contract file.

## Validation evidence

- `npm run typecheck`: pass
- Playwright: not run in this pass
- Manual runtime validation: not run in this pass

## Known gaps or deferred items

- The `TASK_CREATION_ASSIGNMENT_FOOTER_EDGE_OFFSET_PX` value was not visually re-tuned in-browser during this pass.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
