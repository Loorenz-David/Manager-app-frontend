# HANDOFF_TO_FRONTEND_worker_stats_inaccurate_time_estimation_20260718

## Metadata

- Handoff ID: `HANDOFF_TO_FRONTEND_worker_stats_inaccurate_time_estimation_20260718`
- Created at (UTC): `2026-07-18T00:00:00Z`
- Owner agent: `codex`
- Status: **implemented**
- Source plan: `docs/architecture/archives/implementation/PLAN_inaccurate_time_estimation_strategies_20260718.md`

## Contract summary

The backend now exposes three alternatives for time in the existing inclusive-range
worker-stats views:

- `trusted`: persisted time whose step is not flagged inaccurate.
- `wasted`: persisted time from flagged steps; it is diagnostic and must not be added to trusted.
- `trusted + estimated_fill`: the manager-facing usable view. The frontend performs this final sum.

`wasted` and `estimated_fill` are never summed together.

## `/worker-stats/totals`

Existing range shape is unchanged apart from an additive `time_quality` block inside
`daily_stats`:

```jsonc
{
  "daily_stats": {
    "date_from": "2026-07-01",
    "date_to": "2026-07-18",
    "total_working_seconds": 129600,
    "total_pause_seconds": 21600,
    "total_completed_count": 42,
    "time_quality": {
      "strategy": "mean",
      "trusted_sample_size": 39,
      "working": {
        "trusted": 120000,
        "wasted": 9600,
        "inaccurate_step_count": 3,
        "estimated_fill": 10800.0
      },
      "paused": {
        "trusted": 18000,
        "wasted": 3600,
        "inaccurate_step_count": 3,
        "estimated_fill": 2400.0
      }
    }
  }
}
```

`time_quality.working` and `.paused` are the components to render. The backend
accepts `time_strategy=mean|median|iqr`; the default is **`median`** (robust to a few
long steps — the `mean` can badly overestimate on skewed data, so it's opt-in for a
cheaper/faster listing). The mean uses the grouped range aggregates only:

`inaccurate_step_count × trusted_state_seconds / (total_completed_count - inaccurate_step_count)`

Median/IQR use a worker × working-section sample from the fixed 28-day lookback ending
at `date_to`; fewer than four trusted per-step samples fall back to that section's stored mean.

> **Confidence / low-data floor (important).** The mean denominator above is the count of
> **trusted completed steps** — surfaced as **`time_quality.trusted_sample_size`**. When it is
> **below 4** the estimate is statistically meaningless (a tiny denominator explodes the
> per-step average — e.g. 18 flagged steps extrapolated from 2 trusted steps gave an 84-hour
> pause estimate), so the backend **forces `estimated_fill = 0`**. So:
> - `trusted_sample_size >= 4` → `estimated_fill` is usable.
> - `trusted_sample_size < 4` → `estimated_fill` is `0` by design; **render only `trusted` + `wasted`** and, if useful, a "not enough trusted data to estimate" hint. Do **not** treat the `0` as "no wasted time."
>
> Use `trusted_sample_size` as your confidence gate rather than reading the estimate blindly.
> The same field appears on `/{user_id}/daily-steps` inside `daily_stats.time_quality`, and the
> same floor is applied per working-section to the drill-down's per-step estimates.

> **Grain note (not a data bug).** On `/totals`, `mean` is computed at the **worker level**
> (pooled across all sections), while `median`/`iqr` are computed **per working-section and
> summed**. So switching strategy can change the fill by more than just the statistic — the two
> use different grains by design (mean is the free aggregate approximation; median/iqr are the
> precise per-section estimate). Don't treat a mean-vs-median gap as an inconsistency. The
> per-section drill-down on `/{user_id}/daily-steps` reconciles them.

## `/{user_id}/daily-steps`

The existing range parameters remain `date_from` and `date_to`. Add:

- `time_strategy=mean|median|iqr` — selects **only** the top-level `usable` total (default `mean`). It does **not** affect `estimated`/`estimated_fill_by_strategy`, which always return all three real strategies (the sample is loaded on every request) so you can compare them regardless of the selected strategy.
- `only_inaccurate=true` — returns only flagged steps.

The response keeps `totals` as trusted-only and adds:

```jsonc
{
  "totals": { "working_seconds": 0, "pause_seconds": 0, "ended_shift_seconds": 0, "completed_count": 1 },
  "usable": { "working_seconds": 1800, "pause_seconds": 300, "ended_shift_seconds": 0, "completed_count": 1 },
  "wasted": { "working_seconds": 3600, "pause_seconds": 600, "ended_shift_seconds": 0, "completed_count": 0 },
  "estimated": {
    "mean": { "working_seconds": 1800, "pause_seconds": 300, "ended_shift_seconds": 0, "completed_count": 0 },
    "median": { "working_seconds": 1500, "pause_seconds": 240, "ended_shift_seconds": 0, "completed_count": 0 },
    "iqr": { "working_seconds": 1620, "pause_seconds": 260, "ended_shift_seconds": 0, "completed_count": 0 }
  },
  "inaccurate_step_count": 1,
  "time_strategy": "mean",
  "steps": {
    "items": [
      {
        "is_time_inaccurate": true,
        "contribution": { "working_seconds": 0, "pause_seconds": 0, "ended_shift_seconds": 0, "completed_count": 1 },
        "wasted": { "working_seconds": 3600, "pause_seconds": 600, "ended_shift_seconds": 0, "completed_count": 0 },
        "estimated_fill_by_strategy": {
          "working": { "mean": 1800.0, "median": 1500.0, "iqr": 1620.0 },
          "paused": { "mean": 300.0, "median": 240.0, "iqr": 260.0 },
          "ended_shift": { "mean": 0.0, "median": 0.0, "iqr": 0.0 }
        },
        "inaccurate_records": [
          { "record_id": "ssr_…", "state": "working", "entered_at": "…", "exited_at": "…", "wasted_seconds": 3600.0 }
        ]
      }
    ]
  }
}
```

The frontend should render `usable` for the selected strategy and use `wasted` only
for diagnostics. `estimated` and `estimated_fill_by_strategy` are available for
side-by-side strategy comparison.

## Trace links

- Source plan: `docs/architecture/archives/implementation/PLAN_inaccurate_time_estimation_strategies_20260718.md`
- Prior range contract: `docs/handoff/to_frontend/HANDOFF_TO_FRONTEND_worker_stats_date_range_20260718.md`
- Prior endpoint split: `docs/handoff/to_frontend/HANDOFF_TO_FRONTEND_worker_stats_endpoint_split_20260718.md`
