# SUMMARY_PLAN_cases_refactor_pills_corrections_20260622

## Metadata

- Summary ID: `SUMMARY_PLAN_cases_refactor_pills_corrections_20260622`
- Source plan: `docs/architecture/archives/implementation/PLAN_cases_refactor_pills_corrections_20260622.md`
- Implemented at (UTC): `2026-06-22T12:27:40Z`

## Implementation summary

- Removed the remaining `Cases` page title from the cases header and moved the date-format helpers into `CasesHeader`, so the date label is header-owned and the view no longer computes it.
- Corrected the cases controller so unread-count requests only include open and resolving cases, and pill direction only updates when the selected pill actually changes.
- Updated the managers Playwright cases spec to match the pill-based UI, including state-aware list mocks, new `cases-list-body-*` selectors, the `In-Progress` state-action label, and a dedicated pill-switch smoke test.

## Verification

- `npm run typecheck`: passed.

## Notes

- Playwright specs were updated but not executed in this pass.
