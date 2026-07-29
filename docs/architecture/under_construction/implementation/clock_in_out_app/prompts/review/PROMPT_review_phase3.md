# Opus review — Phase 3: `floor-app` bootstrap

You are the **implementation reviewer** for one phase of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. A Codex session bootstrapped the new app from an approved plan; a separate Claude session built the chrome kit (KioskFrame, KioskHeader, DeviceSignInCard, DeviceSettingsSurface, the `RiseSurface` shell in `@beyo/ui`, kiosk tokens, fonts) beforehand. **You change no code.**

## Inputs

- Phase plan: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase3_floor_app_bootstrap_20260729.md` (or archived in `docs/architecture/archives/implementation/`).
- Implementation summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase3_floor_app_bootstrap_20260729.md`.
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md` (decisions #1, #2, #6–#9, #12; "Division of labor").
- Design ground truth: `docs/architecture/under_construction/implementation/clock_in_out_app/image_design/` (header/chrome only for this phase).

## Read in order

Master → phase plan → summary → contract guide → the new app tree + the `@beyo/styles` diff → `architecture/14_styling.md` §14.

## Phase-specific checklist (beyond the plan's criteria)

1. **Thin shell** — grep the app for anything kiosk-logical (matching, shift state, timers beyond the header clock): all of it is a defect; the `/` route must hold only chrome + placeholder.
2. **Shell shape** — no tabs, no `TabSlideStack`, no `RealtimeProvider`; `SurfaceProvider` + surface registry present with the device-settings surface registered under the new `rise` type.
2b. **`rise` type safety (high-blast-radius)** — diff the `@beyo/ui` SurfaceProvider/renderer change: the `rise` registration must be strictly additive (new shell + new case; existing surface-type code paths byte-untouched — three live apps use this engine); `@beyo/ui` surface tests extended for the new type; `28_surfaces_local.md` gained the `rise` entry.
3. **`@source` completeness** — every `@beyo/*` package imported anywhere in the app has its `@source` line in `src/index.css`; none extra. Verify against `14_styling.md` §14.
4. **Styles diff safety** — the `@beyo/styles` change adds only the `--color-kiosk-*` namespace; no existing token touched (diff-verify).
5. **Kit integrity (division of labor)** — diff the kit components since the kit commit: Codex must not have changed DOM/classes/styling; only additive optional props are acceptable.
6. **Device config semantics** — settings opens only via the 600ms long-press (no tap path); logout sits behind a confirm; store persists `terminalLabel` + `autoReturnSeconds` (default 12); revoked-device (401) lands on sign-in with the note.
7. **Workspace registration** — root workspaces glob + typecheck chain include the app; `npm install` is clean; dev port 5175; PWA manifest sane, no push.
8. **Validation evidence** — re-run root typecheck, app `test:unit`, and the `floor-bootstrap` Playwright spec yourself.
9. **Lifecycle bookkeeping** — summary, archive move, master Review log entry, master otherwise untouched.

## Output

- **Verdict**: pass / pass-with-notes / defects found.
- Findings ranked by severity with file:line + violated rule.
- If defects: create `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase3_corrections_<YYYYMMDD>.md` from the TEMPLATE_PLAN, fixes-only, linked, each finding routed **Codex (logic/wiring) or Claude (visual/chrome) — say which per finding**.
- Append a dated review entry to the master plan's Review log.
- Do not modify implementation code, kit components, or the archived phase plan.
