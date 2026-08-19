---
plan: PLAN_item_valuation_core_20260819
role: reviewer
round: 2
state: REVIEWED
verdict: APPROVED
actor: Claude Opus 5 (plan-reviewer doctrine)
date: 2026-08-19
---

# Reviewer handoff — phase 1, round 2 (delta of fix cycle 1)

## Summary

**Verdict: APPROVED.**

Delta re-review of fix commit `64fa42f6` (parent `fbd5d67c`, the round-1 baseline)
against the round-1 handoff, plan Review log entries 5–6, intention §3.5 / §4A M3 /
M11, and master plan §2 / §9.1 (as amended).

**Review history.** Round 1 was a full first review of both tracks: it re-derived the
arithmetic core, the draft machine, the screen-state precedence, the DTO and the
component seam independently, re-ran the `roundHalfEven` comparison protocol over
24 006 cases, reproduced all three recorded mutation probes plus a fourth of its own,
and closed with **0 blocking · 1 should-fix (S1) · 7 notes**. That verdict's "verified
correct" section is the settled ground and was **not** re-verified here. This round
covers only the changed seam: the four code files of the fix, their mutation
behaviour, the folded documentation, and a bounded regression sweep.

The fix cycle holds. S1's number is now the one the production pipeline produces —
re-derived through `budgetMinor` → `allowedCentimin` → `allowanceSeconds` →
`formatAllowanceDuration`, not read off the diff. N3's guard is live at its new home
and the `types.ts` → `lib/item-pricing` edge is gone. N5's two fixtures both have
biting tests: deleting the `avatarImageSrc` wiring turns 12b red and nothing else;
hard-coding a separator into the row turns 12c red and nothing else. N4's testid rows
are in the binding list and phase 2 is narrowed to `-page`. Every lesson L1–L4 is
folded where the fix-cycle log says it is.

Counts: **0 blocking · 0 should-fix · 4 notes (all new, all carry-forward) · 0 owner
decisions.**

## ⚠ OWNER DECISIONS REQUIRED (0)

None from this review. The one owner question already open upstream (1B handoff
item 3 — T8's verbatim pristine test means an untouched unpriced default does not
adopt another manager's commit) is unchanged and is **not** restated here.

## Findings

### Blocking (0)

None.

### Should-fix (0)

None. Round 1's S1 is **closed** — see "Obligation 3" below for the re-derivation.

### Notes (4, all new, none blocking approval)

**N8 — test 12c closes §3.5's copy clause but not its avatar clause.**
`components/price-editor/price-editor.test.tsx` (test 12c) asserts the label and the
absence of a separator and of an `img` role. §3.5's row has two halves: *"avatar
renders initials-less fallback"* **and** *"copy 'saved version' only"*. Probe 3 below:
replacing the `user` avatar branch with `null` when `avatarName === ""` — i.e.
deleting the fallback the clause names — leaves **all 23 tests green**. The component
is correct today (the `@beyo/ui` `Avatar` falls back to `ImagePlaceholder`, which is
`aria-hidden`, which is why `queryByRole("img")` is a valid *negative*); the gap is
that no assertion binds it. *Correction (cheap, either now or in phase 2):* assert the
`item-valuation-provenance-avatar` slot renders non-empty content in 12c.
*Route:* phase 2, provenance wiring.

**N9 — fixture display numbers remain unverifiable by construction; S1's class can
recur silently.** No test asserts `atPrice`'s *string* anywhere (scene 1 asserts the
per-piece value, the disabled Save, the Back label and the chip tone — never the
allowance). That is not an oversight: master plan §9.4's seam forbids files under
`components/price-editor/` from importing `src/lib/`, so a fixture cannot be
cross-checked against `formatAllowanceDuration(allowanceSeconds(...))` inside the
package's component layer at all. S1 was caught by a reviewer's arithmetic, and only
by that. *Correction:* phase 2 is the first place the number and the arithmetic can
meet — add a criterion that one page-level test renders AT PRICE from the **parsed
reference payload through the phase-1 libs** and asserts the exact string.
*Route:* phase 2 (see lesson L5).

**N10 — `SAVED_BY_OTHER_PROVENANCE.detail` uses an absolute timestamp where §3.5
specifies a relative one.** The fixture reads `"saved version · 14 Aug, 10:24"`;
intention §3.5's `saved-pristine` row contracts `"saved version · <relative
created_at>"`, and every other shipped fixture uses the relative form
(`"· just now"`). Harmless inside phase 1 (components receive pre-formatted strings),
but round 1 already observed that phase-2 mocks get seeded from these fixtures.
*Correction:* make it a relative string, or annotate it as deliberately absolute.
*Route:* phase 2 provenance wiring, or a one-token fixture edit.

**N11 — the provenance *composition* has no criterion in either plan.** Phase 1
delegates it explicitly (plan line 113: `authorName` arrives *"already `"You"`-
substituted by the phase-2 controller"`); phase-2 task 6 assigns the controller the
`"You"` substitution and the `""`-for-unloadable rule — but phase-2's criteria (1–24,
including the new 22a–22d) contain **no row asserting it**. So the mapping
`created_by === null → label "saved version", detail null` — the very §3.5 rule N5
was raised to protect — is written in prose in a task and asserted nowhere.
*Correction:* add a phase-2 criterion enumerating the three provenance rows
(current user → "You"; other user → their name; `created_by === null` → "saved
version" with a null detail). *Route:* phase 2 criteria.

## What was verified this round (delta only)

**Obligation 1 — mirror re-diff (both mirrors).**
- `HANDOFF_TO_FRONTEND_price_scenario_20260819.md`: the mirror now carries the
  provenance frontmatter (11 lines) added by the L4 fold. Its recorded
  `source_sha256 e8c0c8b9c01b…d43f20c04f` **equals** the live backend original's
  digest, and the mirror body from line 12 onward hashes to that same value — so the
  body is byte-identical to the source and the frontmatter is the only divergence,
  exactly as the fix-cycle log claims.
- `HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md`: unchanged this cycle;
  recorded `source_sha256 8add7bce957f…aaa818466` still matches the live original,
  and a body diff against the source is empty but for the frontmatter block.

**Obligation 2 — perimeter.** `git diff --name-status fbd5d67c 64fa42f6` = **10
files**, resolving to exactly the prompt's list: the four code files
(`price-editor-fixtures.ts`, `price-editor.test.tsx`, `types.ts`,
`lib/valuation-currency.ts`) plus six documentation entries (the r1 handoff and r1
prompt added, master plan, both phase plans, the 20260819 mirror). **No code file
outside the declared list.** The working tree at review start carried only the
coordinator's uncommitted documentation deltas (master-plan tracker row, the plan's
fix-cycle Review-log entry, the untracked round-2 prompt) — no code.

**Obligation 3 — S1 re-derived through the production pipeline.** Executed against
the shipped module with the plan's Reference payload model (`residual_percent_milli
22000`, `constant_deduction_minor 0`, `cost_per_worker_minute_ten_thousandths
13000000`):

| step | value |
|---|---|
| `budgetMinor(975000, model)` | `214500n` |
| `allowedCentimin(975000, model)` | `16500n` |
| `allowanceSeconds(975000, model)` | `9900` |
| `formatAllowanceDuration(9900)` | **`"2h 45m"`** |

The fixture now reads `"2h 45m"` — match. Spot-checks that no other fixture number
regressed: `editor-dirty` 1 335 000 → 13 555 s → `"3h 46m"` ✓;
`editor-unpriced-pristine` 1 140 000 → 11 575 s → `"3h 13m"` ✓; and, for free,
typical 12 300 s → `"3h 25m"`, the §9.2 reference 855 000 → 8 681 s → `"2h 25m"`,
the suggested anchor 1 215 000 → 12 337 s, the break-even anchor 1 211 335 → exactly
12 300 s. The added comment states the derivation correctly.

**Obligation 4 — N3.** `types.ts` imports **only** `zod`; the `lib/item-pricing`
value import is gone and a pointer comment sits in its place. The guard is live at
its new site: removing `"swedish_krona"` from `ValuationCurrencySchema` produces
`TS1360` at **`lib/valuation-currency.ts(24,25)`** — the exact error and site the
fix-cycle log records — alongside three collateral errors (the `Record` literal at
:15, the lookup at :34, one test file). `types.ts` reverted byte-identically; pre and
post digest `d24634c3…b184a4e6`, which is also the digest the fix cycle declared.
*Observation, not a finding:* the relocated `satisfies` is now partly redundant with
this module's own `CURRENCY_DISPLAY_CODE[currency ?? INLINE_PRICING_CURRENCY]`, which
fails on the same drift. Round 1 already ruled the guard worth keeping; it costs one
line and states the intent explicitly.

**Obligation 5 — N5.** Tests 12b/12c exist in the criterion-51 describe block
(alongside the pre-existing 12a companion) and both **bite** (probes 1 and 2 below):
- 12b renders `SAVED_BY_OTHER_PROVENANCE` — a non-current-user author with a profile
  image — and asserts the name, the detail tail, the image `src`, and that no
  Back toggle renders when `backLabel` is null. Dropping the `avatarImageSrc` → `Avatar`
  wiring turns exactly this test red, so **charter rule 4 is closed for
  `avatarImageSrc`**: the prop has a real caller whose assertion depends on it.
- 12c renders `UNKNOWN_AUTHOR_PROVENANCE` (`avatarName: ""`, `detail: null`) and
  asserts the §3.5 copy — "saved version" alone, no separator dot, no image.
  Hard-coding a `·` separator into the row turns exactly this test red. See N8 for
  the clause it does *not* cover.
Both fixtures live outside `PRICE_EDITOR_FIXTURES`, so the closed 13-variant list
(criterion 51) is untouched; both type-check as `ItemValuationProvenanceRowProps`;
neither imports `src/lib/` or `src/types.ts`, and `boundaries.test.ts` is green.

**Obligation 6 — N4.** The plan's binding testid list (task 6) now contains
`-bootstrap-error` and `-slider-reason` with the provenance of the addition, and the
phase-2 line reads `item-valuation-page` **only**, recording that `-header` /
`-menu-button` are phase-1 ids rendered by `ItemValuationFrame`.

**Obligation 7 — suites, typecheck, dependents (re-measured this session).**
- `npm run test:item-economics` → **225 passed / 19 files** (matches the IMPLEMENTED
  claim; +2 over round 1's 223, i.e. exactly 12b and 12c).
- `npx tsc -p packages/item-economics/tsconfig.json --noEmit` → exit 0.
- `npm run typecheck` (monorepo `tsc -b --force`) → exit 0.
- Dependent spot-run: `npm run test:tasks` → **68 passed / 10 files**, green.
- Standing rules re-greped after the `types.ts` edit: `price-scenario-math.ts` still
  contains exactly one `Number(` (the declared exit boundary, line 86) and no
  `Math.round` / `parseFloat` outside prose; `@beyo/tasks` / `@beyo/task-creation`
  under `packages/item-economics/src` → **0 hits**.

**Obligation 8 — lessons folded, not lost.**
- **L1** — master plan §9.1 carries the carve-out naming `Math.floor((s + 30) / 60)`
  as the post-money display form. ✓
- **L2** — phase-2 criteria **22a–22c** (state → rendered blocks) exist and are
  framed as the first place intention §1.3 is enforceable. ✓ (N9/N11 note what they
  still do not cover.)
- **L3** — phase-2 criterion **22d** records that the page adds only
  `item-valuation-page`. ✓
- **L4** — the 20260819 mirror is stamped. ✓
- **1B carry-ins** — phase-2 task **11a** (package-wide import-boundary test) and the
  controller-seed note in task 6 both present. ✓

## Mutation-probe declaration

Three probes, each applied to a pre-image copy and reverted from it; both touched
files are byte-identical to their pre-probe state, verified by sha256. No database,
no dev server, no network, no `npm install`, nothing touched
`http://192.168.1.246:8000`.

| # | Probe | File | Site | Pre digest | Result | Post-revert digest |
|---|---|---|---|---|---|---|
| 1 | N5 — `imageSrc={avatarImageSrc}` → `imageSrc={undefined}` | `components/price-editor/ItemValuationProvenanceRow.tsx` | `Avatar` **call site** | `8bfd6617…2b9bf7cc2` | **bites** — exactly one red: 12b, "Unable to find an accessible element with the role img" | `8bfd6617…2b9bf7cc2` ✓ |
| 2 | N5 — conditional detail span replaced by an unconditional `" · {detail}"` | same file | detail render **definition** | `8bfd6617…2b9bf7cc2` | **bites** — exactly one red: 12c | `8bfd6617…2b9bf7cc2` ✓ |
| 3 | N8 (reviewer-chosen) — `user` avatar branch returns `null` when `avatarName === ""` | same file | avatar branch **definition** | `8bfd6617…2b9bf7cc2` | **does not bite** — 23/23 green → finding N8 | `8bfd6617…2b9bf7cc2` ✓ |
| 4 | N3 (recorded) — `"swedish_krona"` removed from `ValuationCurrencySchema` | `src/types.ts` | enum **definition** | `d24634c3…b184a4e6` | **bites** — `TS1360` at `lib/valuation-currency.ts(24,25)` + 3 collateral | `d24634c3…b184a4e6` ✓ |

One temporary vitest file (`packages/item-economics/src/__r2_cross.test.ts`, the
obligation-3 vectors) was created and **deleted**; `git status` shows no code-tree
delta from this session. Analysis scratch lives in the session scratchpad, outside
the repo.

## Carry-forward dispositions

| Item | Destination | Why it cannot evaporate |
|---|---|---|
| N1 (criterion 55's import ban unautomated) | phase 2, task **11a** (written) | criterion 55 stays open until 11a's test exists |
| N2 (M6 step-count assert) | phase 2, controller task 6 | one dev-time assert beside `resolveStepCount` |
| N6 (`SAVE_OK` vs refetch lag) | phase 2 plan + master plan §6 if the event shape changes | M4/T6's assumption is stated but untested |
| N7 (a11y: `aria-valuetext`, decorative button) | phase 2 (page assembly) | — |
| **N8** (12c's unasserted avatar clause) | phase 2, provenance wiring | §3.5's avatar half is currently deletable with a green suite |
| **N9** (fixture numbers unverifiable by construction) | phase 2 criteria (see L5) | the S1 class recurs silently until a page test renders through the libs |
| **N10** (absolute vs relative timestamp in the new fixture) | phase 2 provenance wiring | phase-2 mocks are seeded from these fixtures |
| **N11** (provenance composition has no criterion) | phase 2 criteria | task 6 owns it in prose; nothing asserts it |
| N3, N4, N5, S1 | **closed this round** | — |

## Lessons for the plans (fold upstream)

**L5 — the component seam makes display fixtures unfalsifiable, and the plans should
say where that debt is paid.** Master plan §9.4 forbids `components/price-editor/`
(fixtures included) from importing `src/lib/`. That seam is right, and it is also why
S1 shipped: no test in phase 1 can compare a fixture string to the arithmetic that
produces it. The phase-2 plan should carry an explicit criterion — one page-level test
that parses the Reference payload, runs it through the phase-1 libs, and asserts the
rendered AT PRICE / per-piece strings — so the numbers and the arithmetic meet exactly
once in the suite. Without it, "the fixtures are right" remains a claim only a
reviewer's hand-derivation supports.

**L6 (process, minor) — the phase-1 reviewer tracker row was overwritten by the fix
cycle.** Master plan §4 previously carried a `CHANGES_REQUESTED · reviewer (round 1)`
row; the fix-cycle edit replaced it with `IMPLEMENTED (fix 1) · coordinator`. The
verdict survives in the plan's Review log and in the r1 handoff, so nothing is lost —
but the charter's "agents update only their own row" reads more safely as *append a
row* than *replace the previous one*, since a replaced row erases a state the gate
depended on.

## Write perimeter (full)

Documents only — **no production file was modified by this session**:

1. this handoff
   (`handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_review_2.md`);
2. one appended reviewer line in `plans/PLAN_item_valuation_core_20260819.md`
   Review log;
3. one appended tracker row in `master_plan.md` §4 (phase 1 → `APPROVED`,
   reviewer round 2 — the reviewer's own row).

Probes: the four rows above, all reverted byte-identically, digests verified.
Scratch: one temporary vitest file, created and deleted (declared above). No
`npm install`, no dev server, no network, nothing touched
`http://192.168.1.246:8000`. No architecture-graph delta (none exists for this
project).
