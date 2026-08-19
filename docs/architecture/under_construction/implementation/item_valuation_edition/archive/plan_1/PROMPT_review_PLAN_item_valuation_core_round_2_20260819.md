---
plan: PLAN_item_valuation_core_20260819
role: reviewer
round: 2
date: 2026-08-19
---

# Re-review prompt — phase 1, round 2 (delta of fix cycle 1)

You are the **reviewer** for round 2. Invoke the **plan-reviewer** skill. This is a
**re-review after a fix cycle**: delta-scoped with a verified perimeter — full
adversarial depth on the changed seam only; settled areas from round 1 are not
re-verified, but anything seen wrong in passing is reported.

## Project root

`docs/architecture/under_construction/implementation/item_valuation_edition/`

## Read first

1. `handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_review_1.md` — your
   predecessor's verdict; its "verified correct" section is the settled ground.
2. `plans/PLAN_item_valuation_core_20260819.md` — Review log, last two entries
   (round 1 + the fix-cycle fold with digests).
3. Intention §3.5 (unloadable-author copy), §4A M3/M11.
4. Master plan §2 (mirror rule), §9.1 (as amended — the L1 carve-out).

## The delta under review

Fix commit: **`64fa42f6`** (parent `fbd5d67c`, the round-1 baseline).
`git diff fbd5d67c 64fa42f6` must resolve to exactly these code files:

- `packages/item-economics/src/components/price-editor/price-editor-fixtures.ts`
  — S1 ("2h 44m" → "2h 45m" + comment) and N5 (two provenance companion fixtures)
- `packages/item-economics/src/components/price-editor/price-editor.test.tsx`
  — tests 12b/12c (author-with-image, unloadable author)
- `packages/item-economics/src/types.ts` — N3: `satisfies` guard and the
  `lib/item-pricing` import removed (pointer comment left)
- `packages/item-economics/src/lib/valuation-currency.ts` — N3: the guard's new home

plus documentation (project docs, the stamped 20260819 mirror). **Any other code
file in the diff is an automatic finding.** Note: the mirror now differs from its
source by its frontmatter block only; the recorded `source_sha256` is the check.

## Obligations

1. Mirror re-diff (both mirrors; the 20260819 one now via its recorded digest).
2. Perimeter: the diff-vs-list check above.
3. **S1**: re-derive 975 000 through the production pipeline
   (`allowanceSeconds` → `formatAllowanceDuration`) and confirm the fixture now
   matches; confirm no *other* fixture number regressed (round 1 re-derived them all
   — spot-check any two).
4. **N3**: confirm the guard is live at its new site — the fix-cycle log records the
   mutation (enum member removed → `TS1360` at `valuation-currency.ts:24`,
   restore digest `d24634c3…b184a4e6`); re-run it yourself, revert byte-identically,
   record digests. Confirm `types.ts` no longer imports `lib/item-pricing`.
5. **N5**: tests 12b/12c exist, assert the §3.5 contract (empty avatar name → copy
   "saved version" alone, no separator dot), and `avatarImageSrc` now has a caller
   (charter rule 4 closed).
6. **N4**: the plan's testid list now contains `-bootstrap-error` and
   `-slider-reason`, and narrows phase 2 to `-page` only.
7. Full suite + spot-check of dependents: `npm run test:item-economics`
   (IMPLEMENTED claim: **225/19**), package tsc, and one spot-run of an adjacent
   suite (`npm run test:tasks`).
8. Confirm the L1 carve-out in master plan §9.1 and the phase-2 additions
   (11a, 22a–22d, controller-seed note) exist — the lessons were folded, not lost.

## Constraints

Read + test-run + probe-revert only; probes reverted byte-identically with digests
recorded. Never `npm install`, no dev servers, never touch `http://192.168.1.246:8000`.

## Deliverable

`handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_review_2.md`
(frontmatter `plan / role: reviewer / round: 2 / state: REVIEWED / verdict / actor /
date`): verdict (`APPROVED` expected if the delta holds), findings if any, the
`⚠ OWNER DECISIONS REQUIRED (n)` line, probe table with digests, re-measured
numbers, full write perimeter. Append one dated line to the plan's Review log and
update the master plan phase-1 tracker row with your verdict.
