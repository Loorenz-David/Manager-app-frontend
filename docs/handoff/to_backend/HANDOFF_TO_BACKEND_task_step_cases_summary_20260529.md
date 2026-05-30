# HANDOFF_TO_BACKEND_task_step_cases_summary_20260529

## Metadata

- Handoff ID: `HANDOFF_TO_BACKEND_task_step_cases_summary_20260529`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Last updated at (UTC): `2026-05-29T00:00:00Z`
- Owner agent: `claude-sonnet-4-6`
- Source frontend plan: `docs/architecture/under_construction/implementation/PLAN_36_task_step_cases_summary_live_routing_20260529.md`

> **Correction note (2026-05-29):** The original shape (4 fields) has been simplified. The frontend now derives `open_resolving_count`, `unread_case_count`, and `single_unread_case_id` itself via live case queries in the task detail controller. The backend only needs to provide `total_unread` — the one value the frontend cannot cheaply derive at list-fetch time. If the 4-field shape is already implemented, please drop the three fields and keep only `total_unread`.

## Request to backend

- Required backend behavior: Embed a `cases_summary` object on each task step record returned by the task steps list endpoint containing only the authenticated user's total unread message count across all open/resolving cases linked to that task.
- User-facing impact: Workers see a notification badge on task cards showing how many unread case messages they have. All routing logic (creation vs. list vs. conversation) is now derived on the frontend from live case queries — not from this field.
- Desired timeline: As soon as possible. Frontend Zod schema uses `.nullable().optional()` so it tolerates the field being absent or having the old 4-field shape — badges simply do not render until the field is present.

## Frontend context

- Why the frontend needs this: Task card badges need `total_unread` at list-fetch time so every card in the task list can show its badge without issuing per-task follow-up queries. This is the only field that cannot be cheaply derived from existing cached data at that point.
- Blocked frontend plan: `docs/architecture/under_construction/implementation/PLAN_36_task_step_cases_summary_live_routing_20260529.md`
- Clarifications required:
  - [ ] Should `total_unread` count unread from all participants or only the authenticated worker? — frontend assumes it is scoped to the current user (the worker's own unread count). If it is global, the badge semantics change.
  - [ ] When a task has no linked cases, should `cases_summary` be `null` or `{ total_unread: 0 }`? — frontend handles both, but `{ total_unread: 0 }` is preferred to avoid null checks.

## Expected backend deliverables

1. Each task step object in the list response includes a `cases_summary` field with the shape described below.
2. `cases_summary` is always present (not absent) — a task with no open/resolving cases returns `{ "total_unread": 0 }`.
3. `total_unread` is scoped to the authenticated user (the worker), not a global total.
4. The sub-query is non-blocking: if it fails, return `{ "total_unread": 0 }` rather than failing the entire step list response.
5. **If the 4-field shape from the original handoff is already implemented:** remove `open_resolving_count`, `unread_case_count`, and `single_unread_case_id`. The frontend no longer reads them — keeping them wastes payload and query cost.

## Interface expectations

- Endpoint(s): `GET /working-sections/:working_section_id/steps` (the existing task steps list endpoint used by `useWorkingSectionStepsQuery`)
  - No new endpoint needed; this is an additive field on existing response items.

- Request shape: unchanged

- Response shape — each item in the `items` array gains:

```json
{
  "client_id": "stp_01...",
  "task_id": "tsk_01...",
  "state": "working",
  "...(existing fields)": "...",
  "cases_summary": {
    "total_unread": 5
  }
}
```

**Field semantics:**

| Field | Type | Meaning |
|---|---|---|
| `total_unread` | `int ≥ 0` | Total unread message count across all open/resolving cases linked to this task, for the authenticated user. |

**Zero state:**

```json
"cases_summary": {
  "total_unread": 0
}
```

- Error cases: If the unread count sub-query fails, return `{ "total_unread": 0 }` — do not fail the step list response.

- Socket events: None required. Real-time badge updates are deferred to a future plan.

## Frontend contract implications

- `CasesSummarySchema` in `apps/workers-app/.../features/task_steps/types.ts` is simplified to `z.object({ total_unread: z.number().int() })` as part of PLAN_36.
- Routing logic (`open_resolving_count`, `unread_case_count`, `single_unread_case_id`) is now computed by the task detail controller from `useListCasesQuery` + `useUnreadCountsQuery` — these are already invalidated by `useUpdateCaseState.onSettled`.

## Linking cases to a task

Cases are linked to tasks via the `case_links` table with:
- `entity_type = "task"`
- `entity_client_id = task.client_id`

Unread counts are computed from `case_participants` using the authenticated user's `last_read_message_seq` vs. the case's `last_message_seq`, summed across all cases in state `open` or `resolving` linked to the task.

## Trace links

- Original handoff (4-field shape): superseded by this document
- Related frontend plan: `docs/architecture/under_construction/implementation/PLAN_36_task_step_cases_summary_live_routing_20260529.md`
