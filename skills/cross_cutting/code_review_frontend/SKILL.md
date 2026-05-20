# Frontend Code Review

## Intent

Review frontend changes for contract violations, layer boundary breaches,
missing tests, and runtime validation gaps.

## Trigger conditions

- Use when user asks for a frontend code review.
- Use after significant frontend changes touching feature boundaries, surface
  system, providers, or shared infrastructure.

## Required inputs

- Changed files or diff
- Relevant task context or plan reference

## Contracts to load

- `architecture/01_architecture.md`: layer boundaries and hard dependency rules
- `architecture/15_feature_structure.md`: feature slice structure and import boundary checks
- `architecture/13_errors.md`: error handling checks
- `architecture/08_hooks.md`: write-path correctness (actions, optimistic updates, rollback)
- `architecture/05_server_state.md`: read-path correctness (query hooks, cache invalidation)
- `architecture/17_testing.md`: Vitest testing expectations
- `architecture/34_runtime_validation.md`: Playwright runtime validation requirements

## Execution protocol

1. Identify touched layers and check for hard dependency rule violations.
2. Check that feature components do not import from the logic layer directly.
3. Check that action hooks are data-only (no `surface.*` calls, no UI logic).
4. Check that controllers orchestrate surface transitions and error recovery correctly.
5. Report findings ordered by severity: critical → high → low.
6. Include missing tests and contract misalignments.
7. Provide concise remediation guidance per finding.

## Output format

For each finding:
- **Severity**: critical / high / low
- **File**: path to the file
- **Issue**: what the violation is and which contract it breaks
- **Fix**: shortest path to correct it

## Done criteria

- Critical and high issues are clearly enumerated.
- Missing runtime validation gaps are explicitly flagged.
- Residual risk is assessed.

## Quality gate

- `npm run typecheck`: zero TypeScript errors
- All tests relevant to the changed scope pass
- `npx playwright test --project=mobile`: no new failures
