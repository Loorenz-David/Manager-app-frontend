---
subject: stock_report — render the match warning as a Property / Asked / Item comparison
status: DRAFT — blocked on step 0 (the backend has not yet shipped the two fields; see step 0)
date: 2026-09-22
audience: the Claude session implementing it
scope: packages/stock-report only
---

# Match warning — the failed-criteria comparison

You are implementing one contained change inside `packages/stock-report`: the locked
"This item does not fully match" sheet stops showing *key + reason sentence* and shows,
for each failed criterion, **what the stock need asked for and what the item has**.
Nothing about when the sheet opens, how it locks, or how *Continue* arms the override
changes.

## 0. Gate — do this before anything else

The frontend asked the backend for two additive fields on every failure element
(`docs/handoff/to_backend/HANDOFF_TO_BACKEND_stock_match_property_evaluations_20260922.md`):

```jsonc
{ "key": "upholstery", "reason": "value_not_accepted",
  "accepted_values": ["Foam", "Synthetic"], "item_values": ["Down"] }
```

in both `POST …/match-preview` → `property_failures[]` and the 409
`stock_assignment_property_mismatch` → `details[].failures[]`.

**Check that it has shipped.** Look in
`docs/architecture/under_construction/implementation/stock_report/backend_handoff/` for a
dated handoff **newer than 2026-09-21** that pins these fields on the failure element
(the backend's convention is a new dated file, never an in-place edit; the file may also be
in the backend repo at `backend/docs/architecture/under_construction/implementation/
stock_report*/…/to_frontend/`). Then confirm against shipped code:
`backend/app/beyo_manager/services/queries/stock_report/preview_stock_task_assignment_match.py`
must serialise more than `{"key", "reason"}` per failure.

- **Handoff present and code matches** → build against *that* handoff's field names,
  nullability and semantics. Where it differs from the request document, the handoff wins.
- **Not present** → **stop and report.** Do not build against the request document's
  guessed names, do not derive the columns client-side (the request document §"Why we
  cannot derive it client-side" explains why: normalised vs raw values, `values_source:
  "stored"`, and the 409 has no candidate).

As of 2026-09-22 09:50 the answer was *not present*: the preview v2 handoff of 2026-09-21
is unchanged and the serializer emits `{key, reason}` only.

## 1. Read first

1. `planning/intention.md` §8.5 (the preview), §12A (the locked sheet, A2/A6/A7), §15 last
   two amendments (contract v2 → 20260922, wiring guide applied).
2. The backend handoff found in step 0, and the request document it answers.
3. `backend_handoff/HANDOFF_TO_FRONTEND_stock_report_api_20260922.md` §4.3 (the 409) and
   §4.5 (the preview) — still the contract for everything except the failure element.
4. The code you are changing, with its tests:
   - `src/api/stock-report-api.ts` — `MatchPreviewBody`, `AssignmentMismatchDetailsSchema`,
     `stockAssignmentMismatchFailures`; test `stock-report-api.test.ts`.
   - `src/hooks/use-stock-assignment-gate.tsx` — `FAILURE_EXPLANATION`, `toFailures`, the
     two places that build a `kind: "warning"` (preview path and `requestOverride`); test
     `use-stock-assignment-gate.test.tsx`.
   - `src/components/sheets/StockMatchWarningSheetContent.tsx` — the sheet; test
     `StockMatchWarningSheetContent.test.tsx`.
   - `src/surfaces/StockMatchWarningSheetPage.tsx`, `src/surface-ids.ts`
     (`StockMatchWarningSurfaceProps = StockMatchWarningSheetContentProps`).
   - `src/fixtures/stock-report-fixtures.ts` — `stockMatchFailuresFixture`.
   - `src/stock-report.types.ts` — `titleCase` / `toStockReportPropertyTags`: the board
     formats criterion values as `Wood Group: Light / Dark`; the *Asked* column must read
     the same way, so share that formatter rather than writing a second one.
5. `ui_design_documentation/05-ui-states.md` §"match warning" and `07-visual-system.md` for
   the tokens; `architecture/33_vaul_drawer.md` (a locked sheet must keep a visible way
   out — the two buttons).

## 2. The owner's design decisions (settled — do not reopen)

- **Only failures are shown.** No rows for criteria that matched. No "N of M matched".
- **Three columns, one row per failed criterion:** Property · Asked · Item.
- **Both columns speak the criterion's vocabulary** (the grouping rule): a `wood_group`
  criterion shows the item's *mapped group* (`Light teak`), never its raw `wood_type`. The
  backend does this mapping; the frontend only formats. Do not "improve" a value.
- **Per reason:**

  | `reason` | Asked | Item |
  |---|---|---|
  | `value_not_accepted` | accepted values, `A / B` | item values, `A / B` |
  | `missing_on_item` | accepted values | `—` (an em dash, `aria-label="No value"`) |
  | `no_group_for_value` | accepted values | `No known group: <raw value>` |
  | `criterion_not_understood` | `Invalid criterion` (muted) | `—` |
  | anything else | accepted values | item values — never crash, never blank the row |

- **Formatting:** the same title-casing the board tags use, values joined with ` / `.
  Empty `accepted_values` with a reason other than `criterion_not_understood` renders `—`,
  never "accepts nothing".
- **The chrome stays:** warning icon + "This item does not fully match", the stored-item
  note, *Change item* and *Continue*. The blocked view is untouched.

## 3. Steps

### 3.1 API boundary — `src/api/stock-report-api.ts`

One shared element schema, used by both parsers so preview and 409 cannot drift:

```ts
const MatchFailureElement = z.object({
  key: z.string(),
  reason: z.string(),
  accepted_values: z.array(z.string()),   // exact name/nullability from the handoff
  item_values: z.array(z.string()),
});
export type StockMatchFailure = z.infer<typeof MatchFailureElement>;
```

`MatchPreviewBody.property_failures` and `AssignmentMismatchDetailsSchema[].failures` use
it; `stockAssignmentMismatchFailures` returns `StockMatchFailure[] | null`. The request's
criterion 5 says the keys are *always present once shipped* — so required, not nullish —
unless the handoff says otherwise. If the handoff pins anything for `quantity` as a
criterion (a rule such as `>= 6` is not a set), parse it exactly as pinned and render it as
the handoff describes; if it is silent, do nothing special — a quantity failure renders
through the generic row.

### 3.2 Mapping — new `src/lib/stock-match-failure-rows.ts`

Move `FAILURE_EXPLANATION` and `toFailures` out of the hook into a pure, tested function:

```ts
export type StockMatchFailureRow = {
  key: string;                 // React key and testid suffix
  label: string;               // "Wood group"
  asked: string;               // "Light / Dark"  | "Invalid criterion" | "—"
  item: string;                // "Light teak"    | "No known group: teak" | "—"
  reason: string;              // passed through for the test ids / a11y text
};
export function toStockMatchFailureRows(failures: readonly StockMatchFailure[]): StockMatchFailureRow[];
```

Import the board's value formatter from `stock-report.types.ts` (export `titleCase` or a
small `formatStockPropertyValues(values)` wrapper — one formatter, two callers).

### 3.3 Component — `StockMatchWarningSheetContent.tsx`

Replace `StockMatchPropertyFailure {label, explanation}` with `StockMatchFailureRow`. The
`failures` prop becomes `readonly StockMatchFailureRow[]`. Render:

- a header row `Property · Asked · Item` — `text-[11px] font-semibold uppercase
  tracking-wide text-muted-foreground`;
- one row per failure — `grid grid-cols-[1.1fr_1fr_1fr] gap-x-3`, every cell `min-w-0
  break-words text-sm`; Property `font-semibold text-foreground`, Asked
  `text-muted-foreground`, Item `font-medium text-foreground`;
- the em dash and the two special strings exactly as §2.

Keep every existing `data-testid` (`stock-match-warning-warning`,
`stock-match-warning-failures`, `stock-match-change-item`, `stock-match-continue`,
`stock-match-stored-note`) and add per row: `stock-match-failure-row-<key>`,
`stock-match-failure-asked-<key>`, `stock-match-failure-item-<key>`. Phone width: 16px
gutters, no horizontal scroll (`06-responsive-behavior.md`).

### 3.4 Hook and page

`use-stock-assignment-gate.tsx`: both warning builders call `toStockMatchFailureRows`;
`requestOverride(failures: readonly StockMatchFailure[])`. The detail page's 409 path
(`StockReportDetailSlidePage.tsx`) already passes what `stockAssignmentMismatchFailures`
returns — the type change flows through. `StockMatchWarningSheetPage.tsx` and
`surface-ids.ts` change only by type.

### 3.5 Fixtures

`stockMatchFailuresFixture` becomes rows covering all four reasons (teak / light teak is the
canonical example). Keep it the component test's input, as the file header says.

### 3.6 Tests — write them with the code, then plant defects

- `stock-match-failure-rows.test.ts`: the four reasons + an unknown reason; formatting
  parity with `toStockReportPropertyTags` for the same values; empty `accepted_values`.
- `stock-report-api.test.ts`: a preview and a 409 body carrying the two fields parse to the
  same element; a 409 element *without* them is rejected (proves the schema is not
  silently lenient — adjust if the handoff pins them nullable).
- `StockMatchWarningSheetContent.test.tsx`: header + one row per failure with the right
  three cells; `—` and the two special strings; both buttons still fire; blocked view
  unchanged.
- `use-stock-assignment-gate.test.tsx`: the rows handed to `openWarning` carry `asked` and
  `item` from the preview payload (preview path) and from the 409 details
  (`requestOverride` path).
- Planted defects, each shown red then reverted: swap `accepted_values`/`item_values` in
  the mapper; drop the `no_group_for_value` branch; make the 409 parser use a second,
  older element schema.

Run: `npm run test:stock-report`, `npx tsc -p packages/stock-report/tsconfig.json --noEmit`.

### 3.7 Docs

- `planning/intention.md` §15: one amendment paragraph — the failure element grew two
  fields (name the handoff), the sheet renders the comparison, only failures shown, the
  grouping rule.
- `docs/handoff/to_backend/HANDOFF_TO_BACKEND_stock_match_property_evaluations_20260922.md`:
  do not edit; the intention amendment records delivery.
- Write `handoffs/MATCH_WARNING_COMPARISON_HANDOFF.md`: files changed, test counts, the
  planted-defect log, anything the handoff left unpinned that you did *not* build.

## 4. Constraints (standing, verbatim intent)

- Everything stays inside `packages/stock-report`. `@beyo/task-creation` is not touched and
  never imports `@beyo/stock-report`; the candidate-gate seam is unchanged.
- Packages never call `openSurface` for surfaces they do not own.
- **Never guess a field the handoff does not pin** — names, nullability, or the quantity
  rule. Ask by stopping, not by inventing.
- Never parse backend error text; `reason` is the only thing branched on.
- Never launch a dev server; do not commit. Report with the test output.

## 5. Acceptance

1. For the captured evidence request (article `0000405`, `upholstery: Down`), the sheet
   shows one row: **Upholstery · Foam / Synthetic · Down** — and nothing for `wood_type`.
2. `wood_group: ["light"]` vs item `teak` → **Wood group · Light · Light teak**.
3. `missing_on_item` → `—` in Item; `criterion_not_understood` → *Invalid criterion* / `—`;
   `no_group_for_value` → *No known group: teak*.
4. The 409 retry sheet shows the same rows as a preview of the same triple.
5. *Change item* and *Continue* behave exactly as before (locked sheet, animated close,
   override armed on Continue) — the existing gate tests stay green unmodified except for
   the row type.
6. Suites green; three planted defects each turned a test red.

## 6. Out of scope

- The board search row (owner: later).
- `include_zero_requested` on `GET /items` — a separate backend change the owner has not
  ruled on.
- Any change to `checks[]`, `refusal_reason`, `can_proceed`, `override_required`.
