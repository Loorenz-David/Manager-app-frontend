# ARCHIVE_PLAN_realtime_07_upholstery_handler_corrections_20260619_1258

## Metadata

- Archive ID: `ARCHIVE_PLAN_realtime_07_upholstery_handler_corrections_20260619_1258`
- Archived at (UTC): `2026-06-19T12:58:04Z`
- Archive owner agent: `Codex`

## Source references

- Plan: `docs/architecture/archives/implementation/PLAN_realtime_07_upholstery_handler_corrections_20260619.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_realtime_07_upholstery_handler_corrections_20260619.md`
- Debug chain (optional): `n/a`

## Outcome classification

- Result: `completed`
- Acceptance criteria met: `yes`

## Final notes

- Managers item-upholstery handlers now invalidate the shared `@beyo/tasks` namespace that powers task and task-step upholstery displays, in addition to the managers-only upholstery-requirements keys.
- Pending-seat upholstery surfaces now refetch both list and count queries on every `item:upholstery-*` event, and requirement-state changes now also refresh upholstery-ordering needs queries.
- Managers upholstery entity and inventory handlers now refresh the dependent inventory-list and picker-list caches that were previously left stale.
- Workers task-step handlers now react to `item:upholstery-*` events by invalidating the shared item-upholstery root namespace.
- Root `npm run typecheck` passed after the handler corrections.

## Follow-up links

- Next plan (optional): `n/a`
- Related handoff (optional): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`
