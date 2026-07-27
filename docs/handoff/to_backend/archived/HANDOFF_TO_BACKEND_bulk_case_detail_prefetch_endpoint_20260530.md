# HANDOFF_TO_BACKEND_bulk_case_detail_prefetch_endpoint_20260530

## Metadata

- Handoff ID: `HANDOFF_TO_BACKEND_bulk_case_detail_prefetch_endpoint_20260530`
- Created at (UTC): `2026-05-30T00:00:00Z`
- Last updated at (UTC): `2026-05-30T00:00:00Z`
- Owner agent: `claude-sonnet-4-6`
- Source frontend plan: `docs/architecture/under_construction/implementation/PLAN_43_predictive_prefetch_system_20260530.md`

## Request to backend

- Required backend behavior: A bulk case detail endpoint that returns metadata for multiple cases in a single request, identified by client IDs. No message history needed — case metadata only.
- User-facing impact: When the app loads and the user has unread cases, the case conversation surfaces open instantly with data already cached, rather than showing a loading state while the app fetches each case individually. On a slow mobile connection, the difference is the user seeing a spinner vs. immediate content on every unread case open.
- Desired timeline: Non-blocking for PLAN_43 (the frontend falls back to N parallel individual `GET /api/v1/cases/:id` calls). This is a performance optimization. Implement when convenient.

## Frontend context

- Why the frontend needs this: PLAN_43 prefetches case detail data at app load when unread counts are present. The current implementation fires one `GET /api/v1/cases/:id` request per unread case (N parallel HTTP requests). On mobile with 5 unread cases this is 5 concurrent requests. A single bulk request reduces this to 1 regardless of unread count.
- Blocked frontend plan: None — PLAN_43 proceeds without this endpoint using individual requests. This endpoint is a drop-in replacement once available.
- Clarifications required:
  - [ ] Should the bulk endpoint enforce a maximum number of `client_ids` per request? — frontend will cap at 20 on its side regardless, but the backend should document its own limit.
  - [ ] If one `client_id` in the list does not exist or the user does not have access, should the endpoint return a partial result (omitting the missing cases) or a 404? — frontend preference is partial result so one bad ID does not break the prefetch for valid cases.

## Expected backend deliverables

1. New endpoint `GET /api/v1/cases/bulk` that accepts a comma-separated `client_ids` query param and returns an array of case detail objects (without message history).
2. Only cases the authenticated user is a participant of are returned. Cases the user cannot access are silently omitted (no error for missing IDs).
3. Response follows the standard API envelope: `{ "ok": true, "data": { "cases": [...] } }`.
4. Each case object in the array matches the existing `GET /api/v1/cases/:id` response shape minus the `messages` / `conversation` payload — or with `messages_limit: 0` semantics.

## Interface expectations

- Endpoint: `GET /api/v1/cases/bulk`
- Auth: JWT required

- Request shape:
```http
GET /api/v1/cases/bulk?client_ids=ca_01A,ca_01B,ca_01C
Authorization: Bearer <token>
```

- Response shape:
```json
{
  "ok": true,
  "warnings": [],
  "data": {
    "cases": [
      {
        "client_id": "ca_01A",
        "title": "Missing item — chair #42",
        "state": "open",
        "case_type": { "client_id": "ct_01", "name": "Missing item" },
        "created_at": "2026-05-28T10:00:00Z",
        "updated_at": "2026-05-30T08:00:00Z",
        "linked_entity": {
          "entity_type": "task",
          "entity_client_id": "tsk_01..."
        },
        "participants": [
          { "client_id": "cpa_01", "user_id": "usr_01", "display_name": "Ana" }
        ],
        "last_message_seq": 12
      }
    ]
  }
}
```

- Field notes:
  - `messages` / `conversation` array is intentionally absent (prefetch caches metadata, not message history — messages load lazily when the user scrolls).
  - `last_message_seq` is required so the frontend can determine whether to mark the conversation as fully read after the user opens it.
  - Response order does not need to match the request order. Frontend reconciles by `client_id`.
  - Cases not found or not accessible to the authenticated user are silently omitted from the array (no 404).

- Error cases:
  - `400`: `client_ids` param missing or empty → return error.
  - `401`: invalid/missing JWT.
  - `500`: unexpected server error.

- Socket events: None.

## Frontend contract implications

- When this endpoint is available, `packages/cases/src/api/prefetch-cases.ts` (introduced in PLAN_43) will be updated to use a single `GET /api/v1/cases/bulk` call instead of N individual `GET /api/v1/cases/:id` calls.
- The React Query cache population logic stays identical — the bulk response is split per-case and written to individual `caseKeys.detail(id)` cache entries, exactly as today.
- No changes to `case-keys.ts` or any existing query hook.
- Architecture contracts affected: none (internal API function change only).

## Trace links

- Frontend prefetch utility: `packages/cases/src/api/prefetch-cases.ts` (PLAN_43, Step 3)
- Existing single-case endpoint: `GET /api/v1/cases/:id` (`packages/cases/src/api/get-case.ts`)
- Existing unread counts endpoint: `GET /api/v1/cases/unread-counts` (returns case IDs used to drive this prefetch)
