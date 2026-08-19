---
plan: PLAN_item_valuation_core_20260819
role: reviewer
round: 0
date: 2026-08-19
---

# Projection session — phase 1 (core + components), round 0

You are the **projectionist** for phase 1 of the `item_valuation_edition` project.
Invoke the **plan-projection** skill now and follow its doctrine for this session.
This gate is mandatory (the phase touches silent-failure mechanisms M2–M7, M11–M13),
and no implementer prompt will be compiled until your handoff's ledger is fully
routed.

## Project root

`docs/architecture/under_construction/implementation/item_valuation_edition/`
(all relative paths below resolve from the `frontend/` repo root).

## Read first (complete context — do not rediscover)

1. `docs/architecture/under_construction/implementation/item_valuation_edition/master_plan.md`
   — §5 contract resolution, §6 naming registry, §9 standing rules, §10 environment.
2. `docs/architecture/under_construction/implementation/item_valuation_edition/plans/PLAN_item_valuation_core_20260819.md`
   — the phase plan you are projecting (both tracks, all 55 criteria).
3. `docs/architecture/under_construction/implementation/item_valuation_edition/planning/intention.md`
   — §3.2, §3.4–3.5, and **§4A mechanism contracts** (the semantic authority the
   criteria cite).
4. `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_price_scenario_20260819.md`
   — §2, §4, §5, §9 (payload, arithmetic reference implementation, null semantics,
   validation vectors).

## Your job (per the skill; summarized, the skill wins on conflict)

Do the implementer's first hour **on paper**, for each track, from the artifacts
alone:

- Walk Track 1B task by task (DTO → math → draft machine → screen state →
  currency/format → key registry) and Track 1A (prop shapes → fixtures → components
  → slider → tests), recording in a **decision ledger** every decision the plan
  fails to determine — anything you would have to invent (a type, a rounding
  direction, a prop default, a file the registry forgot, an ambiguous criterion).
- **Verify against the real codebase** (read-only): every cited path exists
  (`packages/item-economics/src/types.ts:38`, `api/item-economics-keys.ts`,
  `@beyo/ui` Avatar, `components/production-time/*`); every criterion is decidable
  as written (can a test assert it with exactly one expected outcome?); the naming
  registry collides with nothing that already exists; the fixture set named in 1A
  task 2 is buildable from the DTO shape.
- Check the criteria against the charter's quality rules — especially: enumerations
  actually total (T1–T9, S-state adjacent pairs, currency rows), each fixture makes
  its own predicate the only reason its expected outcome holds, named mutations name
  file + definition-vs-call-site.
- Two seams worth extra suspicion, flagged by the coordinator:
  1. The **1A/1B prop seam** — the plan fixes prop *categories* (strings, tones,
     fractions, callbacks) but not the full prop list per component. Decide whether
     that is prompt-time refinement (acceptable, the plan marks 1A "refine at prompt
     time") or a divergence risk needing prop-shape freezing before the tracks run
     in parallel.
  2. **`formatAllowedWorkerMinutes` in 1B** — it exists to serve phase 2's M8
     reconciliation. Check charter rule 4 (no dead scaffolding: every helper needs a
     same-phase caller/test) is satisfiable as planned, or record the ledger row.

## Constraints

- **Read-only session**: no source edits, no probes that leave writes. You may run
  `npm run test:item-economics` / `tsc -p packages/item-economics/tsconfig.json
  --noEmit` to record the real baseline numbers.
- Never touch `http://192.168.1.246:8000`; never launch dev servers.
- Findings route per the skill: plan defects → the plan file's Review log (append,
  dated, actor `projection r0`); upstream semantic gaps → flag for the coordinator
  to amend the intention (do not edit the intention yourself); owner-owned calls →
  decision cards (charter format) in ONE `⚠ OWNER DECISIONS REQUIRED (n)` section.

## Deliverable

One handoff file:
`docs/architecture/under_construction/implementation/item_valuation_edition/handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_projection_0.md`
with frontmatter `plan / role: reviewer / round: 0 / state: PROJECTED /
actor / date`, containing: opening summary (one line: ledger size, cards count);
the `⚠ OWNER DECISIONS REQUIRED` section (or "zero cards" line); the decision
ledger (numbered rows: what is undetermined, where an implementer would feel it,
your recommended resolution, which artifact owns the fix); citation/path
verification results; criteria-decidability results; baseline numbers actually
measured; and your **full write perimeter** (should be: the handoff file + the plan
Review log entry, nothing else).

Also append one dated line to the plan's Review log recording that projection
round 0 ran and where the handoff lives, and update the master plan tracker row for
phase 1 to `PROJECTED` (your row only) — these two lines are inside your perimeter.
