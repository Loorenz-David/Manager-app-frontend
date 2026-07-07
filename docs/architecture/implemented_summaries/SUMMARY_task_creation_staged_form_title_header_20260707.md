# SUMMARY_task_creation_staged_form_title_header_20260707

## Metadata

- Summary ID: `SUMMARY_task_creation_staged_form_title_header_20260707`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_20260707.md`
- Implemented at (UTC): `2026-07-07T07:43:45Z`

## Implementation summary

- Added an optional `header` slot to `StagedForm` and wired it to the same CSS-var-driven hide/show animation used by the built-in timeline and footer.
- Extended the relative-mode scroll-visibility primitive with an opt-in edge-reveal override so a hidden local element can force itself visible near the physical top or bottom of a scroll container.
- Enabled bottom-edge reveal inside `StagedForm` using the measured footer height so footer navigation becomes reachable again at the end of long steps even without a direction reversal.
- Added a shared `TaskCreationStagedFormHeader` component and attached it to the Internal Task, Pre-Order, and Return manager task-creation forms.
- Documented the new `useScrollHide()` edge-reveal option and the `StagedForm` header/footer behavior in `architecture/36_scroll_visibility.md`.

## Verification

- `npm run typecheck`: passed.

## Notes

- `npx playwright test --project=mobile` was not run in this pass.
