# Codex — Phase 5: declared states (declare / close from the kiosk)

> **SHELVED — DO NOT EXECUTE** (user decision 2026-07-29, master decision #10).
> Declared states are out of v1 and will ship later as separate pages. If you
> were handed this prompt, stop and confirm with the operator — the current
> sequence is 1 → 2 → 3 → 4 → 6 → 7. Before this prompt is ever revived, the
> shelved plan must be re-validated against the then-current master (notably the
> `rise` surface model, which postdates this prompt's kit description).

You are implementing exactly **one phase** of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. Phases 1–4 are archived; the core clock-in/out loop works. A Claude session has committed the **user-approved declare kit** (confirm-step declare affordances, ReasonPickerPane, DescriptionPane, DeclareResultState, CloseResultState) — **read-only** for you.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase5_declared_states_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Backend ground truth: handoff §6 (declared states) + §7 (pause reasons) of `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md`

## Read before writing any code, in this order

1. The child plan, fully — the kit contract table and acceptance criteria 1–6.
2. The master plan — decision #10 and the mapping table's declare row.
3. Handoff §6–§7, every rule: clocked-in requirement, PERSONAL-only, `requires_description`, switch semantics, `paused_steps`, close does NOT resume steps, auto-close caveats.
4. `task_system/frontend_contract_goal_mapping_guide.md` + the child plan's contracts.
5. Permitted relational reads only: `packages/pause-reasons/src/{index.ts, types.ts}` + its query hook signature, Phase 4 flow store/controller exports, the kit prop types.

## Hard rules

- Compose `@beyo/pause-reasons` — import its query/types; redefine nothing. Filter `pause_type === "personal"` client-side (the query param does not exist until backend phase 4).
- Declare over an open declaration **switches** — never call close first.
- Close renders the response's `shift_state` honestly: `in_pause` from a remaining step-blocker pause is explained, not hidden. Closing never claims tasks resumed.
- Both 409s ("must be clocked in", "no declared state open") are normal flow: refetch `/current`, re-render confirm. After every await, fresh `/current` — never cached state.
- Phase 4's invariants (session ids, every-path-to-keypad, single generic errors) extend unchanged to the new panes.
- Kit read-only; additive optional props only, recorded in the Review log.
- Do not invent requirements; unresolved ambiguity without a stated default → stop and ask.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors.
- `npm run test:clock-kiosk` — green, including reason filtering, `requires_description` gating, switch semantics, both 409 paths.
- `npx playwright test --grep kiosk-declare --project=mobile` then `--project=desktop` — declare-with-description, declare-switch, close-landing-idle, declare-while-clocked-out redirect — all mocked, all green.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`: summary `SUMMARY_clock_kiosk_phase5_declared_states_20260729.md` → archive record → plan archived + moved → dated master Review log entry. On failed validation: `Status: debugging`, record, stop with a report.

## Report back

End with: lifecycle state, files created/modified, validation output, deviations with justification.
