# Codex — Phase 9c: replicate to sellers + workers, matrix, close-out (final session)

You are implementing the **final slice** of an approved corrections plan, working in the `frontend/` monorepo root. Sessions 9a (package seams) and 9b (managers-app wired + validated) are done. **Verify first:** managers-app mounts `ActivePresentationProvider` and its `presentation-player` Playwright spec exists and passes — if not, STOP and report. Read 9b's Review-log line for replication notes. The working tree may contain the user's unrelated pause-reasons changes — never touch or revert them. Start coding early.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_phase9_corrections_20260722.md` — **steps 4–8**; acceptance criteria 1–4 and 6–8 for sellers + workers, plus 9 (live matrix) and 10 (lifecycle close-out).

## Read (only this)

1. The corrections plan (steps 4–8, criteria, risks).
2. The managers-app wiring 9b produced (the recipe to replicate — relational).
3. Relational, per target app: sellers/workers shells, routers/ROUTES, surface + socket registries, `index.css`, `package.json`, Playwright configs (sellers has NONE — you create it per `34_runtime_validation_local.md` conventions, mirroring another app's).

## Deliver

1. **Replicate the managers recipe** to sellers-app (`appKey="seller"`) and workers-app (`appKey="worker"`), honoring each shell/router convention; no hardcoded cross-app keys or routes; add sellers' missing Playwright configuration/scripts.
2. **Per-app validation**: glue tests, `presentation-player` Playwright specs (mobile first, then desktop; the `PullToRefresh` tap()/press() helper applies on mobile if a control sits inside one), production-build chunk inspection for both apps.
3. **Live cross-app matrix** (criterion 9): publish one announcement per single `app_key` from the studio against the live backend; verify receipt ONLY in the matching app for both realtime-connected and cold-boot paths; verify completed presentations never reappear and the next eligible one surfaces. Record the evidence in the summary. (Coordinate with the operator if live credentials/servers are needed — ask rather than fake it.)
4. **Full validation set** (criterion 10): root typecheck; `test:presentations` + all app/glue suites; all three apps' mobile then desktop `presentation-player` runs; bundle evidence; matrix record; `/history` + default-export greps clean.

## Finish — lifecycle close-out (ONLY after everything above is green)

Per `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. `SUMMARY_presentation_phase9_phone_apps_wiring_20260722.md` (cover all three sessions 9a/9b/9c + the matrix evidence).
2. Archive the Phase 9 plan (`Status: archived`, `mv` to `archives/implementation/`, verify).
3. **Master close-out**: dated all-phases-complete entry in `PLAN_presentation_capability_master_20260722.md`'s Review log → `Status: archived` → `mv` to `archives/implementation/` → verify. The only session permitted to do this.
4. Leave the corrections plan `approved` in place for independent re-review.
5. Anything not green: corrections plan → `Status: debugging`, defect logged, stop with a report — do NOT touch the master.

## Report back

Lifecycle state (incl. master close-out), per-app notes, all validation outputs incl. the matrix, deviations with justification. Clean-boundary rule applies — never stop before writing code.
