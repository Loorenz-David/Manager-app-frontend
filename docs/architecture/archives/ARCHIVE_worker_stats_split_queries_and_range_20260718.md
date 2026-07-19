# ARCHIVE_worker_stats_split_queries_and_range_20260718

## Metadata

- Archive ID: `ARCHIVE_worker_stats_split_queries_and_range_20260718`
- Source plan: `docs/architecture/archives/implementation/PLAN_worker_stats_split_queries_and_range_20260718.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_worker_stats_split_queries_and_range_20260718.md`
- Archived at (UTC): `2026-07-18T17:49:20Z`

## Lifecycle result

- The worker stats combined roster request was replaced with parallel split queries for last steps, totals, and insights.
- Date range selection is shared by totals and granularity drill-down requests through `date_from`/`date_to`.
- The implementation passed `npm run typecheck` and the stats Vitest suite.
