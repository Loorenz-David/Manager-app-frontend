# Codex — Phase 7: validation, resilience, polish, integration README

You are implementing exactly **one phase** — the last — of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. Phases 1–4 and 6 are archived (Phase 5 is shelved — master decision #10). A separate Claude session will run the design-fidelity + a11y half (child plan criterion 7) — you own everything else.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase7_validation_polish_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — "Acceptance criteria (master-level)" 1–9: this phase is where every one of them is finally checked off.
3. `task_system/frontend_contract_goal_mapping_guide.md` + the child plan's contracts (`34_runtime_validation_local.md` for fixtures/projects/scripts).
4. Relational reads: everything Phases 1–6 shipped (this phase audits it), root `package.json`, playwright configs.

## Hard rules

- No new features. Gaps found during the audit become fixes only when they violate an existing phase's plan; anything else is recorded, not built. Exception: the child plan's **"Carried-forward items" table (CF1–CF4)** is explicitly authorized work — implement the Codex-owned rows (CF1 msw devDependency + native-binding check, CF3 stats codes-module extraction, CF4 positive cold-load skeleton assertion); CF2 belongs to the Claude fidelity pass.
- The always-on device is the product: sleep/wake, focus resync, roster-stale vs roster-absent states, no accumulating clock drift — per child criterion 1. Automate what Playwright can; write and execute the manual script for the rest, recording results in the Review log.
- Public-API + boundary audit is grep-verified, not eyeballed: no deep imports of either package from the floor app; `worker-shifts` imports zero UI; `clock-kiosk` imports zero app code.
- Live-flip: no endpoint the v1 kiosk uses is live yet (pause-reasons left with the shelved declare flow). Document and rehearse the per-endpoint flip checklist (env flag, mock removal, affected Playwright specs) in `packages/clock-kiosk/README.md`. Do NOT flip mocked endpoints whose backend phases are still ❌ in the handoff table.
- The integration README must let another app mount the kiosk page without reading any plan: surface/page registration, provider + adapters, `@source` lines, kiosk tokens, both font faces, device-config expectations, floor-scope auth requirement.
- Do not invent requirements; unresolved ambiguity without a stated default → stop and ask.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors.
- `npm run test:worker-shifts && npm run test:clock-kiosk` + floor app `test:unit` — green.
- `npx playwright test --grep clock-kiosk --project=mobile` then `--project=desktop` — the full journey set green, tablet-portrait viewport included.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`: summary `SUMMARY_clock_kiosk_phase7_validation_polish_20260729.md` → archive record → plan archived + moved → dated master Review log entry marking the capability complete (the Claude fidelity pass appends its own entry; the master's final lifecycle transition happens after both entries exist). On failed validation: `Status: debugging`, record, stop with a report.

## Report back

End with: lifecycle state, the master-criteria checklist (1–9, each with evidence), files created/modified, validation output, deviations with justification.
