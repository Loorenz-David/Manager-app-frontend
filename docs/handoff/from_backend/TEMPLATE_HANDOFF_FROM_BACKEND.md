# HANDOFF_FROM_BACKEND_<slug>_<YYYYMMDD>

## Metadata

- Handoff ID: `HANDOFF_FROM_BACKEND_<slug>_<YYYYMMDD>`
- Received at (UTC): `<YYYY-MM-DDTHH:MM:SSZ>`
- Receiving agent: `<agent_name>`
- Backend source plan: `<backend/docs/architecture/under_construction/PLAN_<...>.md>`
- Backend source summary: `<backend/docs/architecture/implemented_summaries/SUMMARY_<...>.md>`

## Backend delivery context

- What backend implemented:
- API or contract changes:
- Socket event changes (if any):
- Feature flags/toggles (if any):

## Frontend action required

1. `<required frontend change>`
2. `<required frontend validation>`

## Interface details

- Endpoint(s):
- Request shape:
- Response shape:
- Error cases:
- Socket events (if applicable):

## Frontend contract implications

- Architecture contracts affected:
  - `architecture/<file.md>`: `<reason>`
- Local extension updates needed:
  - `architecture/<file_local.md>`

## Validation notes

- Backend validation run:
- Required frontend runtime validation: `npx playwright test --grep <feature>`

## Trace links

- Originating frontend request: `docs/handoff/to_backend/HANDOFF_TO_BACKEND_<...>.md`
- Related frontend plan: `docs/architecture/under_construction/PLAN_<...>.md`
- Related debug plan (optional):
