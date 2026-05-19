# SUMMARY_<slug>_<YYYYMMDD>

## Metadata

- Summary ID: `SUMMARY_<slug>_<YYYYMMDD>`
- Status: `implemented` or `summarized`
- Owner agent: `<agent_name>`
- Created at (UTC): `<YYYY-MM-DDTHH:MM:SSZ>`
- Source plan: `docs/architecture/under_construction/PLAN_<slug>_<YYYYMMDD>.md`
- Related debug plan (optional): `docs/debugging/DEBUG_<...>.md`

## What was implemented

- `<change 1>`
- `<change 2>`

## Files changed

- `src/<path/to/file.ts>`: `<what changed>`
- `src/<path/to/file.ts>`: `<what changed>`

## Contract adherence

- `architecture/<contract.md>`: `<how it was respected>`

## Validation evidence

- `npm run typecheck`: `<pass/fail>`
- `npm run test`: `<pass/fail + notes>`
- `npx playwright test --project=mobile`: `<pass/fail + notes>`
- `npx playwright test --project=desktop`: `<pass/fail + notes>`

## Known gaps or deferred items

- `<item>`: `<reason + planned follow-up>`

## Handoff notes (if needed)

- To backend: `docs/handoff/to_backend/<file>.md`
- From backend dependency: `docs/handoff/from_backend/<file>.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_<slug>_<YYYYMMDD_HHMM>.md`
