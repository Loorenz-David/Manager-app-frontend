# Debugging Nested Plan Loop

## Intent

Run debug-stage planning as a nested lifecycle linked to an implemented parent plan.

## Trigger conditions

- Defect reported after a plan has already been implemented.
- Regression, incident, or missing acceptance criterion found post-delivery.

## Required inputs

- Parent plan path
- Parent summary path
- Issue/ticket reference
- Observed behavior and expected behavior

## Contracts to load

- `architecture/13_errors.md`: error and failure modeling
- `architecture/17_testing.md`: regression test expectations
- `architecture/34_runtime_validation.md`: runtime diagnostics, console error detection,
  Playwright trace and screenshot artifacts

## Execution protocol

1. Create debug plan in `docs/debugging/` using `TEMPLATE_DEBUG_PLAN.md`,
   with parent plan and parent summary references in the metadata.
2. Clarify reproduction conditions and acceptance criteria for the fix.
3. Review debug plan and get approval.
4. Implement fix and add regression coverage (Vitest unit + Playwright runtime).
5. Write debug summary under `docs/architecture/implemented_summaries/`.
6. Archive debug plan with links to parent plan and debug summary.

## Output format

- Debug plan path: `docs/debugging/DEBUG_<parent_slug>_<ticket>_<YYYYMMDD>.md`
- Summary path: `docs/architecture/implemented_summaries/SUMMARY_<slug>_<YYYYMMDD>.md`

## Done criteria

- Parent-child traceability is complete.
- Fix is validated with regression evidence (typecheck + Vitest + Playwright).
- Debug artifacts are archived with references.

## Quality gate

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep <scope>`: relevant Vitest tests pass
- `npx playwright test --grep <feature> --project=mobile`: no regressions
