---
plan: PLAN_item_valuation_wiring_20260819
role: reviewer
round: 0
state: PROJECTED
verdict: AMENDMENTS_APPLIED
actor: Claude (coordinator, plan-projection doctrine — run inline with owner
  knowledge; the owner asked for the implementer prompt directly and the gate is
  mandatory, so the projection was executed rather than skipped)
date: 2026-08-19
---

# Projection handoff — phase 2 (wiring + entry + e2e), round 0

**Summary:** 6 ledger rows, all resolved by immediate amendment to the phase-2 plan
(same session, coordinator authority); **0 owner cards**. The implementer prompt may
compile.

## ⚠ OWNER DECISIONS REQUIRED (0)

None. (The T8 unpriced-adopt card from 1B remains open upstream; on silence it
ships as implemented.)

## Decision ledger (all resolved in-plan this session)

| # | What was undetermined | Resolution (now in the plan) |
|---|---|---|
| P1 | Exact API paths for the PUT/commit endpoints (handoff paths are root-relative) and how much of their responses to schema | Frozen in task 1: all under `ITEM_ECONOMICS_BASE_PATH` (`types.ts:13`, verified `/api/v1/item-economics`); minimal response schemas named field-by-field |
| P2 | Mechanism for the M8 neutral notice and error toasts | `notify` from `@beyo/lib` — verified as the `use-force-task-ready.controller.ts:4` idiom |
| P3 | Where the current user id comes from for the "You" substitution | `useAuth()` from `@beyo/auth` (verified export), `user.client_id` compare — task 6 |
| P4 | Debounce timer needs a `queryClient` after the events stop | module-scope latest-client capture — Notes |
| P5 | What seeds the Playwright/page-test mocks | the phase-1 plan's Reference payload JSON, never the component fixtures (also resolves r2 N10's absolute-timestamp hazard) — Notes |
| P6 | r2 carry-forwards N8–N11 had no criteria | new criteria 22e (numbers meet arithmetic once — exact strings hand-derived: "1 425", "2h 25m", "3h 25m"), 22f (three-row provenance composition incl. the non-empty avatar slot), 22g (a11y) |

## Reality checks

- `ITEM_ECONOMICS_BASE_PATH = "/api/v1/item-economics"` ✅ (`types.ts:13`)
- `notify` exported from `@beyo/lib`, used by `packages/tasks` controllers ✅
- `useAuth` exported from `@beyo/auth` ✅
- `packages/tasks/package.json` already peers on `@beyo/item-economics` **and**
  `@beyo/items` ✅ (menu-row import needs no dependency change)
- `packages/item-economics/package.json` does **not** yet peer on `@beyo/items` —
  the plan's task list already carries that edit ✅
- Surfaces registry, menu page, socket-events, `fetchItemLookup`, key placement:
  all verified during grounding and phase 1; unchanged ✅

## Criteria decidability

22a–22g, 1–24: each names one payload/fixture and one exact outcome; the 22e strings
were hand-derived through the phase-1 pipeline (855 000 → 8 681 s → "2h 25m";
per-piece 855 000 ÷ 600 = 1 425 exactly; typical 12 300 s → "3h 25m") and
cross-checked against the r1 reviewer's independent vector table. No criterion
references an uncaptured external fact.

## Write perimeter

This handoff; the phase-2 plan amendments (tasks 1/6/11a already present + Notes +
criteria 22e–22g); master plan tracker row; no code.
