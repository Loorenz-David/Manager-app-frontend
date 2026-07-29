# ARCHIVE_clock_kiosk_phase2_floor_auth_20260729_1609

## Metadata

- Archive ID: `ARCHIVE_clock_kiosk_phase2_floor_auth_20260729_1609`
- Archived at (UTC): `2026-07-29T16:09:17Z`
- Archive owner agent: Codex

## Source references

- Plan: `docs/architecture/archives/implementation/PLAN_clock_kiosk_phase2_floor_auth_20260729.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase2_floor_auth_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_shift_floor_app_20260729.md` §2 and §8

## Outcome classification

- Result: `completed`
- Acceptance criteria met: `yes`

## Final notes

- Floor-scope device tokens now persist under `beyo.floor.access_token`, restore without refresh, and clear on logout/revocation.
- A floor 401 reuses the existing `auth:session-expired` path; the MSW request log proved zero refresh calls.
- The four pre-existing scopes retain refresh-cookie behavior and provably make zero storage calls.
- Required validation passed: root typecheck with zero errors; `@beyo/api-client` 3/3 tests; `@beyo/auth` 1/1 test.
- No application source or UI file changed.

## Follow-up links

- Master sequence: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`
