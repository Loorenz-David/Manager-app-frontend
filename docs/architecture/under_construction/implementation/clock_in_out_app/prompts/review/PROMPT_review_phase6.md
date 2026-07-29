# Opus review — Phase 6: clock-out summary

You are the **implementation reviewer** for one phase of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. A Codex session implemented the analytics mapping + adapter layer on top of a read-only Claude summary kit. The dangerous failure mode here is **fabricated data**: the design shows tiles the backend cannot feed yet. **You change no code.**

## Inputs

- Phase plan: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase6_clock_out_summary_20260729.md` (or archived in `docs/architecture/archives/implementation/`).
- Implementation summary: `docs/architecture/implemented_summaries/SUMMARY_clock_kiosk_phase6_clock_out_summary_20260729.md`.
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md` — the GAP rows of the mapping table + decision #11.
- Backend ground truth: handoff §5.1. GAP spec: `BACKEND_REQUIREMENTS_clock_kiosk_20260729.md` #1–#5.
- Design ground truth: `image_design/clock_out_result.png` + `clock_in_result.png` + readme (phone ordering rule).

## Read in order

Master (GAP rows, decision #11) → phase plan → summary → contract guide → the diff on `packages/clock-kiosk` → handoff §5.1 → backend requirements doc.

## Phase-specific checklist (beyond the plan's criteria)

1. **Null degradation (hard rule)** — `analytics: null` renders exactly the Phase 4 plain screen; find and run the regression test. Partial data degrades per-tile without crashes; unknown keys ignored.
2. **No fabricated data** — with production defaults, every GAP section (items, week, rate, scheduled column, announcements) is absent; nothing estimates units/hour or week hours client-side from data that doesn't exist. The dev showcase fixtures are unreachable without the dev flag (verify the gating, not the intent).
3. **Marker math** — IN/OUT/worked from the `started_shift`/`ended_shift` markers (wall-clock span), not bucket sums; time zone applied via the workspace claim; formats match the design ("8h 12m", mono HH:mm).
4. **Insight honesty** — rows are factual statement + signed delta per the design rule; unknown codes fall back to the neutral generic line; no client-side "correction" of the freshness caveat.
5. **Single mapping module** — all analytics math in one pure, tested module; components receive finished view models; no date/duration arithmetic in components.
6. **Adapter seam** — `KioskAdapters` injected via provider props, defaults null/empty, floor app passes nothing; interfaces match what `BACKEND_REQUIREMENTS` promises the backend will feed.
7. **Kit integrity** — diff kit components since the kit commit: no DOM/class/styling changes; additive optional props only.
8. **Phone ordering** — hours → insights → items → week on the phone breakpoint (Playwright or component test evidence).
9. **Validation evidence** — re-run typecheck, `test:clock-kiosk`, and the `kiosk-summary` Playwright specs (mobile then desktop) yourself.
10. **Lifecycle bookkeeping** — summary, archive move, master Review log entry, master otherwise untouched.

## Output

- **Verdict**: pass / pass-with-notes / defects found — with checklist #1 and #2 explicitly dispositioned.
- Findings ranked by severity with file:line + violated rule.
- If defects: create `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase6_corrections_<YYYYMMDD>.md` from the TEMPLATE_PLAN, fixes-only, linked, each finding routed **Codex (logic) or Claude (visual) — say which per finding**.
- Append a dated review entry to the master plan's Review log.
- Do not modify implementation code, kit components, or the archived phase plan.
