# Planning Contract Selection

## Intent

Select the minimum sufficient frontend contracts for a requested task and define
a safe implementation plan before coding.

## Trigger conditions

- Use when task intent is broad or partially ambiguous.
- Use when multiple domains or layers may be involved.
- Do not use when a domain-specific skill already fully matches.

## Required inputs

- User goal statement
- Current frontend context (feature domain, entity names, existing files if any)

## Contracts to load

- `architecture/01_architecture.md`: layer boundaries and hard dependency rules
- `architecture/04_api_client.md`: API client and HTTP boundary rules
- `architecture/13_errors.md`: error model and error propagation
- `architecture/08_hooks.md`: write-path rules (actions, optimistic updates, rollback)
- `architecture/05_server_state.md`: read-path rules (query hooks, cache keys, stale time)
- `architecture/11_routing.md`: routing rules and lazy loading
- `task_system/frontend_contract_goal_mapping_guide.md`: goal bundle selection,
  trigger expansion map, domain grounding rule

## Optional local extension companions

- Load `*_local.md` companions for selected canonical contracts when present.

## Execution protocol

1. Read `task_system/frontend_contract_goal_mapping_guide.md` to determine the
   correct goal bundle and trigger expansions for this task.
2. Apply the domain grounding rule: read the relevant planning table(s) before
   naming any entity, field, or type.
3. Select core + minimum domain contracts using the goal bundle as the starting set.
4. Check for local companions (`*_local.md`) and apply local precedence where found.
5. Produce a concrete implementation sequence with file manifest and exclusions.

## Output format

Follow `task_system/frontend_contract_goal_mapping_guide.md` output format section,
which requires:
- Domain tables consulted
- Selected contracts with reasons
- Added contracts from guide
- Local extensions loaded
- Excluded contracts with reasons

## Done criteria

- Contract set is explicit and minimal.
- Domain entities are grounded in planning tables, not contract examples.
- Exclusions are documented.
- Plan is implementation-ready with a complete file manifest.

## Quality gate

- `npm run typecheck`: zero TypeScript errors
- All tests relevant to the changed scope pass
- `npx playwright test --project=mobile`: no regressions
