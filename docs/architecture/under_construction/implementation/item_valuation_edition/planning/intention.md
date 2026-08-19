# INTENTION_item_valuation_edition_20260819

## Metadata

- Intention ID: `INTENTION_item_valuation_edition_20260819`
- Status: `resolved — round 5, projection r0 folded, decision ledger empty`
- Owner: David
- Shaper: Claude (intention-shaper doctrine, pipeline charter)
- Created at (UTC): `2026-08-19T00:00:00Z`
- Last updated at (UTC): `2026-08-19T00:00:00Z`
- Semantic authorities this intention builds on (read before disputing anything here):
  - `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_price_scenario_20260819.md` — the
    price-scenario endpoint, its payload, the exact BigInt arithmetic, null semantics,
    commit reconciliation, realtime refetch rules. **Where this intention and that handoff
    disagree, the handoff wins and this document has a bug.**
  - `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md`
    §3.1 (PUT valuation), §4.1 (commit endpoint + error identities) — as amended by the
    price-scenario handoff §7.

## 1. Objective

A new slide page, owned by `packages/item-economics`, rendered in the **managers app**,
where an ADMIN/MANAGER sets or changes the **expected sold price** of a task's primary
item — and sees, live at every slider frame, the impact of that price on the work the
item can fund (allowance vs typical work) **before** committing.

Opened from `TaskDetailMenuSheetPage` via a new **"Change retail price"** row
(lucide `CircleDollarSign`).

### Hard constraints

1. **One fetch per screen open; all projection arithmetic is local** — the exact BigInt
   `roundHalfEven` pipeline from the handoff §4, transcribed verbatim. `Number` and
   `Math.round` are forbidden anywhere in the money → seconds path.
2. **Chip and suggestion marker come from `anchors`, never from locally computed
   allowance** (handoff §5.3).
3. **`model === null` is the block switch, never `status`; `item_binding` is checked
   before both** (handoff §5.2, §5.5). Never render zeros for a null block — keep the
   frame, name the missing thing, disable the slider.
4. **Save is disabled whenever `can_commit` is `false`, with the reason shown**
   (handoff §6.1).
5. **Reconcile after save** against the commit response's `production_budget_minor` and
   `allowed_worker_minutes`; refetch and tell on mismatch (handoff §6.3).
6. **Money is whole-item minor units on the wire and in all state**; per-piece is a
   display transform using divisor `max(1, quantity)` (handoff §8.2).
7. Package boundary rules: no `openSurface` from the package (contract 35 §13); the page
   is exposed only through a loader function (contract 35 §14).
8. SRP track split: **Track A (Claude) builds presentational components** driven by a
   pure view model; **Track B (Codex) builds the machinery** (DTO, arithmetic, queries,
   actions, controller, provider, socket wiring). Same split that shipped
   `item_pricing_fields`.

## 2. Grounding (what exists today)

| Fact | Where |
|---|---|
| Package skeleton, keys, socket handlers, status vocab | `packages/item-economics/src/` (`api/item-economics-keys.ts`, `socket-events.ts`, `types.ts`) |
| Money helpers: `resolveTotalMinor`, `toMinorUnits`, `formatMinorPrice`, `INLINE_PRICING_CURRENCY` | `packages/item-economics/src/lib/item-pricing.ts` |
| Item lookup API (`GET /api/v1/items/lookup?article_number=`) with `purchase_price` (per-piece, major units, nullable) | `packages/items/src/api/fetch-item-lookup.ts`, `packages/items/src/types.ts:43` |
| Lookup → purchase-price prefill convention (per-piece semantics) | `packages/task-creation/src/lib/item-lookup-prefill.ts` (`selectPurchaseApiLookupResult`, `applyPurchasePriceLookupResult`) |
| Per-piece → whole-item minor conversion used at task-creation submit | `packages/task-creation/src/lib/normalize-task-form-payload.ts:72` (`resolveTotalMinor`) |
| Menu sheet the button joins; its `openAndDismiss` launcher pattern | `packages/tasks/src/pages/TaskDetailMenuSheetPage.tsx` |
| `@beyo/tasks` already depends on `@beyo/item-economics` | `packages/tasks/src/pages/TaskDetailSlidePage.tsx` (production-time section) |
| Managers-app surface registration (loader + `lazyWithPreload`) | `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts` |
| Avatar primitive | `@beyo/ui` (`components/primitives/avatar`) |
| Slider precedent in `@beyo/ui`: `SliderFieldRow` (native `input[type=range]`, `components/text-styling/SliderFieldRow.tsx`) — corrected by projection r0 L9; the price slider is still a new package-owned component, built over a visually-hidden native range input | `packages/ui/src/index.ts` |
| Role gate on the endpoint: ADMIN/MANAGER only, 403 otherwise | price-scenario handoff §1 |

Backend endpoints this page consumes (all live):

1. `GET /api/v1/item-economics/tasks/{task_client_id}/price-scenario` — the one read.
2. `POST /api/v1/item-economics/tasks/{task_client_id}/evaluations/commit` — Save,
   body `{ expected_sale_price_minor }` only.
3. `GET /api/v1/items/lookup?article_number=…` — purchase-price bootstrap, step 1.
4. `PUT /api/v1/items/{item_client_id}/valuation` — purchase-price bootstrap, step 2.

## 3. Core workflow

### 3.1 Entry

`TaskDetailMenuSheetPage` gains one row, **"Change retail price"** (`CircleDollarSign`),
after "Change article number" and before "Force ready". It follows the existing
`openAndDismiss` pattern, opening `ITEM_VALUATION_SLIDE_SURFACE_ID` (owned by
`@beyo/item-economics` `surface-ids.ts`) with props `{ taskId }`. Nothing else is
needed in props — the scenario payload carries `item.client_id`, `article_number`,
`label`, `quantity`, so the page is self-sufficient from `taskId`.

Visibility: the row renders only for ADMIN or MANAGER (same predicate as the
Force-ready row) — the endpoint 403s every other role. *(Owner-ratified, round 2.)*

The page registers in the managers app per contract 35 §14: `loadItemValuationSlidePage`
loader in the package `index.ts`, `lazyWithPreload` registration in a managers-app
surfaces file. The slide closes by the app-wide slide-to-close gesture; no Close/Back
header buttons.

### 3.2 Screen states (mutually exclusive, resolved in this exact precedence)

Evaluated top to bottom; the first match wins. This ordering encodes the handoff's
"binding before status, model-null before both" rule plus the owner's purchase-first
rule — which, per owner card 1 (2026-08-19, projection round 0), applies exactly
where the **server itself refuses to save without a purchase price**, never wider:
`saved === null` means no valuation row exists and commit refuses regardless of the
request body (handoff §6.2), and `status === "item_missing_purchase_cost"` means the
cost model demands a purchase cost the item lacks. An item whose cost model never
reads the purchase cost renders the editor with `saved.purchase_cost_minor: null`
(the handoff §2 example is exactly this payload).

| # | State | Predicate (on the scenario payload) | What renders |
|---|---|---|---|
| S1 | `loading` | query pending, no cached scenario | skeleton keeping the card frame |
| S2 | `error` | query error **with no cached scenario** — a background refetch failure over cached data keeps the state the cached payload resolves to (the commit is protected by M10's fresh-fetch gate, §4A) | frame + error message + retry |
| S3 | `unbound` | `item_binding !== "bound"` | frame, empty state naming the missing/mismatched item; no slider, no Save |
| S4 | `purchase_required` | `saved === null` OR `status === "item_missing_purchase_cost"` | mockup 1: "No price set · purchase price needed first", shimmer in the PER PIECE slot, explanation, **Fetch purchase price** CTA (§3.3) |
| S5 | `blocked` | `model === null` | frame kept, human message derived from `status` (configuration failure vocabulary), disabled slider region, no numbers, Save disabled |
| S6 | `editor` | otherwise (`model !== null`, purchase present) | the full editor (§3.4) |

Inside S6 two independent degradations apply (never collapse the whole state):
- `domain === null` → slider disabled with reason; headline numbers still render.
- `anchors.is_fundable === false` or `break_even_price_minor === null` → no chip, no
  suggestion marker, no "Use suggested" row; everything else stays.
- `typical.total_seconds === 0` with `is_estimated` → the TYPICAL column renders empty
  with a reason, **never "0m"** (handoff §5.1). When `is_estimated` is `true` the word
  "estimated" appears next to the typical value.

### 3.3 Purchase-price bootstrap (state S4)

The app's rule (owner-stated): an expected sold price is never set before a purchase
price exists, because the purchase price arrives from the external purchase application
via article-number lookup. This screen reuses the exact task-creation flow:

1. **Fetch purchase price** pressed →
   `fetchItemLookup({ article_number: item.article_number })` (from `@beyo/items`).
2. Select the result with `external_source === "purchase_api"` (same rule as
   `selectPurchaseApiLookupResult`).
3. Branches:
   - `item.article_number === null` → CTA is disabled from the start; message: the item
     has no article number yet — set it via "Change article number" first.
   - lookup returns no `purchase_api` result → message: the item must first be created
     on the purchase application.
   - result found but `purchase_price` is null/invalid (same validity rule as
     `applyPurchasePriceLookupResult`: finite, `>= 0`) → message: set the purchase price
     on the purchase application, then fetch again.
   - result found with a valid `purchase_price` →
     `PUT /items/{item.client_id}/valuation` with body:
     - `purchase_cost_minor: resolveTotalMinor(purchase_price, item.quantity)` —
       per-piece major → whole-item minor, the identical conversion task creation uses;
       quantity divisor is the **scenario item's** quantity, `max(1, ·)` semantics via
       `resolvePricingQuantity`.
     - `expected_sale_price_minor: saved.expected_sale_price_minor` **included whenever
       `saved` exists and carries one** — shields against either omitted-field semantics
       on the backend (preserve vs null); sending the unchanged value is safe under both.
     - `currency: saved?.currency-equivalent` when a valuation exists (the scenario's
       top-level `currency`), else `INLINE_PRICING_CURRENCY`.
4. On 200 → invalidate the scenario query → screen re-resolves, normally into S6 with
   `status: item_missing_expected_price` and `can_commit: true` (handoff §6.2 — this
   PUT is what *creates* the valuation row Save requires).
5. Errors surface inline in the S4 frame (identity-token parsing via the existing
   `parseErrorIdentity`); `ITEM_COST_CONCURRENT_VALUATION` → refetch and retry message.

The round trip is accepted and rare by design (owner-stated: items are normally created
with a purchase price already).

### 3.4 The editor (state S6)

Layout (mockups 2–4, top to bottom):

1. **Header** (above the divider): title "Expected sold price"; subtitle
   `ITEM <article_number> · <LABEL> (<quantity>)` (label uppercased; article number or
   label absent → omit that fragment). Top-right three-dot button: **decorative only,
   no action** this iteration.
2. **Provenance row** (§3.5) with the optional **Back to N** toggle button.
3. **PER PIECE headline**: draft price ÷ `max(1, quantity)`, sv-SE grouping, currency
   code (`swedish_krona`→SEK, `danish_krona`→DKK, `euro`→EUR) from the payload
   `currency`; when `currency` is null (first pricing) the code falls back to the
   `INLINE_PRICING_CURRENCY` mapping, since that is what the bootstrap wrote.
4. **`× N pieces · T SEK total`** line (whole-item draft), then
   **`purchase price P SEK`** line (whole-item `saved.purchase_cost_minor`).
5. **Chip**: draft ≥ `anchors.break_even_price_minor` → "Covers typical work" (green);
   below → "Below typical work" (red). Flip boundary exactly at the anchor: at
   `P = break_even` the chip reads covered, at `P − step` it does not.
6. **Slider**: track over `[domain.min_minor, domain.max_minor]`, handle snaps to
   `domain.step_minor` grid; filled portion tinted by the chip's tone (green/red);
   vertical **suggested marker** at `anchors.suggested_price_minor` with the label
   `suggested S/piece`; band end labels `min/piece`, `max/piece`. Render the ends the
   payload gives — never reproduce mockup constants (the band is derived; handoff §5.4).
7. **Work table**: "Work on this item" · TYPICAL (`typical.total_seconds`) · AT PRICE
   (`allowance_seconds(draft)` computed by the BigInt pipeline, **rounded to nearest
   minute**, `h m` format). AT PRICE tone follows the chip.
8. **Save button**: label `Save <per-piece> SEK / piece`. Disabled (grey) when the draft
   equals the saved expected price, when `can_commit` is `false` (reason shown beneath),
   or while the commit is in flight.
9. **Use suggested `S` SEK / piece** tertiary text button: sets the draft to
   `anchors.suggested_price_minor`. Hidden when the suggestion anchor is null.

### 3.5 Draft state machine and provenance row

The **draft** is the whole-item minor price the screen currently shows. Client-only,
per-open (closing the slide discards it), never persisted except through Save.

Initialisation on scenario arrival:
- `saved.expected_sale_price_minor` present → draft = that exact value (even if it is
  off the `domain` grid — the handle renders at the nearest position, and the first
  drag snaps the draft onto the grid).
- expected price null (fresh from bootstrap, `item_missing_expected_price`) → draft =
  `purchase_cost_minor × 4`, clamped into `[domain.min_minor, domain.max_minor]` and
  snapped to the nearest `step_minor` multiple. When `domain` is null the default is
  the raw ×4 value (slider disabled anyway). This arm always has a purchase cost to
  multiply: a valuation row carries at least one of the two amounts (operational
  handoff §3.1), so inside S6 a null expected price implies a non-null
  `purchase_cost_minor`.

Provenance row variants:

| Variant | Predicate | Avatar | Copy | Back button |
|---|---|---|---|---|
| `unpriced-pristine` | no expected price ever, draft untouched | grey dash | "No price set · suggested from purchase price × 4" | hidden |
| `saved-pristine` | draft === saved expected | `saved.created_by` (Avatar; current user renders as "You") | "saved version · <relative created_at>" | shown only when a `lastDraft` exists this session: "Back to `<lastDraft per piece>`" |
| `dirty` | draft ≠ saved expected (or ≠ the ×4 default in unpriced case) | current user, "You" | "unsaved change · <relative time of last edit>" | "Back to `<saved per piece>`" when a saved expected exists; hidden otherwise |

**Back to N** is a two-position toggle between the saved value and the last edited
draft: pressing it in `dirty` reverts the draft to saved and remembers the abandoned
value as `lastDraft` (the button then reads "Back to `<lastDraft>`", mockup 3);
pressing it again restores `lastDraft`. `lastDraft` is written **only** by the
Back-from-dirty transition and cleared by Back-restore and by a successful save — a
manual edit never touches it (full contract: §4A M4). `saved.created_by === null`
(unloadable user) → avatar renders initials-less fallback with copy "saved version"
only.

### 3.6 Save

One call: `POST …/evaluations/commit` with `{ expected_sale_price_minor: draft }`.
No purchase cost, no label, no currency (the operational handoff §4.1 forbids currency
here).

On 200:
- Reconcile: compare the response's `production_budget_minor` with the locally computed
  `budget_minor(draft)` and `allowed_worker_minutes` with the local
  `allowed_centimin(draft) / 100` at two decimals. Mismatch → refetch the scenario and
  notify ("prices were updated — showing the latest"), never a silent save.
- Match → refetch the scenario anyway (cheap consistency; the new `saved` block with
  author/timestamp comes from it), clear `lastDraft`, land in `saved-pristine`
  showing "saved version · just now". **The page stays open** — no auto-close.

On error: identity-mapped message (operational handoff §4.1 table); the five
`NO_*`/`AMBIGUOUS_*` configuration identities render their settings-pointing copy;
`ITEM_COST_CONCURRENT_COMMIT` (409) → refetch + "someone else saved first" message.

Staleness guard (handoff §6.3 "refetch before enabling Save after a long idle"):
- refetch on window focus / visibility regain;
- if the last successful scenario fetch is older than 60 s at the moment Save is
  pressed, the press first refetches (button shows a brief pending state) and commits
  only after fresh constants arrive with `can_commit` still true. One press, never two.

### 3.7 Realtime

Per handoff §6.3, the scenario must refetch on:
- `task:step-state-changed` for **any** task in the workspace (the typical is a
  workspace-wide median) — **debounced trailing-edge 10–15 s, coalesced**;
- `item:updated` for this item — a new event for this codebase; the handler lands in
  `packages/item-economics/src/socket-events.ts`;
- `item_economics:evaluation-committed` for this task (another manager saved) — the
  existing handler currently invalidates only `taskProductionTime` and must also cover
  the scenario.

**Key-placement constraint discovered while grounding:** the existing
`task:step-state-changed` handler invalidates the whole `itemEconomicsKeys.tasks()`
branch *immediately*. If the scenario key were placed under that branch it would be
refetched undebounced on every step event, defeating the mandated debounce on an
expensive aggregate. The scenario key therefore lives on its **own branch** of
`itemEconomicsKeys` (e.g. `priceScenario(taskId)` directly under `all`), reached only
by the debounced handler. Mechanism-inventory must contract the debounce (timer scope,
coalescing, cleanup).

A refetch while `dirty` updates constants, anchors, chip, table and the saved row —
and leaves the draft untouched.

## 4. Domain model and state ownership

| State | Owner / writer | Never overwritten by |
|---|---|---|
| Scenario payload (all blocks) | backend; frontend read-only via one query | anything client-side |
| `draft` (whole-item minor int) | user via slider / Use suggested / Back toggle; initialised by the rules in §3.5 | socket refetches |
| `lastDraft` | the Back toggle mechanics (§3.5) | refetches |
| `lastEditedAt` (for "· just now") | set on every draft change | — |
| Purchase price | backend valuation row; this screen writes it **only** through the lookup bootstrap (§3.3), never hand-typed | — |
| Expected sold price (persisted) | backend, via commit only | the bootstrap PUT never changes it (it echoes the current value) |
| Allowance at draft price | derived, computed per frame, displayed only | never stored, never sent |
| Chip / marker / band | backend anchors & domain verbatim | local computation |

**Derived vs fact:** everything the user sees north of the slider is either a payload
fact (purchase price, saved author, typical) or a pure function of `(draft, model)`
computed by the contracted BigInt pipeline. No derived value is written back; the only
writes are the two POST/PUT calls above, each carrying facts the user chose.

## 4A. Mechanism contracts (added by mechanism-inventory, 2026-08-19)

Ranked by silent-failure risk — wrongness that persists money or quietly disagrees
with the server outranks anything that crashes. Every contract below is binding on
Track B; the invariant named in each is a required test **on the production code path**
(the same function/module production code calls, never a re-implementation in the
test file).

### M1 — Bootstrap money conversion (writes money; highest risk)

The PUT body of §3.3 step 3 is built by exactly this rule and no other:

- **Inputs:** `purchase_price` from `ItemLookupResultSchema` — `number | null |
  undefined`, **per-piece, major units (kronor)**, may carry decimals (`474.99`);
  `item.quantity` from the scenario payload — non-null integer, **may be `0`**
  (handoff §8.2); `saved` — the scenario block or `null`.
- **Validity gate:** `purchase_price != null && Number.isFinite(purchase_price) &&
  purchase_price >= 0` — identical to `applyPurchasePriceLookupResult`. Invalid →
  the "set it on the purchase application" branch; **no PUT fires**.
- **Conversion:** `purchase_cost_minor = resolveTotalMinor(purchase_price,
  item.quantity)` — the existing lib function, which rounds per piece **before**
  multiplying and applies `max(1, quantity)` via `resolvePricingQuantity`. Never
  re-implemented, never `Math.round(price * quantity * 100)`.
- **Echo:** `expected_sale_price_minor` included **iff** `saved !== null &&
  saved.expected_sale_price_minor !== null`, copied verbatim (integer minor,
  untouched).
- **Currency:** the scenario's top-level `currency` when non-null, else
  `INLINE_PRICING_CURRENCY`.
- **Invariant test:** with `purchase_price: 474.99`, `quantity: 6`, saved expected
  `855000`, currency `null` → body is exactly `{ purchase_cost_minor: 284994,
  expected_sale_price_minor: 855000, currency: "swedish_krona" }` (47 499 × 6, rounded
  per piece first). With `quantity: 0` → `purchase_cost_minor: 47499`. With `saved:
  null` → no `expected_sale_price_minor` key at all (absent, not `null`).

### M2 — The allowance pipeline (BigInt, transcribed, never adapted)

- `roundHalfEven(a, b)` is copied **verbatim** from the handoff §4 — if any character
  changes, the 612-case comparison against the Python reference must be re-run.
- The three operations are implemented as three calls in the handoff's exact order and
  scaling; no algebraic shortcut (budget → seconds directly is a named defect).
- **Boundary types:** the draft enters as a JS integer `number`, converted once via
  `BigInt(draft)`; model constants enter as integers from the DTO, converted once.
  Everything between entry and `allowance_seconds` is `bigint`. `Number`,
  `Math.round`, `parseFloat` are forbidden inside the module; the module exports
  `allowanceSeconds(priceMinor: number, model): number` (safe — seconds fit a double)
  and `budgetMinor(priceMinor: number, model): bigint`.
- **Invariant tests:** the four negative-tie vectors of handoff §9.1;
  `allowanceSeconds(855000, §9.2-model) === 8681`.

### M3 — Display quantization of the allowance

- Minutes = nearest-minute: `m = Math.round(seconds / 60)` (allowed — this is after
  the money path exits; seconds is a small number). `8 681 s → 145 min → "2h 25m"`.
- Format: `h = floor(m/60)`, `r = m % 60`; render `"{h}h {r}m"` when `h > 0`, else
  `"{r}m"`. `"3h 0m"` renders as `"3h 0m"` (kept — column alignment beats prettiness).
- **A computed allowance ≤ 0 renders `"0m"` in the AT PRICE cell** (red tone). This is
  a true value, distinct from the null-block rule ("never render zeros for a *null*
  block") — S5/S3 frames still never show numbers.
- TYPICAL uses the same formatter on `typical.total_seconds`, except
  `total_seconds === 0` → the §3.2 empty-with-reason rule, never `"0m"`.
- **Invariant test:** `8681 → "2h 25m"` (a truncating minute rule yields `"2h 24m"`
  and must fail); `-1 → "0m"`.

### M4 — Draft / lastDraft state machine (total transition table)

State variables: `draft: number` (whole-item minor), `lastDraft: number | null`,
`initialDefault: number | null` (set once at init when unpriced), plus payload
`savedExpected = saved?.expected_sale_price_minor ?? null`.

| # | Event | Guard | Effect |
|---|---|---|---|
| T1 | INIT (scenario first arrives) | `savedExpected !== null` | `draft := savedExpected; lastDraft := null; initialDefault := null` |
| T2 | INIT | `savedExpected === null` | `draft := initialDefault := clampSnap(purchase_cost_minor × 4)`; `lastDraft := null` |
| T3 | DRAG(v) / USE_SUGGESTED | — | `draft := v; lastEditedAt := now` (lastDraft untouched) |
| T4 | BACK | `draft !== savedExpected && savedExpected !== null` | `lastDraft := draft; draft := savedExpected` |
| T5 | BACK | `draft === savedExpected && lastDraft !== null` | `draft := lastDraft; lastDraft := null` |
| T6 | SAVE_OK (post-refetch) | — | `lastDraft := null` (draft now equals the new savedExpected by T1-on-refetch rule below) |
| T7 | REFETCH (socket/focus) | `savedExpected` unchanged | nothing — draft, lastDraft survive |
| T8 | REFETCH | `savedExpected` changed AND `draft` was pristine (=== old savedExpected) | `draft := new savedExpected` |
| T9 | REFETCH | `savedExpected` changed AND draft was dirty | draft, lastDraft survive; provenance row re-derives |

The provenance variant is a **pure function**, never stored:
`unpriced-pristine` iff `savedExpected === null && draft === initialDefault &&
lastDraft === null`; `saved-pristine` iff `savedExpected !== null && draft ===
savedExpected`; else `dirty`. The Back button renders iff T4 or T5's guard holds.
- **Invariant test** (corrected by projection r0 L1 — the earlier T2-start sequence
  was unexecutable, since both BACK guards need a non-null `savedExpected`): init via
  **T1** with `savedExpected = 855000`, quantity 6, band `{420000, 1650000, 15000}`;
  drag 1 335 000 → BACK → BACK → drag 1 005 000 → BACK ends with
  `draft === 855000 === savedExpected`, `lastDraft === 1005000`, Back label showing
  the 1 675-per-piece value — and a SAVE_OK then blanks the button.

### M5 — `clampSnap` (default-draft placement)

`clampSnap(v)`: if `domain === null` → `v` unchanged. Else
`clamped = min(max(v, domain.min_minor), domain.max_minor)`;
`snapped = domain.min_minor + Math.round((clamped − domain.min_minor) /
domain.step_minor) × domain.step_minor` (integer `number` math — values are exact
integers well inside 2^53; ties round up, positive domain only); result re-clamped to
`max_minor` (a tie at the top edge may overshoot by one step).
- **Invariant test:** with band `{min 420000, max 1650000, step 15000}`:
  `clampSnap(11400 × 100 = 1140000) === 1140000` (mockup 4 — already on grid);
  `clampSnap(2000000) === 1650000`; `clampSnap(427500) === 435000` (tie rounds up);
  `clampSnap(427499) === 420000`.

### M6 — Slider ↔ price mapping

`steps = (domain.max_minor − domain.min_minor) / domain.step_minor` (exact integer by
the handoff's multiples guarantee — assert in dev, don't round). Drag fraction `f ∈
[0,1]` → `draft = domain.min_minor + Math.round(f × steps) × domain.step_minor`.
Rendering an off-grid draft (T1 with an off-grid saved value): handle position
`f = (draft − min) / (max − min)` clamped to `[0,1]`, display only — the draft value
itself is not mutated until the first DRAG event.

### M7 — Chip / marker derivation

Covered iff `draft >= anchors.break_even_price_minor` (BigInt/number int compare —
both are integers, plain `>=` on numbers is safe). Marker at
`anchors.suggested_price_minor`. Both render only when `anchors.is_fundable === true`
**and** the respective member is non-null. No local allowance comparison, ever.
- **Invariant test:** at `draft === break_even` → covered; at `draft === break_even −
  domain.step_minor` → below (drive both from payload integers).

### M8 — Commit reconciliation comparison

- `production_budget_minor` (response, integer) compared for **exact equality** with
  `Number(budgetMinor(draft, model))`.
- `allowed_worker_minutes` (response, decimal string, 2 dp) compared for **exact
  string equality** with the local rendering of `allowed_centimin(draft)`:
  `q = c / 100n`, `r = abs(c % 100n)` → `` `${q}.${r padded to 2}` `` (negative `c`
  formats sign on `q`; `-5` centimin → `"-0.05"` needs the explicit sign branch).
- Mismatch on **either** → exactly one scenario refetch + one neutral notice ("the
  numbers were re-checked against the server — showing the saved result"). **Never
  re-commit, never a second reconciliation, never silent.** A mismatch is an expected
  rare event (the ≤ 1.5-öre approximation bound crossing a display boundary), not an
  error state.
- **Invariant test:** a mocked commit response one öre off the local budget triggers
  one refetch and one notice; an exact response triggers zero notices.

### M9 — Debounced workspace refetch (timer contract)

- `task:step-state-changed`: one module-scope trailing-edge timer in
  `socket-events.ts`, **12 s**, restarted on every event (no max-wait — commit
  correctness is guarded by M10, not by this timer). On fire: `invalidateQueries`
  on the `priceScenario` **branch root** (all tasks), `refetchType: "active"`. The
  timer is module-global (handlers are static), so no per-mount cleanup exists or is
  needed; at most one refetch per quiet window regardless of event volume.
- `item:updated`: immediate (item edits are rare, material) — invalidate the
  `priceScenario` branch root, active only. New handler; the event joins
  `itemEconomicsSocketEvents`.
- `item_economics:evaluation-committed`: immediate — invalidate
  `priceScenario(client_id as TaskId)` **in addition to** the existing
  `taskProductionTime` invalidation.
- **Key placement (binding):** `itemEconomicsKeys.priceScenario(taskId)` lives
  directly under `all`, **not** under `tasks()` — the existing undebounced
  `tasks()`-branch invalidation must not reach it. A test asserts the scenario key
  does **not** match `itemEconomicsKeys.tasks()` as a prefix.
- **Invariant test:** five step events 1 s apart → zero refetches before, exactly one
  after the 12 s trailing edge.

### M10 — Staleness-guarded Save

On Save press: if `now − dataUpdatedAt > 60_000` → `refetch()` first (button in
pending state), then re-evaluate on the **fresh** payload: `can_commit` still true and
screen state still S6 → commit fires; otherwise abort with the payload's reason and
**no commit**. One press yields at most one commit and at most one refetch. When not
stale, commit fires immediately. While a commit is in flight the button is disabled
(no double-fire). If the pre-commit refetch itself **fails**, the save aborts with
the error surfaced — this is what makes S2's keep-cached-editor-on-background-error
rule safe: stale data can be looked at, never committed on.

### M11 — Currency display mapping

Total over the enum: `swedish_krona → "SEK"`, `danish_krona → "DKK"`, `euro → "EUR"`;
exhaustive switch, no default arm (a new enum member must fail typecheck, not fall
back to SEK). Payload `currency: null` in S6 occurs only pre-first-pricing; the code
then shows the `INLINE_PRICING_CURRENCY` mapping because that is what the bootstrap
wrote and what Save will price in.

### M12 — Per-piece display

`perPiece = minor / (100 × max(1, quantity))`, display-only, sv-SE grouping, max 2
decimals, `minimumFractionDigits: 0` (grid values render whole: "2 225"; off-grid
saved values may render decimals: "1 425,17"). The stored draft is never replaced by
a re-parse of its own display.

### M13 — Scenario DTO

- Zod schema mirrors handoff §2 exactly; `status` reuses `ItemEconomicsStatusSchema`
  (`packages/item-economics/src/types.ts:38` — already the twelve-value vocabulary)
  as `.nullable()`. Every field the handoff lists as nullable is `.nullable()`, never
  `.optional()` (the backend always sends the key — `.optional()` here is the
  documented blank-page trap).
- The integer-scaled fields (`residual_percent_milli`,
  `cost_per_worker_minute_ten_thousandths`) are `z.number().int()`, never the house
  decimal-string schema.
- Contract identity: the DTO module records `calculation_version: 1`; a payload with
  a different `calculation_version` fails parse loudly (literal), because the
  arithmetic contract M2 is version-bound.

## 5. External-source strategy

The purchase application is reached **only** through the backend's
`GET /api/v1/items/lookup` proxy already in production use by task creation — no new
transport, no direct calls to the external service, frontend stays DB/API-only. The
per-piece major-unit semantics of `purchase_price` are an observed contract of that
endpoint (task-creation treats it as `purchase_cost_per_piece`); no separate source
evidence doc is needed beyond citing `item-lookup-prefill.ts` and
`normalize-task-form-payload.ts:72`.

## 6. Operations

- Roles: ADMIN/MANAGER; other roles never see the entry button and would 403.
- No feature flags. No migrations. One new surface registration in the managers app.
- Errors: house envelope, identity = leading token of `error` up to first colon —
  `parseErrorIdentity` already implements this.
- Retired error identity sweep (price-scenario handoff §7.3): grep the frontend for
  handling of the retired inline-pricing refusal identity on the task-creation path and
  delete the branch if found. (Checked at shaping time: `packages/item-economics/src/lib/error-identity.ts`
  and task-creation submit paths are the places to look; planner must add this as a
  phase task.)

## 7. Scope ladder

**Must ship**
1. Menu row (gated, `CircleDollarSign`) + slide surface registration (loader function).
2. Scenario DTO (Zod), query hook, own-branch key.
3. BigInt arithmetic lib (`roundHalfEven` verbatim + the three-operation pipeline +
   nearest-minute display rule) with the handoff's reference vectors as tests.
4. Screen-state resolution S1–S6 + editor with slider, chip, marker, work table,
   provenance row, Back toggle, Use suggested, Save with reconciliation + staleness
   guard.
5. Purchase-price bootstrap flow with all four branches.
6. Realtime: debounced step-event refetch, `item:updated`, evaluation-committed
   extension.
7. Vitest + Playwright (mobile first, then desktop) per `34_runtime_validation_local.md`.

**Only if cheap**
- Skeleton component for S1 matching the card frame; surface preload on menu open.
- Ticking relative time on the provenance row (otherwise static "just now" is fine).

**Explicitly deferred**
- Three-dot menu actions (decorative this iteration).
- Valuation history screen (`GET /items/{id}/valuations`).
- Editing/refreshing the purchase price once set (no UI; the bootstrap only runs in S4).
- Projections endpoint (`POST /tasks/{id}/projections`) — local arithmetic replaces it.
- Workers/sellers variants.

## 8. Testing priorities (ranked)

1. `roundHalfEven` negative-tie vectors (handoff §9.1) — a truncating implementation
   must fail.
2. Reference scenario: `P = 855 000` with the §9.2 constants → `allowance_seconds =
   8 681` → "2h 25m" (nearest minute; "2h 24m" is the named failure).
3. Chip flip at exactly `break_even_price_minor` vs one step below, driven by anchors.
4. State resolution precedence: `mismatched` + `status: ok` lands in S3, not S6;
   `saved: null` + full model lands in S4 (purchase first), not S6.
5. S5 frame: no zeros rendered, slider disabled, Save disabled.
6. Bootstrap branches: no article number / no purchase_api result / null price / success
   — success asserts the PUT body (conversion, echoed expected price, currency).
7. Draft machine: init-from-saved, ×4 clamp+snap default, Back toggle two-position
   semantics, Save-disabled-when-equal.
8. Reconciliation: mismatched commit response triggers refetch + notice.
9. Debounce: N step events inside the window → one refetch after trailing edge.
10. Playwright: menu row → page open → drag slider → save (mocked) → saved-version row,
    on mobile project first (filterTaps: use tap/press helper inside PullToRefresh
    contexts).

## 9. Pre-implementation protocol

1. **mechanism-inventory** — PASSED 2026-08-19; the contracts live in §4A (M1–M13).
2. Then **implementation-planner**: master plan + phases sized for independent
   sessions, honoring the A/B track split (Track A can start on fixtures immediately;
   Track B bottom-up per `16_feature_workflow.md`).
3. Contract set (per `task_system/frontend_contract_goal_mapping_guide.md`): core
   contracts + CRUD bundle (07, 09→n/a forms-lite, 10, 11→n/a routes, 14, 23, 24, 17,
   34+local) + UI bundle (28+local, 27, 31, 32) + 35 §13/§14 + 30+local + 21
   (realtime) + 36 if the page registers a scroll container. Planner emits the exact
   resolved list with justifications.
4. Naming proposals (planner owns the registry; these are the shaped defaults):
   surface `ITEM_VALUATION_SLIDE_SURFACE_ID = "item-valuation-slide"`, page
   `ItemValuationSlidePage`, loader `loadItemValuationSlidePage`, key
   `itemEconomicsKeys.priceScenario(taskId)`, components under
   `packages/item-economics/src/components/price-editor/`, arithmetic under
   `src/lib/price-scenario-math.ts`, DTO under `src/lib/price-scenario-dto.ts`.

## 10. Shaping changelog

- **2026-08-19 · round 1 (Claude).** Shaped from the owner's spoken brief + four
  mockups + the two backend handoffs. Resolutions made in-document rather than
  preserved as ambiguity:
  1. Bootstrap PUT echoes the existing expected price alongside the fetched purchase
     cost — safe under both omitted-field semantics; avoids a backend question.
  2. Purchase-first gating (S4) outranks configuration blocking (S5): the purchase
     price is the first actionable step regardless of workspace configuration.
  3. ×4 default is clamped into the domain band and snapped to the step grid — an
     off-band handle position is not representable, and the band is owner-ratified as
     derived.
  4. Off-grid saved values initialise the draft exactly; snapping happens on first
     drag — display fidelity of the saved fact wins over grid purity.
  5. Post-save the page stays open in `saved-pristine` (mockup 3's row proves the
     state exists); `lastDraft` cleared.
  6. Draft is per-open; closing the slide discards it (no persistence).
  7. "Long idle" (handoff §6.3) concretised: focus/visibility refetch + a 60 s
     staleness gate on the Save press itself.
  8. Scenario query key placed outside `itemEconomicsKeys.tasks()` to keep the
     mandated debounce from being defeated by the existing undebounced branch
     invalidation.
  9. Terminology kept as given: button "Change retail price", page title "Expected
     sold price".
  10. Currency on first pricing: `INLINE_PRICING_CURRENCY` (existing single home for
      the no-picker era, task-creation precedent).

- **2026-08-19 · round 2 (owner review).** D1 answered: the menu row is gated to
  ADMIN/MANAGER. Ledger emptied; status moved to `resolved`. No other corrections.

- **2026-08-19 · round 3 (mechanism-inventory).** Added §4A: thirteen contract-grade
  mechanism definitions (M1–M13), ranked by silent-failure risk. Unilateral
  resolutions made by contract, listed for owner ratification in the gate report:
  1. §3.5 internal inconsistency fixed — `lastDraft` is written only by
     Back-from-dirty and cleared by Back-restore / successful save; a manual edit
     never overwrites it (the round-1 sentence saying otherwise contradicted the
     toggle semantics and is superseded by §4A M4).
  2. A computed allowance ≤ 0 renders `"0m"` (red) in AT PRICE — a true value,
     distinct from the never-render-zeros-for-null-blocks rule (§4A M3).
  3. Reconciliation mismatch → one refetch + one neutral notice, never re-commit
     (§4A M8).
  4. Debounce fixed at 12 s trailing, no max-wait — commit correctness is carried by
     the M10 staleness guard instead (§4A M9).
  5. `calculation_version` pinned as a Zod literal `1` — a backend version bump fails
     the parse loudly rather than running version-1 arithmetic on version-2 constants
     (§4A M13).

- **2026-08-19 · round 4 (owner review).** All five round-3 ratifications (R1–R5)
  confirmed as written. Owner additionally confirmed the currency default:
  `swedish_krona` via the shared `INLINE_PRICING_CURRENCY` constant, exactly as the
  task-creation form (`packages/task-creation/src/components/InternalFormContent.tsx`)
  already does — §3.3 / §4A M1 stand unchanged. Gate to implementation-planner is
  open.

- **2026-08-19 · round 5 (projection round 0 folded; owner cards resolved).**
  1. **Owner card 1 resolved (owner, recommended branch):** S4 `purchase_required`
     is gated on the **server's own refusal** — predicate now `saved === null OR
     status === "item_missing_purchase_cost"` — instead of any missing purchase
     cost. An item whose cost model ignores the purchase cost renders the editor.
     (§3.2 table + rationale amended.)
  2. **Owner card 2 resolved (owner):** no mockup files are committed. Track 1A is
     implemented by Claude, who authored this intention from the mockups; the §3.4
     prose layout is the binding written brief, and visual fidelity is validated by
     the owner at phase review.
  3. Projection L1: §4A M4's invariant sequence was unexecutable (started at T2,
     whose null `savedExpected` blocks both BACK guards) — replaced with the traced
     T1-start sequence.
  4. Projection L11 (coordinator resolution): S2 `error` renders only when the query
     errors with **no cached scenario**; a background refetch failure over cached
     data keeps the cached resolution, and M10's fresh-fetch gate (now explicit) is
     what keeps a stale editor from committing.
  5. Projection L9 (factual correction): §2's "no slider primitive" grounding row
     was false — `SliderFieldRow` exists in `@beyo/ui`. `PriceSlider` is built over a
     visually-hidden native `input[type=range]` (keyboard, a11y and jsdom testability
     for free); grounding row corrected.
  6. Noted for S6 (from card 1's consequence check): inside the editor, a null
     expected price implies a non-null purchase cost, because a valuation row carries
     at least one amount — the ×4 default is always computable. (§3.5 note.)

## 11. Open decisions

| # | Decision | Status |
|---|---|---|
| D1 | Menu row visibility: gate to ADMIN/MANAGER vs show to all roles | **RESOLVED (owner, 2026-08-19): gated to ADMIN/MANAGER** |

The ledger is empty. All other unknowns identified during shaping were resolved
in-document (changelog above).
