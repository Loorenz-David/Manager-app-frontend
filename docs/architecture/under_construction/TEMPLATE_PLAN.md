# PLAN_<slug>_<YYYYMMDD>

> Note: prefer the subfolder templates for new plans — `implementation/TEMPLATE_PLAN.md` for HOW plans, `intention/TEMPLATE_INTENTION_PLAN.md` for WHAT/WHY plans. This root template is kept for backward compatibility.

## Metadata

- Plan ID: `PLAN_<slug>_<YYYYMMDD>`
- Status: `under_construction`
- Owner agent: `<agent_name>`
- Created at (UTC): `<YYYY-MM-DDTHH:MM:SSZ>`
- Last updated at (UTC): `<YYYY-MM-DDTHH:MM:SSZ>`
- Related issue/ticket: `<id_or_link>`

## Goal and intent

- Goal:
- Business/user intent:
- Non-goals:

## Scope

- In scope:
- Out of scope:
- Assumptions:

## File manifest

List every file touched by this plan. Implementing agents use this table to know what
to open (EDIT) versus what to create from scratch (CREATE). Never search for CREATE files
— they do not exist yet.

### Existing files to edit

| Path (relative to `src/`) | Change summary |
|---|---|
| `features/<domain>/<path/to/file.ts>` | `<one-line description of what changes>` |

### New files to create

| Path (relative to `src/`) |
|---|
| `features/<domain>/<path/to/file.ts>` |

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
