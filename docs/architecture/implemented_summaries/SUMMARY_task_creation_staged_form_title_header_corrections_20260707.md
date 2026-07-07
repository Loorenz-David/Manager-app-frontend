# SUMMARY_task_creation_staged_form_title_header_corrections_20260707

## Metadata

- Summary ID: `SUMMARY_task_creation_staged_form_title_header_corrections_20260707`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_creation_staged_form_title_header_corrections_20260707.md`
- Implemented at (UTC): `2026-07-07T08:09:48Z`

## Implementation summary

- Stabilized the relative-mode edge-reveal implementation by reading `revealAtEdge` and `edgeOffset` through refs inside `useScrollState()` and `useScrollVisibility()`, preventing footer-height churn from recreating scroll handlers and reinitializing visibility state.
- Narrowed `useScrollHide()` back to exposing only `revealAtEdge` and `edgeOffset`, keeping threshold and mode customization on the lower-level `useScrollVisibility()` API.
- Aligned `StagedForm` with the original design by enabling bottom-edge reveal only when the form actually has a footer or navigation.
- Tightened `architecture/36_scroll_visibility.md` so the `useScrollHide()` docs describe only the two additive edge-reveal fields.
- Added regression coverage for the shared state machine plus targeted Playwright specs around staged-form collapse and task-creation bottom-edge reveal.
- Excluded `packages/ui` test files from that package's direct TypeScript build, matching the package-level convention already used elsewhere and avoiding `vitest` type conflicts during `npm run typecheck`.

## Verification

- `npm run typecheck`: passed.

## Notes

- `packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.test.ts` was added, but no Vitest command was run in this pass.
- The Playwright specs were updated, but `npx playwright test` was not run in this pass.
