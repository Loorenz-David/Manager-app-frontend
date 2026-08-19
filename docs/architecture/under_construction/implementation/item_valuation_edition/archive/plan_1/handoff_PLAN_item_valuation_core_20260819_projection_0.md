---
plan: PLAN_item_valuation_core_20260819
role: reviewer
round: 0
state: PROJECTED
verdict: AMENDMENTS_REQUIRED
actor: Claude (plan-projection doctrine)
date: 2026-08-19
---

# Projection handoff — phase 1 (core + components), round 0

**Summary (one line):** 26 ledger rows (5 high, 13 medium, 8 low) and **2 owner
decision cards**; verdict `AMENDMENTS_REQUIRED` — the implementer prompts must not
compile until every row is routed.

## Owner-readable opening

I did the implementer's first hour on paper for both tracks and the plan does not
yet hold up. Two things need David personally: a screen rule that would hide the
price editor from tasks the server says are perfectly saveable, and the four design
mockups, which exist only inside a chat message and so cannot reach the person who
has to build the components. Everything else is mine and the coordinator's to fix —
mostly under-specified function shapes, four acceptance criteria that assert things
that are arithmetically false, and one state-machine example in the intention that
cannot actually be executed. None of it is deep; all of it would otherwise have been
invented silently in code and found at review.

## ⚠ OWNER DECISIONS REQUIRED (2)

### Card 1 — Should "purchase price first" also block items the server says are saveable?

**Question:** Keep the purchase-required screen for *every* item with no purchase
cost, or only for items the server refuses to save?

**Story:** A workshop prices dining chairs with a cost model that takes a flat share
of the sale price and never looks at what the chairs cost to buy. The server happily
reports the task as ready to price and ready to save. Under the current rule the
manager instead lands on "No price set · purchase price needed first" and a Fetch
button — and if that item has no article number yet, the button is disabled and there
is no way forward on this screen at all, for an item that would have saved on the
first press.

**Branches:**
- *Keep as written* — every unpriced-purchase item routes through the purchase app
  first; workshops without a purchase-cost model hit dead ends.
- *Gate it on the server's own refusal* — the screen asks for a purchase price only
  when the server says it cannot save without one; the purchase-first habit survives
  everywhere it actually applies.

**Recommendation:** Gate it — the purchase-first rule stays intact for every item the
server actually blocks, and no manager is stopped in front of a task the server would
have accepted.

**On silence:** the gate holds; phase 1 is not compiled. No guess is made.

*Trace: intention §3.2 S4, §3.3; phase-1 criteria 33, 34, 36; handoff §2 example, §6.1.*

### Card 2 — Where do the four mockups live?

**Question:** Will you drop the four mockups into the project folder as files, or
should the components be built from the written description alone?

**Story:** The person building the visual half of this screen starts a fresh session
that can read only files in the repo. The plan tells them to build "the four mockups"
— which live in a message you sent on 19 August. They cannot open it. They will
build eleven components from the prose layout instead, and the first time you see the
result is at review, when the spacing, the chip and the slider are already written.

**Branches:**
- *Commit the images* (e.g. `planning/mockups/`) — the visual track builds against
  what you actually drew.
- *Prose only* — the layout list in the intention is the whole brief; expect a
  visually plausible but not-your-drawing first round.

**Recommendation:** Commit the four images into the project folder — it costs one
drag-and-drop and removes an entire round of visual rework.

**On silence:** the gate holds; Track 1A is not compiled (Track 1B is unaffected and
could start alone).

*Trace: phase-1 plan "Read first" item 5, Track 1A task 2; charter interop principle.*

## Decision ledger

Severity: **H** = an implementer must invent load-bearing semantics; **M** = a
criterion is undecidable, false, or unenforceable as written; **L** = a free choice
worth delegating in writing.

| # | Sev | What the artifacts do not determine | Where the implementer feels it | Recommended resolution | Owning artifact |
|---|---|---|---|---|---|
| L1 | H | The M4 invariant sequence starts at **T2** (`savedExpected === null`), but both BACK transitions require `savedExpected !== null` (T4) or `draft === savedExpected` (T5) — with a null saved value **neither guard can ever hold**, so the sequence cannot execute and its stated end state (`draft === savedExpected`) is unreachable. Criterion 23 inherits the defect verbatim. | Track 1B, task 3, writing the invariant test — the only way to make it pass is to invent different BACK guards. | Read **T1** for T2: init `savedExpected = 855000`, `quantity = 6`, band `{420000, 1650000, 15000}`; drag 1 335 000 → BACK → BACK → drag 1 005 000 → BACK ends `draft = 855000`, `lastDraft = 1005000`, Back label "1 675". (Traced by hand; consistent with every other M4 row.) | intention §4A M4 (upstream) + criterion 23 |
| L2 | H | **No module owns M7.** Criteria 38–39 (chip flip at break-even) are phase-1 criteria, but `price-scenario-math`, `price-draft`, `item-valuation-screen-state` and `valuation-currency` all exclude the chip/marker derivation; criterion 40 is explicitly deferred to a 1A fixture. Phase 2 has no M7 criterion either — the mechanism falls between the phases. | Track 1B has criteria it cannot site; phase 2 re-derives the rule inside the controller, unversioned. | Add one pure export, e.g. `resolveCoverage(draftMinor, anchors): { showChip, isCovered, tone, markerMinor }` in `lib/price-draft.ts` (or a new `lib/price-coverage.ts`); criteria 38–40 then bind to it, and 1A keeps only the render assertion. | master plan §6 + phase-1 plan tasks/criteria |
| L3 | H | **`PriceDraftState` / `PriceDraftEvent` shapes.** T8/T9 branch on the *old* `savedExpected`, so state must carry it (M4 lists only `draft`, `lastDraft`, `initialDefault`); T2 needs `purchase_cost_minor` **and** `domain` at INIT; T3 sets `lastEditedAt := now`, which a *pure* reducer cannot read. | Track 1B, task 3, first ten minutes — and every phase-2 test that drives "the real reducer instance". | Freeze in the plan: state `{ draft, lastDraft, initialDefault, savedExpected, lastEditedAt }`; events `{type:"INIT", savedExpected, purchaseCostMinor, domain}`, `{type:"DRAG"\|"USE_SUGGESTED", priceMinor, now}`, `{type:"BACK", now}`, `{type:"SAVE_OK"}`, `{type:"REFETCH", savedExpected}`. `now` is always injected, never read. | phase-1 plan task 3 + master plan §6 |
| L4 | H | **Signatures contradict the criteria.** M5 needs `domain` but criteria 25–28 call `clampSnap(1140000)` with one argument. `resolveScreenState(scenario, queryStatus)` never says what `queryStatus` is (react-query's `"pending"\|"error"\|"success"`? a package-local union? phase 1 is meant to be I/O-free and takes no react-query type). Same for `sliderFractionToPrice` / `priceToSliderFraction` (domain in or out?). | Both tracks and phase 2 — the phase-2 controller has to match whatever 1B guessed. | State each signature in the registry: `clampSnap(value, domain)`, `resolveScreenState(scenario \| null, status: "pending"\|"error"\|"success")` with a package-local union (no react-query import), `sliderFractionToPrice(fraction, domain)` / `priceToSliderFraction(priceMinor, domain)`. | master plan §6 |
| L5 | H | Criterion 36 asserts the handoff **§2 example payload → `editor`**. That payload carries `saved.purchase_cost_minor: null`, which S4 (`saved === null OR saved.purchase_cost_minor === null`) matches **first** → it resolves to `purchase_required`. The criterion is false against the plan's own precedence table. | Track 1B, task 4 — a passing test forces either a wrong precedence or a silently doctored fixture. | Depends on **owner card 1**. If S4 is gated on the server's refusal, criterion 36 becomes true as written; if S4 stays, criterion 36 must name a payload with a non-null `purchase_cost_minor` (and one such payload must be published — see L26). | intention §3.2 S4 + criterion 36 |
| L6 | M | Criterion 43 (`formatPerPiece(855001, 6)` "renders two decimals") is **arithmetically false**: 855001 ÷ 600 = 1425.0016…, and `{minimumFractionDigits: 0, maximumFractionDigits: 2}` renders `"1\u00a0425"` (no decimals at all) — measured in this repo's Node 22. | Track 1B, task 5 — the test fails on correct code, so the implementer "fixes" the formatter. | Use M12's own example instead: `formatPerPiece(855102, 6) === "1\u00a0425,17"` (verified), and keep a whole-value row (criterion 42). | criterion 43 |
| L7 | M | The grouping separator in `sv-SE` is **U+00A0**, not an ASCII space (measured: `Intl.NumberFormat("sv-SE").format(1900)` returns `"1\u00a0900"`). Criteria 42/43 write `"1 900"` with no statement of which character. | Track 1B, task 5 — a copy-pasted literal passes or fails by invisible bytes. | Write the criteria with the escape spelled out (`"1\u00a0900"`), or normalise inside the assertion (`.replace(/\u00a0/g, " ")`); state the choice once in the plan. | criteria 42–43 |
| L8 | H | **The four mockups are not artifacts.** "Read first" item 5 and Track 1A task 2 cite "the four mockups (owner's message 2026-08-19)"; the project folder contains only `master_plan.md`, `planning/intention.md` and two plans. A fresh 1A session cannot see them. | Track 1A, task 2 — the entire fixture set and every pixel decision. | See **owner card 2**. Whatever the answer, the plan must stop citing a chat message: either a path under `planning/mockups/` or an explicit "prose layout (intention §3.4) is the whole brief". | phase-1 plan "Read first" + Track 1A task 2 |
| L9 | M | `PriceSlider` is mandated pointer-driven ("pointer events + capture; no external gesture dep") on the strength of intention §2's claim that **"No slider primitive exists in `@beyo/ui`"** — which is inaccurate: `SliderFieldRow` (native `input[type=range]`) is exported from `@beyo/ui` (`packages/ui/src/components/text-styling/SliderFieldRow.tsx`), and `PanelPrimitives.tsx` carries a second range-input precedent. Measured consequence: in this repo's jsdom, `element.setPointerCapture` is **undefined** (calling it throws) and `getBoundingClientRect()` returns **all zeros** (fraction = 0/0). Criteria 52–53 are therefore not writable as stated. | Track 1A, task 3 and task 5 — the first drag test throws, then divides by zero. | Either (a) build the visual slider over a visually-hidden `input[type=range]` (`min=0`, `max=stepCount`, `step=1`, emit `index / stepCount`) — keyboard, a11y and jsdom testability come free; or (b) keep pointer-driven and write into the plan the required harness: optional-call the capture API (`el.setPointerCapture?.(id)`) and stub `getBoundingClientRect` per the `EditorView.test.tsx` precedent. Recommend (a). Correct intention §2's grounding row either way. | phase-1 plan Track 1A task 3 + intention §2 (upstream, factual) |
| L10 | M | Criterion 51 ("**every** fixture variant renders … and matches its structural assertions") over a fixture set defined as "**at minimum** the four mockups plus …" — an open set with a compound expected outcome. Charter rule 2 (enumerate, never sample; one exact outcome per row). | Track 1A, task 5 — the criterion is met by any subset the implementer chooses. | Close the list (name the N variants) and give each one row with one asserted outcome: e.g. "no-band → slider disabled **and** disabled-reason present", "non-fundable → `-chip` and `-suggested-marker` absent", "empty typical → reason text, `-typical` never `"0m"`". | criterion 51 + Track 1A task 2 |
| L11 | M | Screen-state enumeration is **not total**: criteria 32–37 cover the S3↔S4, S4↔S5, S5↔S6 pairs, but not S1↔S2 or S2↔S3, and nothing defines S2 when the query errors while a previously-fetched scenario is still in cache (error-with-data is the common react-query shape). | Track 1B, task 4 — the pending/error arms are written blind and phase 2 inherits the guess. | Add the two adjacent-pair rows, and one semantic line: error **with** cached data → keep `editor` (stale) or force `error`? Recommend forcing `error` only when there is no data, otherwise the screen silently prices off a stale payload — but this is a semantics call, so it belongs in the intention. | intention §3.2 (upstream) + criteria 32–37 |
| L12 | M | Criterion 41 enumerates **three** currency rows; M11 has a **fourth** documented case (`currency: null` → `INLINE_PRICING_CURRENCY` mapping) with no row, and it does not say whether the null lives in `currencyDisplayCode` or its caller. The "adding an enum member must fail typecheck" half names no mutation site (charter rule 11) and is not a vitest assertion (charter rule 1). | Track 1B, task 5 — and the first time a fourth currency ships. | Four rows (`swedish_krona`/`danish_krona`/`euro`/`null`); declare `currencyDisplayCode(currency: ValuationCurrency \| null): string`; implement as `const CURRENCY_DISPLAY_CODE: Record<ValuationCurrency, string>` (a Record is typecheck-enforced by construction, unlike a switch) and name the mutation as "add a member to `ValuationCurrencySchema` in `types.ts` (definition site) → `npx tsc -p packages/item-economics/tsconfig.json --noEmit` must fail". | criterion 41 + master plan §6 |
| L13 | M | **No currency enum exists in this frontend.** Grep finds only `INLINE_PRICING_CURRENCY = "swedish_krona"` (a bare string const); the three-value vocabulary is documented only in the operational handoff §3.1. The registry lists every other `price-scenario-dto` export but no currency schema/type — yet M11's exhaustiveness and the DTO's `currency` field both need one. | Track 1B, task 1 — `currency: z.string().nullable()` is the path of least resistance and quietly kills M11. | Register `ValuationCurrencySchema = z.enum(["swedish_krona","danish_krona","euro"])` + `ValuationCurrency`, and state that `INLINE_PRICING_CURRENCY` must satisfy it. | master plan §6 |
| L14 | M | Criterion 6 (`budgetMinor` returns a **negative** bigint below the constant deduction) names no constants, and the only published model (handoff §9.2) has `constant_deduction_minor: 0` — with which no non-negative price yields a negative budget. The criterion is unreachable with the artifacts' only model. | Track 1B, task 2 — invents a second model fixture, unreviewed. | Name it in the criterion: e.g. `{residual_percent_milli: 22000, constant_deduction_minor: 50000, cost_per_worker_minute_ten_thousandths: 13000000}` at `P = 100000` → `budgetMinor === -28000n` (hand-verified). | criterion 6 |
| L15 | M | `lib/price-scenario-dto.ts` is registered as the home of `PriceScenarioSchema`, but in this repo **`*-dto.ts` means a transform module**: all three existing ones (`production-time-dto.ts`, `stats/worker-stats-dto.ts`, `worker-daily-step-dto.ts`) contain **zero** `z.object` calls, and every response schema lives in `types.ts` (`TaskProductionTimeSchema`, `ItemEconomicsStatusSchema`). Contract `24_dto.md` puts Response DTOs in `feature/types.ts`. | Track 1B task 1, and the reviewer, who will read the divergence as a finding. | Put `PriceScenarioSchema` and its member schemas in `packages/item-economics/src/types.ts` (contract + package precedent), or rename the file `lib/price-scenario-schema.ts` and record the deliberate deviation in master plan §6. Recommend the former. | master plan §6 |
| L16 | M | **Perimeter inconsistency.** 1B task 7 edits `packages/item-economics/src/index.ts`, which appears in neither track's "Files expected to change"; the section then states "No other file", and the review does a perimeter check against exactly that list. | Track 1B closeout, and the round-1 reviewer's automatic finding. | Add `src/index.ts` to the 1B file list (and say explicitly whether 1A exports anything from the package index in phase 1 — recommend **no**, since phase 2 composes the components from inside the package). | phase-1 plan "Files expected to change" |
| L17 | M | Criterion 54 ("no file under `components/price-editor/` imports `lib/price-scenario-dto.ts`") and criterion 55's import-boundary clause are declared as automated vitest assertions, but **no enforcement mechanism exists**: ESLint is configured per app (`eslint .` from each app root, `files: **/*.{ts,tsx}` relative to it) and never reaches `packages/`, and no test anywhere in the repo reads source files (`readFileSync`/`readdirSync`/`node:fs`: zero hits under `packages/*/src/**/*.test.*`). | Track 1A task 5 / closeout — the criterion becomes a manual grep, violating charter rule 1. | Specify one mechanism: a `components/price-editor/boundaries.test.ts` that walks the directory with `node:fs` and asserts no matching import string (feasible — vitest runs on Node with jsdom globals). Name it in the plan so it is not invented twice. | phase-1 plan criteria 54–55 |
| L18 | M | Nothing forbids **Track 1A importing Track 1B's `lib/` modules**, and the in-package precedent does exactly that (`production-time-fixtures.ts` imports from `lib/production-time-view-model`). If 1A follows the precedent, its parallel session cannot typecheck until 1B lands, and master plan §9.4's SRP seam leaks. | Track 1A, task 2 — the natural move is to reuse `formatPerPiece`. | Add to the plan: *files under `components/price-editor/` (fixtures included) import nothing from `src/lib/`; every number arrives pre-formatted.* Criterion 54 then widens from the DTO file to the whole `lib/` directory. | phase-1 plan Track 1A + master plan §9.4 |
| L19 | L | M4 says "the Back button renders iff T4 or T5's guard holds", but no phase-1 export computes it (`resolveProvenanceVariant` returns the variant only), and phase 2 task 6 is forbidden from re-deriving M4 semantics. | Phase 2, silently — the toggle's two-position rule gets rewritten in the controller. | Have `resolveProvenanceVariant` return `{ variant, backTargetMinor: number \| null }`, or add `resolveBackTarget(state)`; criterion 24 then asserts both fields per row. | master plan §6 + criterion 24 |
| L20 | L | The provenance row's "current user renders as **You**" needs the signed-in user's id; no phase-1 or phase-2 file owns that resolution, and 1A's prop contract for it is unstated. | Track 1A task 1 (prop shape) and phase 2 task 6 (who compares ids). | Delegate explicitly: 1A takes `authorName: string` and `avatarName: string` already resolved (`"You"` substituted upstream); phase 2's controller owns the comparison. Record it. | phase-1 plan Track 1A task 1 |
| L21 | L | The binding testid list mixes phase-2 page ids (`item-valuation-page`, `-header`, `-menu-button`) with phase-1 component ids, and `-back-button` reads as the removed header Back button rather than §3.5's "Back to N" toggle. | Track 1A task 6 — renders ids for a page it does not build; phase 2 may rename. | Split the list by owning phase and rename the toggle `item-valuation-back-to-saved` (or keep and add a one-line gloss). | phase-1 plan Track 1A task 6 |
| L22 | L | The tone union `"positive" \| "negative" \| "neutral"` (master plan §9.4) is unnamed in the registry, while the package already exports a different tone vocabulary (`ProductionTimeTone`: completed/working/paused/blocked/pending/excluded). Phase 2 must produce exactly 1A's union. | Track 1A task 1; phase 2 task 6. | Register `PriceEditorTone` as a named export of `components/price-editor/index.ts`. | master plan §6 |
| L23 | L | `@beyo/ui` `Avatar` takes a **required non-null** `name: string` (initials derived from it; empty → `ImagePlaceholder`). §3.5's `created_by === null` case ("initials-less fallback") has no prop contract. | Track 1A, the provenance fixture. | Delegate in writing: `avatarName: string` with `""` meaning unknown author, copy fixed to "saved version". | phase-1 plan Track 1A task 1 |
| L24 | L | Master plan §10 records the `test:item-economics` baseline as **125**; the measured baseline today is **131** (10 files). Separately, §3 names branch `pipeline/item-valuation-edition`, which does not exist — the repo is on `main` and the whole project folder is untracked. | Every session that "re-measures at session start" and finds a mismatch it cannot explain. | Update §10 to 131 (measured below) and either create the branch or drop the reference. | master plan §10, §3 |
| L25 | L | Criterion 30 ("fraction→price **lands on grid** for f ∈ {0, 0.5, 1}") is satisfied by an implementation that always returns `domain.min_minor`; criterion 31 ("round-trips **within half a step**") states a tolerance, not an outcome. Charter rule 2's expected-output clause. | Track 1B task 3 — two green tests that cannot fail. | Exact vectors on the standard band (`steps = 82`, hand-verified): f=0 → 420000, f=0.5 → 1035000, f=1 → 1650000; and one named off-grid pair instead of a tolerance — `priceToSliderFraction(858000) === 438000/1230000` and `sliderFractionToPrice(438000/1230000) === 855000`, with the draft still 858000 after the round trip. | criteria 30–31 |
| L26 | L | The handoff §2 payload is JSONC with `…` placeholders (`"tsk_…"`, `"ival_…"`, `"usr_…"`) and comments — it cannot be copied as a fixture. Criteria 36, 38, 39, 45 and the whole 1A editor fixture all point at it. | Both tracks and phase 2 build three different "the §2 example" fixtures. | Publish **one** concrete reference payload (concrete ids, concrete `purchase_cost_minor` per card 1) in the phase-1 plan and have every criterion cite it by name. | phase-1 plan |

## Reality checks (read-only verification against the codebase)

| Claim / citation | Result |
|---|---|
| `packages/item-economics/src/types.ts:38` = `ItemEconomicsStatusSchema` (12 values) | ✅ exact line 38; twelve members as described |
| `api/item-economics-keys.ts` exists; `tasks()` branch invalidated as described | ✅ `itemEconomicsKeys.all = ["item-economics"]`; `tasks() = [...all,"task"]` — a `priceScenario` sibling under `all` is collision-free |
| `@beyo/ui` `Avatar` | ✅ exported (`packages/ui/src/index.ts:46` → `components/primitives/avatar`); see L23 for its prop contract |
| `components/production-time/*` card-frame idiom | ✅ exists (`ProductionTimeFrame.tsx`), reusable as a pattern reference |
| `packages/items/src/types.ts:43` = `ItemLookupResultSchema`, `purchase_price` nullable+optional | ✅ line 43; `purchase_price` at line 51 (`.nullable().optional()`) — phase-2 relevant |
| Plan note: `formatWorkSeconds` may not implement M3 | ✅ **confirmed divergent** — it floors (`Math.floor(seconds/60)`, line 137); reuse would render `2h 24m`. The plan's "do not reuse" note is correct |
| Naming registry collisions (`PriceScenario*`, `clampSnap`, `roundHalfEven`, `budgetMinor`, `allowanceSeconds`, `priceDraftReducer`, `resolveScreenState`, `currencyDisplayCode`, `formatPerPiece`, `ItemValuation*`, all eleven 1A component names, `price-editor`, testid prefix `item-valuation-`) | ✅ zero collisions repo-wide. Only conceptual near-miss: a **local** `allowanceSeconds` parameter in `production-time-view-model.ts:203` (different module, no export) |
| Registry file placement vs repo convention (`*-dto.ts`) | ❌ see L15 |
| Intention §2: "No slider primitive exists in `@beyo/ui`" | ❌ **false** — `SliderFieldRow` is exported; see L9 |
| Mirror provenance (master plan §2 rule) | ✅ `HANDOFF_TO_FRONTEND_price_scenario_20260819.md` is **byte-identical** to the backend original; `…operational_20260815.md` differs **only** by its mirror frontmatter and its recorded `source_sha256` (`8add7bce…8466`) matches the source today. Note: the 20260819 mirror carries **no** provenance block, so it has no stamp to re-diff against next round |
| Track 1A fixtures buildable from the DTO shape | ✅ trivially, because §9.4 forbids DTO props — but the *content* is blocked by L8, and the parallel-import hazard by L18 |
| jsdom capability for the mandated slider | ❌ measured: `setPointerCapture` undefined, `getBoundingClientRect()` all zeros; precedent harness exists in `packages/presentation-builder/src/views/EditorView.test.tsx:217` — see L9 |
| Enforcement path for import-boundary criteria | ❌ no package-level ESLint, no fs-reading test precedent — see L17 |
| Charter rule 4 vs `formatAllowedWorkerMinutes` (coordinator question 2) | ✅ **satisfied as planned** — criteria 12–13 give it same-phase test callers; the rule requires a test caller, not a production caller. No ledger row. Its production caller lands in phase 2 criterion 9 |
| 1A/1B prop seam (coordinator question 1) | ✅ **prompt-time refinement is acceptable** — the tracks share no type (1B exports functions, 1A hand-builds formatted fixtures) and phase 2 is gated on phase 1 APPROVED, so it reads the frozen props from code. Conditional on three amendments: L22 (name the tone union), L18 (1A imports nothing from `lib/`), L10 (close the fixture set) |

## Criteria decidability

Every criterion was tested for "could I write this test right now, from the artifacts
alone, with exactly one expected outcome?"

**Decidable and independently verified correct (arithmetic re-derived in Node from
the handoff §4 reference):**
- 1–4 (`roundHalfEven(-3n,2n) = -2n`, `(-5n,2n) = -2n`, `(3n,2n) = 2n`, `(5n,2n) = 2n`) ✅
- 5 `allowanceSeconds(855000, §9.2 model) === 8681` ✅ (intermediate: `budgetMinor = 188100n`, `allowedCentimin = 14469n`)
- 7 the named mutation **bites**: the direct budget→seconds shortcut yields `8682n`
  vs the three-step `8681n` — criterion 5's equality is the assertion that turns red ✅
- 8–11 (`8681 → "2h 25m"`; `-1 → "0m"`; `10800 → "3h 0m"`; `2700 → "45m"`) ✅
- 12–13 (`16000n → "160.00"`; `-5n → "-0.05"`, the sign branch is genuinely required:
  `-5n / 100n === 0n` in BigInt, so the minus sign is lost without it) ✅
- 14–22 (T1–T9), 25–29 (clampSnap; the tie at 427500 → 435000 and 427499 → 420000 both
  re-derived), 32–35, 37, 42, 44–50 ✅

**Not decidable / false as written:** 6 (L14), 23 (L1), 24 (L19), 30–31 (L25),
36 (L5), 38–40 (L2), 41 (L12), 43 (L6), 51 (L10), 52–53 (L9), 54 (L17).

**Enumeration totality (charter rule 2):** T1–T9 ✅ total; S-state adjacent pairs ❌
(L11); currency rows ❌ (L12); provenance variants — criterion 24 promises five rows
against a three-variant table and no fixture-isolation statement, so the "each fixture
makes its own predicate the only reason" companion is unproven (folded into L19).

**Named mutations (charter rule 11):** criterion 7 names file + definition site and
was verified to bite ✅. Criterion 41's typecheck claim names no site ❌ (L12). No
other phase-1 criterion is safety-shaped.

## Baselines actually measured (2026-08-19, this session)

- `npm run test:item-economics` → **131 passed, 10 files**, 4.23 s. (Master plan §10
  records 125 — see L24.)
- `npx tsc -p packages/item-economics/tsconfig.json --noEmit` → **clean, exit 0**.
- Repo state: branch `main`; the entire `item_valuation_edition/` folder and the
  20260819 handoff mirror are **untracked**; branch `pipeline/item-valuation-edition`
  does not exist.
- Environment fact for the plan: `packages/item-economics/vitest.config.ts` has
  **no `setupFiles`** — component tests import `@testing-library/jest-dom/vitest`
  per file (existing convention, worth stating for Track 1A).

## Write perimeter (full, this session)

1. `docs/architecture/under_construction/implementation/item_valuation_edition/handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_projection_0.md` (this file, new — plus its parent directory `handoffs/reviewer/`)
2. `docs/architecture/under_construction/implementation/item_valuation_edition/plans/PLAN_item_valuation_core_20260819.md` — one appended Review-log line
3. `docs/architecture/under_construction/implementation/item_valuation_edition/master_plan.md` — the phase-1 tracker row only (`NOT_STARTED` → `PROJECTED`)

No source file, test, config or fixture was created, edited or probed. Commands run
were read-only: `npm run test:item-economics`, `npx tsc --noEmit`, greps, `diff`,
`shasum`, and three throwaway `node -e` arithmetic checks (no files written).

*Doctrine note:* the skill assigns the plan's Review-log line to the coordinator; the
dispatching prompt placed items 2–3 inside my perimeter explicitly, and I followed the
prompt.

## Appendix — non-authoritative skeleton (discard)

Kept only as evidence the projection was executed, per the skill's discard rule.
**The implementer must not receive this as guidance.**

- 1B walk: DTO (7 blocks, currency enum missing → L13) → math (3 BigInt ops, verified
  numerically) → reducer (state/event shapes undetermined → L3) → screen state
  (S1/S2 arms undefined → L11) → currency/format (grouping + decimals wrong in the
  criteria → L6/L7) → key registry (only genuinely turnkey task in the phase).
- 1A walk: prop types → fixtures (blocked at "which four mockups" → L8) →
  eleven components → slider (jsdom hazard → L9) → tests (open fixture set → L10).
