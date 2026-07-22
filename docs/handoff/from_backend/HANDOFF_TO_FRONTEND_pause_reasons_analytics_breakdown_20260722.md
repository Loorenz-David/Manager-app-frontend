# HANDOFF_TO_FRONTEND_pause_reasons_analytics_breakdown_20260722

## Metadata

- Handoff ID: `HANDOFF_TO_FRONTEND_pause_reasons_analytics_breakdown_20260722`
- Created at (UTC): `2026-07-22T14:00:00Z`
- Owner agent: `codex`
- Status: **implemented**
- Source plan: `PLAN_custom_pause_reasons_20260722`

## TL;DR

Worker linear timeline breakdowns now use opaque `pause_reason_id` client IDs as the keys in
`timeline.pause_by_reason` and segment `reason` fields. The response includes a sibling lookup map
so the frontend can render names and images without one request per bucket.

## Changed response shape

`GET /api/v1/worker-stats/{user_id}/linear-timeline` keeps its existing `user`, `timeline`, and
`segments` fields and adds:

```json
{
  "pause_reasons": {
    "par_01...": {
      "name": "Lunch break",
      "image_url": null,
      "pause_type": "personal"
    }
  }
}
```

Use `timeline.pause_by_reason` keys and each segment/detail `reason` value to index this map. A
missing map entry usually means the referenced reason was deleted; render a fallback using the ID
rather than failing the timeline — **except** for the reserved key below, which is expected to
have no map entry.

### The `"unspecified"` key

A **paused** segment's `reason` is never `null` — when the underlying `StepStateRecord` has no
`pause_reason_id`, the sweep substitutes the literal string `"unspecified"` as both the segment
`reason` and the `pause_by_reason` bucket key. This key will **never** appear in the `pause_reasons`
lookup map (it isn't a real `pause_reasons` row), so treat it as its own case rather than a
deleted/missing reason — e.g. render it as "No reason specified" instead of falling back to a
raw-ID placeholder. `reason: null` only occurs on non-paused segments (`working`/`idle`/
`ended_shift`), which don't participate in `pause_by_reason` at all.

## Compatibility notes

- `pause_by_reason` values remain integer seconds.
- The roster linear-timeline endpoint still contains worker-level pause buckets sourced from
  `UserShiftStateRecord`; this handoff covers the drill-down breakdown response.
- Fetch the CRUD list for richer fields when needed; this lookup intentionally contains only
  `name`, `image_url`, and `pause_type`.
