---
plan: PLAN_item_valuation_wiring_20260819
role: reviewer
round: 1
date: 2026-08-20
---

# Review prompt — phase 2 (wiring + entry + e2e), round 1

You are the **reviewer** for phase 2 of `item_valuation_edition`. Invoke the
**plan-reviewer** skill. **First review of this phase**: full checklist against the
plan's criteria and the semantic authorities — adversarial re-derivation, never
verification of the implementer's claims. The review scope is the phase-2
implementation **plus one coordinator-authorized post-approval amendment to phase 1**
(the 22g props fold-back), committed separately.

## Project root

`docs/architecture/under_construction/implementation/item_valuation_edition/`

## Read first

1. `master_plan.md` — §2 (mirror re-diff FIRST), §5, §6 (registry incl. the
   phase-2-orientation amendment: `@beyo/auth`/`@beyo/hooks` peers, `user.id`), §9,
   §10 (note the NEW Playwright failure-baseline paragraph — judge specs, not the
   global count).
2. `plans/PLAN_item_valuation_wiring_20260819.md` — tasks 1–12 + 11a, criteria 1–24
   incl. 22a–22g, Notes, Review log (projection r0 + the implementer's 2026-08-20
   entry with six judgment calls).
3. `planning/intention.md` — §3.3, §3.6, §3.7, §4A **M1/M8/M9/M10**; §3.2 for state
   composition; changelog rounds 5–6.
4. Handoffs (verify, don't trust):
   - `handoffs/implementer/handoff_PLAN_item_valuation_wiring_20260819_implement_1.md`
     (perimeter, probes, judgment calls, environment findings)
   - `handoffs/reviewer/handoff_PLAN_item_valuation_wiring_20260819_projection_0.md`
     (the frozen resolutions P1–P6)
5. Backend authorities: price-scenario handoff §1/§6, operational §3.1/§4.1
   (identity table — you will rule on criterion 11, see below).
6. Phase-1 settled ground: `archive/plan_1/handoff_PLAN_item_valuation_core_20260819_review_2.md`
   ("verified correct" section — do not re-verify it).

## Baseline and perimeter facts

- Commits under review: **`a22d3de6`** (phase-2 implementation, parent `894d3f7d`),
  **`d193c48f`** (the 22g fold-back amendment, coordinator-authored), and the
  **owner visual-correction commit that follows it** (intention round 7: page-not-
  card, title in the surface header, three-dot removed, gesture-isolated price
  region, `text-card` buttons — see the phase-2 Review-log entry of 2026-08-20 for
  its exact file list). Note for your checklist: 22g's tab-order half is **moot**
  (the button no longer exists); its aria-valuetext half stands.
- `git diff 894d3f7d a22d3de6` must resolve to exactly the implementer's declared
  perimeter (19 new paths + 8 edits + 3 documents — its handoff lists them;
  `test-support/price-scenario-reference.ts` is a declared addition beyond the
  plan's list). **`components/price-editor/**`, phase-1 `lib/`, the scenario-schema
  block and `item-economics-keys.ts` must show zero delta in this range.**
- `git diff a22d3de6 d193c48f` must resolve to exactly: `PriceSlider.tsx`,
  `ItemValuationFrame.tsx`, `price-editor.test.tsx`, `pages/ItemValuationSlidePage.tsx`
  (hook deleted, prop passed), master plan §10, phase-1 plan Review log.
- Suites at handoff+amendment: item-economics **296/27**, tasks **75/10**, package
  tsc + monorepo typecheck clean; `item-valuation.spec.ts` 2/2 on both Playwright
  projects. Probe digests to re-verify are in the implementer's table.

## Review obligations

1. **Mirror re-diff** (both mirrors, via their provenance digests).
2. **Perimeter** — the two diff checks above.
3. **Re-run the named mutation** (criterion 9, `use-commit-item-valuation.ts` call
   site) and both self-chosen probes (M10 gate, M9 debounce); each must reproduce
   exactly as recorded; revert byte-identically with digests.
4. **M1 adversarially**: re-derive the PUT bodies for all seven bootstrap criteria
   from intention §4A M1 (not from the action's code); pay attention to
   absent-vs-null keys and the locally re-stated `purchase_api` selection rule
   (the implementer could not import it — verify the re-statement matches
   `packages/task-creation/src/lib/item-lookup-prefill.ts` exactly).
5. **M8/M10**: reconciliation exact-equality on both fields; one-refetch-one-notice
   discipline; the 60 s gate's cache-read rationale (judgment call 3 — rule on it);
   the one-frame `loading` hold (judgment call 4 — rule on it).
6. **M9**: fake-timer debounce, key-prefix independence (criterion 17 is
   **inherited** from phase 1 — re-verify it yourself, per the implementer's own
   note), the module-local branch-root prefix (judgment call 2 — rule on whether it
   can drift from the key factory and whether a test pins it).
7. **Composition criteria 22a–22g**: each page test renders through the real
   provider/controller with mocked network (never hand-built view models); 22e's
   exact strings re-derived from the Reference payload through the phase-1 libs;
   22f's three provenance rows; 22g now satisfied by **props** (the amendment) —
   verify the imperative patch is gone and the new slider/frame tests bite.
8. **Entry**: menu-row gating (criteria 19–20) including the non-admin fixture;
   registration + loader code-splitting (criterion 21 — no static page export);
   boundary tests (22, 11a) — prove `src/boundaries.test.ts` bites, not just passes.
9. **Playwright**: re-run `item-valuation.spec.ts` on mobile then desktop; confirm
   the spec is seeded from the Reference payload; confirm zero pass→fail regressions
   against §10's recorded baseline (never judge by the global count).
10. **Rule on the six judgment calls** in the plan's Review-log entry and on
    criterion 11's five-vs-four (owner card 1 — the owner's answer, if given by
    review time, is in the plan/tracker; on silence the implemented four-row
    settings-copy stands).
11. Anything seen wrong in passing is reported.

## Constraints

Read + test-run + probe-revert only. Probes reverted byte-identically, digests
recorded. Never `npm install`; never launch dev servers (the `:5173` server is
owner-started — reuse it for Playwright); never touch `http://192.168.1.246:8000`.

## Deliverable

`handoffs/reviewer/handoff_PLAN_item_valuation_wiring_20260819_review_1.md`
(frontmatter `plan / role: reviewer / round: 1 / state: REVIEWED / verdict / actor /
date`): opening summary; `⚠ OWNER DECISIONS REQUIRED (n)` section (or the zero
line); findings blocking → should-fix → notes with exact reproductions; verified-
correct section; probe table with digests; re-measured numbers; full write
perimeter. Append one dated line to the phase-2 plan's Review log; **append** a
tracker row in `master_plan.md` (never replace — L6).
