---
subject: stock_report — the match warning's Property / Asked / Item comparison
status: IMPLEMENTED
date: 2026-09-22
scope: packages/stock-report only
answers: prompts/PROMPT_03_claude_match_warning_comparison.md
---

# Match warning — the failed-criteria comparison

The locked "This item does not fully match" sheet no longer explains a mismatch in a sentence.
Per failed criterion it shows what the stock need asked for beside what the item actually has.

## The gate (PROMPT_03 §0)

Passed, on the second look. `HANDOFF_TO_FRONTEND_stock_match_property_evaluations_20260922.md`
(SHIPPED, additive) pins the two fields, and the shipped code agrees:
`domain/stock_report/criteria_matcher.py` declares a four-key `CriterionFailure` with a shared
`serialize_criterion_failure`, called by both
`services/queries/stock_report/preview_stock_task_assignment_match.py:163` and
`services/commands/stock_report/create_stock_task_assignments.py:145`.

The backend change was still uncommitted in its working tree when checked, which is why an
earlier grep of the same paths came back empty. Nothing here depends on it staying uncommitted,
but **the frontend now requires those fields** — see "What breaks if the backend regresses".

## Files changed

| File | Change |
|---|---|
| `src/api/stock-report-api.ts` | New `MatchFailureElement` schema + `StockMatchFailure` type; both `MatchPreviewBody.property_failures` and `AssignmentMismatchDetailsSchema[].failures` use it; `stockAssignmentMismatchFailures` returns `StockMatchFailure[] \| null` |
| `src/lib/stock-match-failure-rows.ts` | **New.** `toStockMatchFailureRows`, `StockMatchFailureRow`, `STOCK_MATCH_NO_VALUE` |
| `src/lib/stock-match-failure-rows.test.ts` | **New.** 9 tests |
| `src/components/sheets/StockMatchWarningSheetContent.tsx` | `failures` is now `readonly StockMatchFailureRow[]`; the list became a three-column comparison; `StockMatchPropertyFailure` is gone |
| `src/components/sheets/StockMatchWarningSheetContent.test.tsx` | Warning view rewritten (10 tests in the file) |
| `src/hooks/use-stock-assignment-gate.tsx` | `FAILURE_EXPLANATION` and `toFailures` deleted; both warning builders call `toStockMatchFailureRows`; `requestOverride(failures: readonly StockMatchFailure[])` |
| `src/hooks/use-stock-assignment-gate.test.tsx` | Mock payloads carry the new fields; 2 tests added (6 in the file) |
| `src/api/stock-report-api.test.ts` | 2 tests added (8 in the file) |
| `src/fixtures/stock-report-fixtures.ts` | `stockMatchFailureElementsFixture` (wire) added; `stockMatchFailuresFixture` retyped to rows, now covering all four reasons |
| `src/stock-report.types.ts` | `titleCase` exported; new `formatStockPropertyValues`; `toStockReportPropertyTags` routed through it |
| `src/index.ts` | Exports `toStockMatchFailureRows`, `StockMatchFailureRow`, `STOCK_MATCH_NO_VALUE`, `titleCase`, `formatStockPropertyValues`; `StockMatchPropertyFailure` removed |

`StockMatchWarningSheetPage.tsx`, `surface-ids.ts` and `StockReportDetailSlidePage.tsx` needed no
edit — the type change flows through `StockMatchWarningSurfaceProps`.

## The row rules

| `reason` | Asked | Item |
|---|---|---|
| `value_not_accepted` | accepted values, `A / B` | item values, `A / B` |
| `missing_on_item` | accepted values | `—` |
| `no_group_for_value` | accepted values | `No known group: <value>` |
| `criterion_not_understood` | `Invalid criterion` | `—` |
| anything else | accepted values | item values |

Empty `accepted_values` under any reason but `criterion_not_understood` renders `—`, never
"accepts nothing". An empty `item_values` renders `—` under every reason.

## Decisions worth knowing

- **Label case.** The label is sentence case (`Wood group`), not the board tags' title case
  (`Wood Group`). PROMPT_03 §3.2 and all three acceptance examples spell it that way, and beside
  a plain `Teak` in the next column, `Wood Group` reads like a proper noun. The **values** use
  the board's title-casing, through the shared `formatStockPropertyValues` — so `Light / Dark`
  in the sheet is the same string as `Light / Dark` behind the board tag's colon, by
  construction. A test asserts that parity.
- **`no_group_for_value` is title-cased too** (`No known group: Teak`). PROMPT_03 §2 calls it
  "the raw value", but the backend sends normalised lowercase tokens for every reason, so a
  lone lowercase `teak` in a column of title-cased values would read as a rendering slip rather
  than as fidelity.
- **The em dash carries `aria-label="No value"`**, as §2 pins. Flagging honestly: an `aria-label`
  on a bare `<span>` with no role is not reliably announced by every screen reader. If that
  matters, the fix is a visually-hidden sibling instead — it was not done here because the spec
  named the attribute and a test asserts the accessible name.
- **The column header is not `aria-hidden`.** It reads as three words before the list, which is
  better than rows of unlabelled values; the grid is a `<div>`/`<ul>`, not a `<table>`, so there
  is no header/cell association to lean on.
- **`quantity` got no special handling**, per the handoff: it is a set-style equality criterion,
  so `["4"]` vs `["7"]` renders through the ordinary row. A test pins that.

## The amber banner (owner, same day, after seeing it run)

The warning's top row became a banner: light amber field, rounded border, darker amber ink.
`MATCH_WARNING_BANNER_CLASS` in `lib/stock-report-theme.ts` holds the trio — `#fff4d6` /
`#f0c36a` / `text-warning` (`#8a5a00`), which is `@beyo/ui`'s `StatePill` `warning` variant taken
whole rather than mixed fresh, at 5.4:1. The icon carries no colour of its own and inherits it.

`StockMatchStatusRow`'s `mismatch-accepted` state wears the same constant, so the line under the
item identity in the task form and the sheet that armed it match. `checking` stays neutral. The
**blocked** view is untouched — red, no banner — because only one of the two is overridable.

Files: `lib/stock-report-theme.ts`, `components/sheets/StockMatchWarningSheetContent.tsx`,
`components/sheets/StockMatchStatusRow.tsx`, plus `lib/stock-report-theme.test.ts` (new) and
assertions in both component tests. New testid: `stock-match-warning-banner`.

Note on how those tests are split, because the obvious version does not work: the two component
assertions derive their expected classes from the constant, so they pin *that the two agree* but
would pass just as happily if the banner turned grey. `stock-report-theme.test.ts` is what pins
the colour itself. Both halves were shown red — turning the constant neutral fails the theme
test; drifting the form row off it fails the component test.

## What breaks if the backend regresses

`accepted_values` and `item_values` are **required**, not nullish. The handoff says they are
always present; parsing them leniently would put an empty comparison in front of a user instead
of telling us the contract moved. A 409 body without them now yields `[]` failures (the sheet
does not open on an unparseable mismatch), and a preview body without them rejects at the
schema. A test pins each.

## Left unbuilt

Nothing the handoff pinned. Out of scope and untouched, as PROMPT_03 §6 says: the board search
row, `include_zero_requested` on `GET /items`, and `checks[]` / `refusal_reason` /
`can_proceed` / `override_required`.

## Verification

- `npx tsc -p packages/stock-report/tsconfig.json --noEmit` — clean for this work. One unrelated error appeared mid-session from another session's in-flight edit: `packages/tasks/src/types.ts` gained a required `is_stock_assignment` that `packages/tasks/src/actions/use-create-task.ts` does not set. Not touched here.
- `npm run test:stock-report` — **20 files, 154 tests, all passing**; 22 of them added or rewritten for this change (9 mapper, 5 sheet, 2 gate, 2 API, 2 status row, 2 theme).
- Planted defects, each shown red then reverted:

  | Defect | Result |
  |---|---|
  | `asked`/`item` swapped in the mapper | 11 tests red across the mapper, gate and component |
  | `no_group_for_value` branch dropped | 2 red — the reason's own test and the fixture-parity test |
  | 409 parsed by a second, older `{key, reason}` schema | 2 red — the shared-element test and the strictness test |

## Acceptance (PROMPT_03 §5)

1. `upholstery`, accepted `foam`/`synthetic`, item `down` → **Upholstery · Foam / Synthetic ·
   Down**, and nothing for criteria that matched. Pinned in the gate test.
2. `wood_group: ["light"]` vs item `teak` → **Wood group · Light · Teak**. Note this departs
   from PROMPT_03's "Light teak": the shipped handoff states the groups are `dark`, `teak`,
   `light` and that `light teak` was only illustrative. The handoff wins, per §0.
3. `missing_on_item` → `—`; `criterion_not_understood` → *Invalid criterion* / `—`;
   `no_group_for_value` → *No known group: Teak*. All pinned.
4. Preview and 409 produce identical rows for the same triple. Pinned in the gate test.
5. *Change item* and *Continue* unchanged — the existing gate tests are green, edited only for
   the element shape in their mock payloads.
6. Suites green; three planted defects each turned tests red.

No commit made.
