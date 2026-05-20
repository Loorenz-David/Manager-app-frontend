# Goal Intent Alignment

## Intent

Align the user goal, success criteria, scope boundaries, and implementation
intent before any code changes are proposed.

## Trigger conditions

- Use when user requests planning, architecture direction, or approach design.
- Use when a task can be interpreted in multiple valid ways.
- Use when acceptance criteria are not explicit.

## Required inputs

- User objective in natural language
- Known constraints (deadline, stack, environment, contract limits)

## Contracts to load

- `architecture/01_architecture.md`: layer boundaries and feature dependency rules
- `architecture/15_feature_structure.md`: feature slice structure and naming conventions
- `task_system/frontend_contract_goal_mapping_guide.md`: contract routing and domain
  grounding rule (read planning tables before naming entities)

## Execution protocol

1. Restate the goal in one sentence.
2. Extract explicit requirements and assumptions.
3. Identify missing decisions that block safe implementation.
4. Ask focused clarification questions for blocking decisions.
5. Confirm which planning table covers the domain before naming any entity
   (`docs/architecture/under_construction/intention/planning_tables/`).
6. Propose a bounded implementation plan only after answers are received.

## Output format

Follow `task_system/frontend_contract_goal_mapping_guide.md` output format section.

## Done criteria

- Goal and intent are aligned in explicit language.
- Domain entities are grounded in the planning tables, not contract examples.
- Blocking ambiguities are resolved or listed as unanswered.
- Plan is bounded by agreed scope.

## Quality gate

- `npm run typecheck`: zero TypeScript errors once implementation proceeds
- All tests relevant to the changed scope pass
- No console errors at runtime
