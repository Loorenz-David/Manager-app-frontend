---
plan: PLAN_item_valuation_core_20260819
role: reviewer
round: 1
date: 2026-08-19
---

# Review prompt — phase 1 (core + components), round 1

You are the **reviewer** for phase 1 of `item_valuation_edition`. Invoke the
**plan-reviewer** skill now and follow its doctrine. This is a **first review**:
full checklist against the plan's criteria and the semantic authorities —
adversarial re-derivation, not verification of the implementers' claims. Both
tracks (1A visual, 1B logic) are in scope, one round.

## Project root

`docs/architecture/under_construction/implementation/item_valuation_edition/`
(paths resolve from the `frontend/` repo root).

## Read first

1. `master_plan.md` — §2 (mirror-provenance rule: **re-diff both backend-handoff
   mirrors against the backend originals before anything else**), §5, §6 (registry +
   frozen signatures), §9, §10.
2. `plans/PLAN_item_valuation_core_20260819.md` — criteria 1–55, closed fixture
   list, reference payload, Review log (the projection entry and both implementer
   entries).
3. `planning/intention.md` — §3.2 (round-5 S4 rule), §3.4–3.5, §4A M2–M7 + M11–M13.
4. `HANDOFF_TO_FRONTEND_price_scenario_20260819.md` §2/§4/§5/§9 — re-derive the
   arithmetic from here, never from the implementation.
5. Both implementer handoffs (the declared perimeters and deviations you must
   verify, not trust):
   - `handoffs/implementer/handoff_PLAN_item_valuation_core_20260819_implement_1A_1.md`
   - `handoffs/implementer/handoff_PLAN_item_valuation_core_20260819_implement_1B_1.md`

## Baseline and perimeter facts

- Checkpoint commit: `fbd5d67c` (`CHECKPOINT (not approved): item_valuation_edition
  phase 1 (tracks 1A + 1B)`) on branch `pipeline/item-valuation-edition`; its parent
  `1d9b7a1f` is the pre-phase baseline. The tree should be clean at review start.
- `git diff --stat 1d9b7a1f fbd5d67c` must resolve to exactly: the two tracks'
  declared file lists (1A: 15 files under `components/price-editor/`; 1B: 12
  created + 3 edited per its handoff), the project docs folder, and the 20260819
  handoff mirror. **Anything else in the diff is an automatic finding.**
- Suites at IMPLEMENTED: item-economics **223 passed / 19 files**; package tsc
  clean; monorepo `npm run typecheck` exit 0 (note: §10's "two inherited TS2352"
  did NOT reproduce for 1B — verify and treat a reappearance as environmental, not
  a phase defect).

## Review obligations (the skill's checklist, plus phase-specifics)

1. **Mirror re-diff first** (master plan §2).
2. **Perimeter**: the diff-vs-declaration check above; then confirm the two probed
   files' digests match 1B's declared pre/post-revert digests
   (`price-scenario-math.ts`, `types.ts`).
3. **Re-run the named mutations independently** (criteria 7, 41 — sites named in
   the criteria) and 1B's self-chosen probe 3; each must go red exactly as
   recorded; revert byte-identically and re-verify digests.
4. **Re-derive the arithmetic** from handoff §4 (not from the module): the §9.1
   vectors, the 8681 end-to-end value, the −28000n negative case, and at least two
   fresh vectors of your own choosing compared against an independent computation.
5. **Criteria sweep 1–55**: each criterion's test exists, asserts the exact
   contracted outcome, and cannot pass vacuously (charter rule 2's
   fixture-isolation companion — spot-check the T-row and provenance-variant
   fixtures for double-cause satisfaction).
6. **Registry conformance**: frozen signatures (master plan §6) implemented
   verbatim; export surface of `src/index.ts` matches the registry (no components,
   no loader); testids match the plan's split lists.
7. **Declared deviations — rule on each** (they are honest flags, not defects by
   default): 1A's four (tone module file, frame-rendered phase-2 testids,
   `headerExtra`, deferred checkpoint) and 1B's ten judgment calls — in particular
   the `floor((s+30)/60)` vs `Math.round` resolution, the un-re-run 612-case
   comparison for the reflowed `roundHalfEven` transcription, plain-`z.string()`
   ids vs contract 24's branding, and the `types.ts → lib/item-pricing.ts` import
   edge.
8. **Seam check**: run 1A's `boundaries.test.ts`; grep the package for
   `@beyo/tasks`/`@beyo/task-creation` (0 hits expected); confirm no
   `components/price-editor/` file imports `src/lib/` or `src/types.ts`.
9. **Anything seen wrong in passing is reported** even if outside a criterion —
   this clause catches real bugs.

## Constraints

- Read + test-run + probe-revert only; no production edits. Mutation probes must be
  reverted byte-identically with digests recorded.
- Never `npm install`; never launch dev servers; never touch
  `http://192.168.1.246:8000`.

## Deliverable

Handoff at
`handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_review_1.md`
(frontmatter: `plan / role: reviewer / round: 1 / state: REVIEWED / verdict:
APPROVED | CHANGES_REQUESTED / actor / date`), containing: opening summary (verdict,
counts); `⚠ OWNER DECISIONS REQUIRED (n)` section (or the one-line zero); findings
ranked blocking → should-fix → notes, each with the exact reproduction; what was
verified correct (so the coordinator can settle it); mutation-probe table with
digests; re-measured suite/typecheck numbers; your full write perimeter.

Also append one dated reviewer line to the plan's Review log and update the master
plan phase-1 tracker row to `REVIEWING` → your verdict (your row only, append-style).
