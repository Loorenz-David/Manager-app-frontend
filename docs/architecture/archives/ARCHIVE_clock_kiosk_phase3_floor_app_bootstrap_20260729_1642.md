# ARCHIVE_clock_kiosk_phase3_floor_app_bootstrap_20260729_1642

## Metadata

- Archive ID: `ARCHIVE_clock_kiosk_phase3_floor_app_bootstrap_20260729_1642`
- Archived at (UTC): `2026-07-29T16:42:59Z`
- Amended at (UTC): `2026-07-29T16:53:33Z`
- Archive owner agent: Codex

## Source references

- Plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase3_floor_app_bootstrap_20260729.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase3_floor_app_bootstrap_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Intention plan: `docs/architecture/under_construction/intention/clock_in_app.md`

## Outcome classification

- Result: `completed`
- Acceptance criteria met: `yes`

## Final notes

- The floor app is a thin host shell: device auth/config, providers, routing,
  styling/fonts, PWA, chrome assembly, and an empty protected placeholder.
- No kiosk workflow, realtime provider, tabs, SlideStack, or worker-shifts
  consumption was added.
- Device settings is a rise surface opened only by a 600 ms long press; logout
  has an inline confirmation and optional device-config wipe.
- Floor logout now selects a dedicated shared-auth path whose `finally`
  guarantees persisted floor token, in-memory token, and auth-store teardown
  even when the logout API fails; the existing `onSettled` clears the query
  cache and returns the host to sign-in. Default non-floor behavior is
  unchanged and covered by a regression test.
- The shared rise renderer registration is additive and covered by lifecycle,
  stack, inert, and backdrop tests.
- Required validation passed: clean root install, root typecheck, floor 6/6
  unit tests, auth 3/3 tests, UI 162/162 tests, and desktop floor-bootstrap
  Playwright 1/1. npm's omitted optional Darwin bindings caused one
  pre-assertion webserver-start failure; restoring the exact declared bindings
  with `--no-save` made the required rerun pass.

## Follow-up links

- Master sequence: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Next phase: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase4_core_flow_20260729.md`
