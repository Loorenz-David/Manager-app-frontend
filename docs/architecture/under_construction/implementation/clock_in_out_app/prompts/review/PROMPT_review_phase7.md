# Opus review — Phase 7: validation, resilience, polish (capability close-out)

You are the **implementation reviewer** for the final phase of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. A Codex session ran the audit/resilience/README phase; a Claude session ran the design-fidelity + a11y half. Your review closes the capability: beyond the phase itself, you verify the **master acceptance criteria 1–9**. **You change no code.**

## Inputs

- Phase plan: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase7_validation_polish_20260729.md` (or archived in `docs/architecture/archives/implementation/`).
- Implementation summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase7_validation_polish_20260729.md`.
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md` — "Acceptance criteria (master-level)" is your primary rubric; its Review log should now contain entries from every phase.
- Backend ground truth: the handoff (incl. its endpoint-liveness table). GAP spec: `BACKEND_REQUIREMENTS_clock_kiosk_20260729.md`.

## Read in order

Master (criteria 1–9 + full Review log) → phase plan → summary → the shipped `packages/clock-kiosk/README.md` → spot-read the audited code.

## Phase-specific checklist

1. **Master criteria 1–9** — disposition each with evidence (file/test/grep result). Notably: #3 (mocks-offline end-to-end + one-flag live switch), #4 (the four handoff UX rules), #5 (floor persistence + three-app invariance), #7 (every GAP behind an adapter + documented).
2. **Boundary audit re-verified** — run the greps yourself: no deep package imports from the floor app; `worker-shifts` imports zero UI; `clock-kiosk` imports zero app code; public `index.ts` surfaces match the READMEs.
3. **Resilience claims** — re-run the automatable resilience specs; check the manual-script results are recorded (dated) in the Review log, not just promised.
4. **Integration README sufficiency** — could another app mount the kiosk from the README alone? It must cover: page/surface registration, provider + adapters, `@source` lines, kiosk tokens, both font faces, device config, floor-scope auth. Flag anything a host would have to reverse-engineer.
5. **No premature flips** — mocked endpoints whose backend phases are still ❌ in the handoff table remain mocked (no endpoint the v1 kiosk uses is live; pause-reasons left with the shelved declare flow); the flip checklist exists in the kiosk README.
6. **Fidelity pass recorded** — the Claude design-fidelity + a11y entry exists in the Review log with concrete results (not "looks good").
7. **Validation evidence** — re-run the full matrix yourself: root typecheck, `test:worker-shifts`, `test:clock-kiosk`, floor `test:unit`, Playwright mobile + desktop.
8. **Lifecycle close-out** — phase summary + archive move done; master Review log complete across phases; master's final lifecycle transition performed (or explicitly pending a corrections plan you create).

## Output

- **Verdict**: capability complete / complete-with-notes / defects found — with master criteria 1–9 individually dispositioned.
- Findings ranked by severity with file:line + violated rule.
- If defects: create `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase7_corrections_<YYYYMMDD>.md` from the TEMPLATE_PLAN, fixes-only, linked, each finding routed **Codex (logic) or Claude (visual) — say which per finding**.
- Append the closing review entry to the master plan's Review log.
- Do not modify implementation code, kit components, or archived plans.
