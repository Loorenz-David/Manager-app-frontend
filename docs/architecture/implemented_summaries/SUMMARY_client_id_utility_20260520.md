# SUMMARY_client_id_utility_20260520

## Metadata

- Summary ID: `SUMMARY_client_id_utility_20260520`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-20T13:52:16Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_client_id_utility_20260520.md`
- Related debug plan (optional): `—`

## What was implemented

- Added `apps/managers-app/ManagerBeyo-app-managers/src/lib/client-id.ts` with the shared `CLIENT_ID_PREFIXES` map, `generateClientId(entity)`, `CLIENT_ID_REGEX`, and `ClientIdSchema`.
- Replaced request DTO `client_id` validators across the managers app feature `types.ts` files with `ClientIdSchema`.
- Replaced the planned reference-ID `uuid()` validators with `z.string().min(1)` in request DTOs that accept already-issued prefixed IDs.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/lib/client-id.ts`: new shared client ID generator and validator.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/{tasks,customers,cases,items,users,working_sections,upholstery,upholstery_requirements}/types.ts`: updated request DTO validators per plan scope.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/subfeatures/task_steps/types.ts`: relaxed reference-ID validators for task-step write DTOs.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/subfeatures/item_images/types.ts`: updated `pending_upload_client_id` to `ClientIdSchema`.

## Contract adherence

- `architecture/04_api_client.md`: preserves the frontend-generated public-ID flow for first-party create requests.
- `architecture/24_dto.md`: request DTO schemas remain the single validation boundary for outgoing payloads.
- `architecture/16_feature_workflow.md`: implementation stayed within the type layer only and did not expand into hooks, actions, or UI wiring.
- `docs/architecture/backend/tables/client_id_prefix_map.md`: `CLIENT_ID_PREFIXES` mirrors the current backend map exactly.

## Validation evidence

- `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`: pass
- `rg -n "z\\.string\\(\\)\\.uuid\\(\\)" apps/managers-app/ManagerBeyo-app-managers/src/features`: no remaining matches
- Runtime check: `generateClientId('Customer')` and `generateClientId('ExecutionTask')` both matched the expected prefixed ULID format
- Runtime check: `ClientIdSchema.safeParse('cus_01ARYZ6S41TSV4RRFFQ69G5FAV').success`: `true`
- Runtime check: `ClientIdSchema.safeParse('some-uuid-1234').success`: `false`

## Known gaps or deferred items

- The archived plan's acceptance section contains two stale assumptions from the source document: it says the backend prefix map has `43` entries, but the current authoritative map has `56`; and the sample ID `cus_01ARYZ6S41TPTWGIBZH4S7APGE` is not a valid Crockford Base32 ULID because it contains `I`.
- Playwright was not run for this change.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_client_id_utility_20260520_1352.md`
