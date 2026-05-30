# HANDOFF_TO_BACKEND_bulk_working_section_steps_prefetch_endpoint_20260530

## Metadata

- Handoff ID: `HANDOFF_TO_BACKEND_bulk_working_section_steps_prefetch_endpoint_20260530`
- Created at (UTC): `2026-05-30T00:00:00Z`
- Last updated at (UTC): `2026-05-30T00:00:00Z`
- Owner agent: `claude-sonnet-4-6`
- Source frontend plan: `docs/architecture/under_construction/implementation/PLAN_43_predictive_prefetch_system_20260530.md`

## Request to backend

- Required backend behavior: Extend the existing `GET /api/v1/working-sections/me` endpoint with an optional `include_steps` flag that embeds the first page of steps for each section in the same response. This eliminates the N follow-up step-list requests the frontend must otherwise fire after sections load.
- User-facing impact: Workers open the app and immediately see their task steps for active sections with no loading state — data arrives in a single request on app boot instead of one request for sections followed by one request per active section.
- Desired timeline: Non-blocking for PLAN_43 (the frontend falls back to N parallel individual `GET /api/v1/working-sections/:id/steps` calls). This is a performance optimization. Implement when convenient.

## Frontend context

- Why the frontend needs this: PLAN_43 prefetches task step data at home page load for sections where `paused + working + ended_shift > 0` (sections the worker is actively using). The current implementation fires one `GET /api/v1/working-sections/:id/steps` per qualifying section after the sections list loads — a two-round-trip waterfall. With `include_steps=true` on the sections endpoint, both sections and their steps arrive in one request, eliminating the waterfall entirely.
- Blocked frontend plan: None — PLAN_43 proceeds without this using individual step requests. This is an additive optimization once available.
- Clarifications required:
  - [ ] Should `include_steps` embed steps only for sections where the worker has active steps (non-zero `paused + working + ended_shift`), or for all sections? — frontend preference is all sections so the response is consistent and the frontend does not need special-case logic.
  - [ ] What `limit` should apply to the embedded steps? Frontend uses `limit: 50, offset: 0` for the individual step requests. The embedded steps should match that default. If the section has more than 50 steps, `has_more: true` should be set on the pagination object so the frontend knows to fetch more if needed.
  - [ ] Should `today_start` filtering (used for `todayDoneCount`) apply to the embedded steps the same way it does on the individual endpoint? — yes, same behaviour is expected.

## Expected backend deliverables

1. `GET /api/v1/working-sections/me` gains an optional `include_steps` boolean query parameter (default `false`).
2. When `include_steps=true`, each working section object in the response includes a `steps_pagination` field with the first page of steps (limit 50, offset 0, same shape as `GET /api/v1/working-sections/:id/steps`).
3. When `include_steps=false` (default), the response is unchanged from today — fully backwards compatible.
4. The embedded steps respect the same `today_start` param already accepted by the sections endpoint.

## Interface expectations

- Endpoint: `GET /api/v1/working-sections/me` (existing, additive change)
- Auth: JWT required

- Request shape (new param only):
```http
GET /api/v1/working-sections/me?today_start=2026-05-30T00:00:00.000Z&include_steps=true
Authorization: Bearer <token>
```

- Response shape — each section object gains an optional `steps_pagination` field when `include_steps=true`:
```json
{
  "ok": true,
  "warnings": [],
  "data": {
    "working_sections": [
      {
        "client_id": "ws_01...",
        "name": "Cleaning",
        "image": "https://...",
        "task_steps_counts": {
          "pending": 2,
          "working": 1,
          "paused": 0,
          "ended_shift": 0,
          "blocked": 0,
          "completed": 5,
          "skipped": 0,
          "failed": 0
        },
        "steps_pagination": {
          "items": [
            {
              "client_id": "stp_01...",
              "task_id": "tsk_01...",
              "state": "working",
              "item": { "..." : "..." },
              "item_images": [],
              "cases_summary": { "total_unread": 0 }
            }
          ],
          "has_more": false,
          "limit": 50,
          "offset": 0
        }
      }
    ]
  }
}
```

- Field notes:
  - `steps_pagination` is present on every section when `include_steps=true`. For a section with no steps, `items` is an empty array and `has_more` is false.
  - The `items` array shape is identical to the items returned by `GET /api/v1/working-sections/:id/steps` — the frontend uses the same Zod schema (`TaskStepsPaginationSchema`) to parse it.
  - If `has_more: true` on a section's embedded steps, the frontend falls back to the individual endpoint with `offset: 50` for the next page. This is handled automatically — the prefetch only warms the first page.
  - `cases_summary.total_unread` should be included on each step (same as the existing `GET /api/v1/working-sections/:id/steps` behaviour after HANDOFF_TO_BACKEND_task_step_cases_summary_20260529).

- Error cases:
  - Unknown `include_steps` values (anything other than `true`/`false`) → treat as `false`.
  - If the steps sub-query for a section fails, return the section with `steps_pagination: null` rather than failing the entire response. The frontend falls back to an individual step request in that case.
  - `401`: invalid/missing JWT.
  - `500`: unexpected server error.

- Socket events: None.

## Frontend contract implications

- When this endpoint is available, the workers app `useWorkingSectionsHomeController` (and the prefetch wiring in PLAN_43 Step 9) will be updated to pass `include_steps: true` and seed the React Query step cache from the embedded data, eliminating the `Promise.all` of individual prefetch calls.
- The React Query cache population: for each section in the response, the embedded `steps_pagination` is written to `taskStepKeys.sectionList({ working_section_id: id, limit: 50, offset: 0 })`. Exact same key the individual query hook uses — cache hit on navigation.
- No changes to `task-step-keys.ts` or the existing `use-working-section-steps.ts` query hook.
- Architecture contracts affected: none (internal API function change only).

## Trace links

- Frontend prefetch wiring: `apps/workers-app/.../features/working_sections/controllers/use-working-sections-home.controller.ts` (PLAN_43, Step 9)
- Existing sections endpoint: `GET /api/v1/working-sections/me` (`apps/workers-app/.../features/working_sections/api/fetch-worker-working-sections.ts`)
- Existing step list endpoint: `GET /api/v1/working-sections/:id/steps` (`apps/workers-app/.../features/task_steps/api/fetch-working-section-steps.ts`)
- Related step list handoff: `HANDOFF_TO_BACKEND_task_step_cases_summary_20260529.md`
