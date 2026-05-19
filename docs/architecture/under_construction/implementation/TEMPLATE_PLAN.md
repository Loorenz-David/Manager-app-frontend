# PLAN_<slug>_<YYYYMMDD>

## Metadata

- Plan ID: `PLAN_<slug>_<YYYYMMDD>`
- Status: `under_construction`
- Owner agent: `<agent_name>`
- Created at (UTC): `<YYYY-MM-DDTHH:MM:SSZ>`
- Last updated at (UTC): `<YYYY-MM-DDTHH:MM:SSZ>`
- Related issue/ticket: `<id_or_link>`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_<slug>_<YYYYMMDD>.md`

## Goal and intent

- Goal:
- Business/user intent:
- Non-goals:

## Scope

- In scope:
- Out of scope:
- Assumptions:

## Clarifications required

- [ ] `<question>` — why this blocks safe implementation
- [ ] `<question>` — why this blocks safe implementation

## Acceptance criteria

1. `<measurable outcome>`
2. `<measurable outcome>`

## Contracts and skills

### Contracts loaded

- `architecture/<file.md>`: `<reason>`

### Local extensions loaded

- `architecture/<file_local.md>`: `<delta used>`

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Prohibited (pattern reads — contract already covers these):
- Reading another action hook to understand cache snapshot / rollback shape → `08_hooks.md`
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another controller to understand aggregation shape → `08_hooks.md`
- Reading another provider to understand context shell → `23_providers.md`
- Reading another DTO file to understand view model transformer shape → `24_dto.md`

Permitted (relational reads — understanding what exists):
- Reading an existing query hook to see what data it currently returns
- Reading `types.ts` for exact field names and Zod schemas
- Reading `api/<entity>-keys.ts` files to verify query key structure
- Reading `index.ts` (public API) to verify what is exported
- Reading related feature files to understand how existing logic connects

### Skill selection

- Primary skill: `skills/<skill_name>/SKILL.md`
- Trigger terms: `<term1, term2>`
- Excluded alternatives: `<skill path>` — `<why excluded>`

## Implementation plan

1. `<step>`
2. `<step>`
3. `<step>`

## Risks and mitigations

- Risk: `<risk>`
  Mitigation: `<mitigation>`

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep <scope>`: `<expected result>`
- `npx playwright test --grep <feature> --project=mobile`: `<expected result>`
- `npx playwright test --grep <feature> --project=desktop`: `<expected result>`

## Review log

- `<YYYY-MM-DD>` `<reviewer>`: `<feedback>`
- `<YYYY-MM-DD>` `<owner>`: `<correction applied>`

## Lifecycle transition

- Current state: `under_construction`
- Next state: `<approved | debugging>`
- Transition owner: `<agent_name>`
