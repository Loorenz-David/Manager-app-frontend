# Ask Clarification First

## Intent

Prevent requirement invention by requiring clarifying questions when critical
implementation details are missing.

## Trigger conditions

- Use when request has ambiguous scope, data model, behavior, or acceptance criteria.
- Use when multiple implementations are possible with materially different outcomes.
- Use when user explicitly asks for discussion/clarification before coding.

## Required inputs

- Original user request
- Any prior constraints provided by user

## Contracts to load

- `architecture/01_architecture.md`: layer boundaries and hard dependency rules
- `architecture/13_errors.md`: failure-mode awareness
- `task_system/frontend_contract_goal_mapping_guide.md`: baseline contract routing context

## Clarification protocol

1. Detect ambiguities that change architecture, behavior, data shape, or API contract.
2. Ask only high-signal questions required to unblock safe implementation.
3. Group questions by topic and keep them concise.
4. Do not produce final implementation plan until blockers are clarified.
5. After answers, restate agreed scope before proceeding.

## Do not do

- Do not fabricate defaults for missing critical requirements.
- Do not hide assumptions as facts.
- Do not implement until blocker questions are answered.

## Output format

Follow `task_system/frontend_contract_goal_mapping_guide.md` output format section.

## Done criteria

- Blocking ambiguities were turned into explicit questions.
- Assumptions are either confirmed or marked unresolved.
- Post-clarification scope is explicit.

## Quality gate

- `npm run typecheck`: zero TypeScript errors once implementation proceeds
- All tests relevant to the changed scope pass
- No console errors at runtime
