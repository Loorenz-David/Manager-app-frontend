# ARCHIVE_upholstery_amount_without_selection_20260617_1308

## Metadata

- Archive ID: `ARCHIVE_upholstery_amount_without_selection_20260617_1308`
- Archived at (UTC): `2026-06-17T13:08:17Z`
- Owner agent: `Codex`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_amount_without_selection_20260617.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_upholstery_amount_without_selection_20260617.md`

## Outcome

- Managers can submit upholstery amount meters without selecting an upholstery, preserving quantity data in the task-creation payload.
- Shared task upholstery parsing now accepts null upholstery IDs returned by the backend.
- Workers are blocked from starting Sewing or Upholstery Installation steps when no upholstery has been assigned, with a dedicated warning sheet that can show the reserved amount.

## Validation

- `npm run typecheck`: pass.

## Notes

- Runtime and e2e tests were not run in this lifecycle pass.
