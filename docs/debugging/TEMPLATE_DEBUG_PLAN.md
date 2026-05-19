# DEBUG_<parent_slug>_<ticket_or_issue>_<YYYYMMDD>

## Metadata

- Debug ID: `DEBUG_<parent_slug>_<ticket_or_issue>_<YYYYMMDD>`
- Status: `debugging`
- Owner agent: `<agent_name>`
- Created at (UTC): `<YYYY-MM-DDTHH:MM:SSZ>`
- Parent plan: `docs/architecture/under_construction/PLAN_<slug>_<YYYYMMDD>.md`
- Parent summary: `docs/architecture/implemented_summaries/SUMMARY_<slug>_<YYYYMMDD>.md`
- Issue reference: `<incident/ticket/link>`
- Debug iteration: `<1..n>`

## Problem statement

- Observed behavior:
- Expected behavior:
- Impact scope:

## Reproduction

1. `<step>`
2. `<step>`
3. `<step>`

## Hypotheses

- `<hypothesis>`
- `<hypothesis>`

## Debug implementation plan

1. `<step>`
2. `<step>`

## Validation and regression checks

- `npm run typecheck`: `<expected result>`
- `npm run test -- --grep <scope>`: `<expected result>`
- `npx playwright test --grep <feature> --project=mobile`: `<expected result>`

## Contracts and skills

- Contracts loaded:
  - `architecture/<file.md>`: `<reason>`
- Skill used:
  - `skills/<skill_name>/SKILL.md`

## Lifecycle transition

- Current state: `debugging`
- Next state: `<implemented | summarized | archived>`
- Next artifact target: `<path>`
