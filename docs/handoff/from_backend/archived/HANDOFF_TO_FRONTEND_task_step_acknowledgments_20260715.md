# HANDOFF_TO_FRONTEND_task_step_acknowledgments_20260715

## Metadata

- Handoff ID: `HANDOFF_TO_FRONTEND_task_step_acknowledgments_20260715`
- Created at (UTC): `2026-07-15T18:55:00Z`
- Owner agent: `claude`
- Source plan: `—` (implemented directly)
- Source summary: `—`

## Concept

When steps are added to a task that has **already reached `ready`**, the task is reopened
(`ready → working`) and the already-assigned worker gets new work they may not notice. This is a
**reassignment**. Each newly added, worker-assigned step now produces a durable **acknowledgment
obligation**: a per-worker read receipt the worker must first **see** and then explicitly
**acknowledge**. The frontend can attach a free-text `reason` at add time (an opaque string the
backend stores as-is; display it however you like) explaining the reassignment.

This is separate from the existing transient "New work available" push notification — that fires and
is gone; these rows persist and are queryable until acknowledged.

## Backend delivery context

- New table `task_step_acknowledgments` (one row per `(step, worker)`).
- New optional field `reason` on **each step** in the existing add-task-steps request
  (`POST /api/v1/tasks/{task_id}/steps`) — opaque free text, stored as-is on that step's acknowledgment.
- New router `/api/v1/task-step-acknowledgments` with three routes:
  - `GET /pending` — the caller's own unacknowledged obligations (full step payload each).
  - `POST /seen` — mark obligations as seen (passive view receipt).
  - `POST /acknowledge` — explicitly acknowledge (clears them from `pending`).
- Obligations are created **only** on the reopen (reassignment) path, and **only** for steps that
  already have an `assigned_worker_id`. If the manager reassigns a step to **themselves**, that row
  is pre-acknowledged (never surfaces).

## Frontend action required

1. When adding steps to a **ready** task, optionally send `reason` (string) on each step so the
   reassigned worker sees why. For a single shared reason, put the same string on every step.
2. On the worker's app, poll `GET /pending` (or refresh on the relevant realtime/notification signal)
   to show a "new work assigned to you" queue. Render each item with the existing resume-card/step-card
   renderer — the payload is the same shape as the worker resume-card endpoint, **plus** an
   `acknowledgment` block.
3. When the worker opens/scrolls the queue, call `POST /seen` with the visible `step_ids` to record
   the first-seen timestamp (optional but recommended for manager visibility).
4. When the worker taps "Got it", call `POST /acknowledge` with those `step_ids`. Acknowledged items
   drop out of `pending` on the next fetch.
5. Render `acknowledgment.reason` however you present reassignment reasons (e.g. truncated).

## Interface details

All routes require auth. Allowed roles: `ADMIN`, `MANAGER`, `WORKER`. **Every route is scoped to the
caller's own `user_id`** — you always operate on *your* obligations; there is no "view another worker's
acknowledgments" here.

### 1. `reason` on add-task-steps (existing route, new per-step field)

The add-steps body is unchanged in shape — still a **JSON array of step objects**. Each step object
gains an optional `reason` (opaque string; the backend stores it verbatim). No other route change.

```json
POST /api/v1/tasks/tsk_…/steps
[
  {
    "working_section_id": "wsec_…",
    "worker_id": "usr_…",
    "reason": "Customer added a second cushion — please redo the seat."
  }
]
```

- `reason` is only meaningful when the add reopens a `ready` task (a reassignment). On a non-ready
  task no obligations are created and the `reason` is ignored (stored nowhere).
- It is per-step. For one shared reason across a multi-step reassignment, send the same string on
  each step; each step's obligation stores its own `reason`, surfaced back as `acknowledgment.reason`.
- A step with no assigned worker creates no obligation, so its `reason` is dropped.

### 2. `GET /api/v1/task-step-acknowledgments/pending`

The caller's unacknowledged obligations, newest first.

- Query params:
  - `limit` — default `50`, max `200`.
  - `offset` — default `0`, must be `≥ 0`.

Response — each item is the **full resume-card step payload** (same shape as the worker-facing
step-record endpoint) **plus** an `acknowledgment` object:

```json
{
  "data": {
    "acknowledgments": [
      {
        "client_id": "tsp_01KX…",
        "task_id": "tsk_…",
        "state": "working",
        "readiness_status": "ready",
        "sequence_order": 2,
        "working_section_id": "wsec_…",
        "assigned_worker_id": "usr_wrk_…",
        "total_dependencies": 0,
        "completed_dependencies": 0,
        "working_section_name_snapshot": "Upholstery",
        "assigned_worker_display_name_snapshot": "Ana",
        "created_at": "2026-07-15T18:00:00+00:00",
        "closed_at": null,
        "ready_by_at": "2026-07-16T12:00:00+00:00",
        "total_working_seconds": 0,
        "total_pause_seconds": 0,
        "total_ended_shift_seconds": 0,
        "total_working_count": 0,
        "total_pause_count": 0,
        "total_ended_shift_count": 0,
        "total_issues_count": 0,
        "total_issues_resolved_count": 0,
        "total_cost_minor": 0,

        "updated_at": "2026-07-15T18:00:00+00:00",
        "created_by": { "client_id": "usr_mgr_…", "username": "manager", "profile_picture": null },
        "updated_by": null,

        "last_state_record": {
          "state": "pending",
          "entered_at": "2026-07-15T18:00:00+00:00",
          "exited_at": null,
          "last_action_by": { "client_id": "usr_mgr_…", "username": "manager", "profile_picture": null },
          "first_started_at": "2026-07-15T18:00:00+00:00"
        },

        "task": {
          "client_id": "tsk_…",
          "task_type": "internal",
          "priority": "normal",
          "state": "working",
          "return_source": null,
          "item_location": null,
          "ready_by_at": "2026-07-16T12:00:00+00:00",
          "scheduled_start_at": null,
          "scheduled_end_at": null,
          "return_method": null
        },

        "item": {
          "client_id": "itm_…",
          "article_number": "ABC-123",
          "sku": "SKU-1",
          "state": "fixing",
          "item_category_id": "icat_…",
          "quantity": 1,
          "item_position": null,
          "item_zone": null,
          "upholstery_requirement": [
            {
              "client_id": "iur_…",
              "item_upholstery_id": "iup_…",
              "upholstery_id": "uph_…",
              "state": "available",
              "source": "internal",
              "amount_meters": 3.5
            }
          ]
        },

        "item_images": [],

        "cases_summary": { "total_unread": 0 },

        "acknowledgment": {
          "client_id": "tsa_…",
          "step_id": "tsp_01KX…",
          "task_id": "tsk_…",
          "reason": "Customer added a second cushion — please redo the seat.",
          "worker": { "client_id": "usr_wrk_…", "username": "ana", "profile_picture": null },
          "created_by": { "client_id": "usr_mgr_…", "username": "manager", "profile_picture": null },
          "first_seen_at": null,
          "acknowledged_at": null,
          "created_at": "2026-07-15T18:00:00+00:00"
        }
      }
    ],
    "acknowledgments_pagination": {
      "has_more": false,
      "limit": 50,
      "offset": 0
    }
  },
  "ok": true,
  "warnings": []
}
```

Notes on the reused step payload:
- It is byte-for-byte the same builder as the existing worker resume-card endpoint, so reuse your
  renderer. `cases_summary.total_unread` **is** included here (the viewer is the step's own worker, so
  the count is meaningful — unlike the manager `worker-stats` endpoint, which omits it).
- `item` is `null` when the task has no primary item; `item_images` is `[]` when there are none. The
  first `item_images` entry is a full image object, the rest are the "light" image shape (same as the
  resume-card endpoint).
- Only **live** steps appear: soft-deleted steps are filtered out. Already-acknowledged obligations
  never appear.

### The `acknowledgment` block

| Field | Type | Meaning |
|---|---|---|
| `client_id` | string (`tsa_…`) | The acknowledgment row id. |
| `step_id` | string (`tsp_…`) | The step being acknowledged. Use this in `/seen` and `/acknowledge`. |
| `task_id` | string (`tsk_…`) | The task the step belongs to. |
| `reason` | string \| null | The opaque free-text string the frontend sent for this step. `null` if none was sent. |
| `worker` | object \| null | The obligated worker (`{client_id, username, profile_picture}`). Here, it's you. |
| `created_by` | object \| null | Who added the step / triggered the reassignment (same compact user shape). |
| `first_seen_at` | ISO 8601 \| null | When you first marked it seen. `null` until `/seen`. |
| `acknowledged_at` | ISO 8601 \| null | Always `null` in `pending` (acknowledged rows are excluded). |
| `created_at` | ISO 8601 | When the obligation was created. |

### 3. `POST /api/v1/task-step-acknowledgments/seen`

Records the first-seen timestamp (idempotent — only sets it the first time; never un-sets, never
acknowledges).

Request:
```json
{ "step_ids": ["tsp_…", "tsp_…"] }
```
Response:
```json
{ "data": { "seen_step_ids": ["tsp_…"] }, "ok": true, "warnings": [] }
```
`seen_step_ids` are the ones that were actually updated (previously unseen, yours, still live). Sending
a step you don't own, an already-seen one, or an unknown id is a no-op for that id — no error.

### 4. `POST /api/v1/task-step-acknowledgments/acknowledge`

Marks obligations acknowledged. Idempotent; acknowledging also backfills `first_seen_at` if it was
never set (acknowledging implies seeing).

Request:
```json
{ "step_ids": ["tsp_…", "tsp_…"] }
```
Response:
```json
{ "data": { "acknowledged_step_ids": ["tsp_…", "tsp_…"] }, "ok": true, "warnings": [] }
```
`acknowledged_step_ids` are the ones that flipped from pending → acknowledged on this call. After this,
those items disappear from `GET /pending`.

Body validation for both `POST` routes: `step_ids` must be a non-empty array (max 200); duplicates are
de-duplicated server-side. An empty array → `422`.

## Enum value reference

Every enum below is serialized as its lowercase string `value`. Treat unknown future values as
ignorable rather than crashing.

| Field (location) | Enum | Values |
|---|---|---|
| `state` (step, `last_state_record.state`) | TaskStepState | `pending`, `working`, `paused`, `ended_shift`, `blocked`, `completed`, `skipped`, `failed`, `cancelled` |
| `readiness_status` (step) | TaskStepReadinessStatus | `blocked`, `partial`, `ready` |
| `task.state` | TaskState | `pending`, `assigned`, `working`, `stalled`, `ready`, `resolved`, `failed`, `cancelled` |
| `task.task_type` | TaskType | `return`, `pre_order`, `internal` |
| `task.priority` | TaskPriority | `low`, `normal`, `high`, `urgent` |
| `task.return_source` | TaskReturnSource | `after_purchase`, `before_purchase`, `store_return` (nullable) |
| `task.item_location` | TaskItemLocation | `store`, `customer` (nullable) |
| `task.return_method` | TaskReturnMethod | `drop_off_by_customer`, `pickup` (nullable) |
| `item.state` | ItemState | `pending`, `stalled`, `fixing`, `ready` |
| `item.upholstery_requirement[].state` | ItemUpholsteryRequirementState | `missing_quantity`, `available`, `needs_ordering`, `ordered`, `in_use`, `completed`, `failed` |
| `item.upholstery_requirement[].source` | ItemUpholsterySource | `internal`, `customer` |

The `acknowledgment` block carries **no enums** — `reason` is free text; the two state fields are
nullable timestamps.

## Suggested acknowledge flow (client)

1. `GET /pending` → render queue.
2. On render, `POST /seen` with the visible `step_ids`.
3. On "Got it", `POST /acknowledge` with those `step_ids`, then optimistically remove them or re-fetch
   `/pending`.

## Error cases

- `401`: missing or invalid authentication.
- `403`: caller lacks `ADMIN` / `MANAGER` / `WORKER`.
- `422`: `POST` body `step_ids` empty or malformed; `limit`/`offset` out of range on `GET`.

## Validation notes

- Backend verified end-to-end against migrated local PostgreSQL (inside a rolled-back transaction):
  reopen creates exactly one obligation carrying the sent `reason`; `GET /pending` returns the full
  step payload + `acknowledgment`; `POST /acknowledge` clears it from pending and backfills
  `first_seen_at`.
- Model ↔ Alembic migration columns/indexes verified identical.
- Existing add-task-steps non-reopen tests still pass (no regression).

## Migration

- Revision `f1a2b3c4d5e6` (`add_task_step_acknowledgments`), down-revision `e4a7c9d2b18f`. Apply with
  `alembic upgrade f1a2b3c4d5e6`. (The repo currently has multiple Alembic heads — pre-existing — so
  target this revision explicitly rather than `head`.)

## Trace links

- Router: `backend/app/beyo_manager/routers/api_v1/task_step_acknowledgments.py`
- Query: `backend/app/beyo_manager/services/queries/task_step_acknowledgments/list_pending_step_acknowledgments.py`
- Commands: `backend/app/beyo_manager/services/commands/task_step_acknowledgments/`
- Model: `backend/app/beyo_manager/models/tables/tasks/task_step_acknowledgment.py`
- Related: `HANDOFF_TO_FRONTEND_worker_stats_last_interacted_steps_20260715.md` (same step payload shape)
```
