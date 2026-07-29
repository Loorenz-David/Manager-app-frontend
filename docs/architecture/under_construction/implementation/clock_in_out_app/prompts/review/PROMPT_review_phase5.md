# Opus review — Phase 5: declared states

> **SHELVED — DO NOT EXECUTE** (user decision 2026-07-29, master decision #10).
> Phase 5 was removed from the v1 sequence; there is no implementation to
> review. Kept on file for the future declare-pages capability.

You are the **implementation reviewer** for one phase of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. A Codex session implemented the declare/close flow from an approved plan on top of a **user-approved** Claude kit (this flow has no design images — the approved kit is the visual ground truth). **You change no code.**

## Inputs

- Phase plan: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase5_declared_states_20260729.md` (or archived in `docs/architecture/archives/implementation/`).
- Implementation summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase5_declared_states_20260729.md`.
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md` (decision #10).
- Backend ground truth: handoff §6–§7.

## Read in order

Master → phase plan (kit contract + criteria) → summary → contract guide → the diff on `packages/clock-kiosk` → handoff §6–§7 → `packages/pause-reasons/src/index.ts` (what should have been imported).

## Phase-specific checklist (beyond the plan's criteria)

1. **Composition, not duplication** — pause-reason types/queries imported from `@beyo/pause-reasons`; grep for any redefined catalog shape (defect). Client-side `personal` filter present (the query param does not exist yet).
2. **Switch semantics** — declaring over an open declaration issues exactly one request (no pre-close call); test proves it against the mock.
3. **Honest close** — close renders the response `shift_state`; the `in_pause`-remains case is explained in UI; nothing claims task steps resumed.
4. **409s as normal flow** — both branches ("must be clocked in", "no declared state open") refetch `/current` and land on confirm; no error surface.
5. **`requires_description` gating** — blocked empty submit client-side AND 422 surfaced inline; reasons without the flag skip the pane entirely.
6. **Phase-4 invariants extended** — session ids, cleared-keypad returns, generic errors hold across the new panes (tests extended, not just written for happy paths).
7. **Clocked-out workers see no declare UI** at all.
8. **Kit integrity** — diff kit components since the approved-kit commit: no DOM/class/styling changes by Codex; additive optional props only.
9. **Validation evidence** — re-run typecheck, `test:clock-kiosk`, and the `kiosk-declare` Playwright specs (mobile then desktop) yourself.
10. **Lifecycle bookkeeping** — summary, archive move, master Review log entry, master otherwise untouched.

## Output

- **Verdict**: pass / pass-with-notes / defects found.
- Findings ranked by severity with file:line + violated rule.
- If defects: create `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase5_corrections_<YYYYMMDD>.md` from the TEMPLATE_PLAN, fixes-only, linked, each finding routed **Codex (logic) or Claude (visual) — say which per finding**.
- Append a dated review entry to the master plan's Review log.
- Do not modify implementation code, kit components, or the archived phase plan.
