# Plan Lifecycle Orchestrator

## Intent

Manage the full frontend plan workflow across drafting, review, implementation,
summary, archive, and debugging loops.

## Trigger conditions

- User asks to start or manage a plan through full lifecycle.
- Multi-agent handoff is expected between planning and implementation.
- Work requires documentation traceability and state transitions.
- User asks to archive or clean up implemented plans (move plans from
  `under_construction/implementation/` to `archives/implementation/`).

## Required inputs

- Goal statement and scope
- Acceptance criteria
- Domain and constraints
- Handoff needs (`to_backend`, `from_backend`, or none)

## Contracts to load

- `architecture/16_feature_workflow.md`: feature build order alignment
- `task_system/frontend_contract_goal_mapping_guide.md`: baseline contract routing
  and domain grounding rule

## Related skills

- `skills/cross_cutting/intention_planning/SKILL.md`: use when creating or
  updating intention plans

## Execution protocol

1. Determine plan type before creating:
   - Goal/outcome driven → use intention plan first (`intention_planning` skill).
   - Task/implementation driven → use implementation plan directly.
2. Create or update plan in the correct subfolder:
   - Intention: `docs/architecture/under_construction/intention/`
   - Implementation: `docs/architecture/under_construction/implementation/`
3. Link implementation plan back to its intention plan in the metadata field.
4. Run clarification-first checks to avoid requirement invention.
5. Read planning tables for the relevant domain before naming any entity
   (`docs/architecture/under_construction/intention/planning_tables/`).
6. Review and correct plan until approved.
7. Execute implementation (current or delegated agent).
8. Write summary in `docs/architecture/implemented_summaries/`.
9. Create archive record in `docs/architecture/archives/`.
10. Move the implementation plan file from `under_construction/implementation/`
    to `archives/implementation/`:
    - The plan file is the single source of truth — once implementation is
      complete and the summary is written, the plan must live in
      `archives/implementation/`, not in `under_construction/implementation/`.
    - Update the plan's `Status` field to `archived` and update `Last updated at`
      before moving.
    - Execute the move with:
      ```
      mv docs/architecture/under_construction/implementation/PLAN_<slug>_<YYYYMMDD>.md \
         docs/architecture/archives/implementation/PLAN_<slug>_<YYYYMMDD>.md
      ```
    - Verify the file is gone from `under_construction/implementation/` after the move.
    - `README.md` and `TEMPLATE_PLAN.md` must never be moved — they are permanent
      residents of `under_construction/implementation/`.
    - Plans with status `under_construction` or `approved` must NOT be moved.
11. Update the intention plan's "Linked implementation plans" table and progress notes.
12. If defects appear, create nested debug plan in `docs/debugging/`.
13. Repeat review → implement → summary → archive for debug iteration.

## Cleanup protocol (standalone)

Use this when invoked specifically to clean up stale plan files — plans that
have been implemented and summarised but whose file is still in
`under_construction/implementation/`:

1. List all files in `docs/architecture/under_construction/implementation/`
   (excluding `README.md` and `TEMPLATE_PLAN.md`).
2. For each plan file found, read its `Status` field:
   - `archived` → stale; move to `archives/implementation/`.
   - `under_construction` or `approved` → leave in place.
3. For each stale file:
   a. If a copy already exists in `archives/implementation/`: keep the newer
      version; delete the stale copy from `under_construction/implementation/`.
   b. If no copy exists: move the file using `mv`.
4. Confirm `under_construction/implementation/` contains only `README.md`,
   `TEMPLATE_PLAN.md`, and active (non-archived) plans.

## Handoff protocol

- Frontend requests backend work → artifacts go in `docs/handoff/to_backend/`.
- Backend delivers to frontend → artifacts tracked in `docs/handoff/from_backend/`.
- All handoff files must reference the originating plan or debug plan.

## Output format

Include:
- Current lifecycle state
- Next required transition
- Document paths updated or to be created

## Done criteria

- Lifecycle state is explicit and valid.
- Plan, summary, and archive are trace-linked.
- Debug loops include nested parent references.

## Quality gate

- `npm run typecheck`: zero TypeScript errors
- All tests relevant to the changed scope pass
- `npx playwright test --project=mobile`: no regressions
- Archive move verified with `ls` confirming file is absent from
  `under_construction/implementation/`
