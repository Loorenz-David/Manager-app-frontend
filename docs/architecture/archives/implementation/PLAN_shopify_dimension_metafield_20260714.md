# PLAN_shopify_dimension_metafield_20260714

## Metadata

- Plan ID: `PLAN_shopify_dimension_metafield_20260714`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-14T00:00:00Z`
- Last updated at (UTC): `2026-07-14T11:28:00Z`
- Related issue/ticket: `<none provided>`
- Intention plan: `docs/architecture/under_construction/intention/modification_to_dimensions.md`

## Goal and intent

- Goal: Support the Shopify `dimension` metafield type end-to-end in the metafield picker — render it with the shared `NumberInput` primitive (step 50, "(cm)" label suffix) — and change the product-sync submission so **every** metafield sent to the backend carries its `type` alongside its `value` (`{ key: { type, value } }`), instead of today's flat `{ key: value }`.
- Business/user intent: Shopify `dimension` metafields (e.g. `widthcm`, `heightcm`) require a numeric value plus a unit (`{"value": 120, "unit": "CENTIMETERS"}`) — the generic text/choice/url inputs cannot produce this shape. Sellers need a proper number stepper instead of typing raw JSON.
- Non-goals:
  - No backend changes. The normalizer (`backend/.../domain/shopify/product_sync_payloads.py::build_normalized_product_sync_payload`) already accepts a `{"type", "value"}` wrapper per metafield key, defaults untyped/flat entries to `single_line_text_field`, and JSON-serializes non-string values before calling Shopify's `metafieldsSet` — verified by source read 2026-07-14. This plan only changes what the frontend sends.
  - No unit picker UI — unit is always hardcoded to `"CENTIMETERS"`.
  - No new metafield types beyond `dimension`. `single_line_text_field` (text/choice) and `url` behavior are unchanged except for the wrapper added at submit time.
  - No changes to the metafield preference save/search/edit-mode flow (`use-shopify-metafield-picker.controller.ts`, add/remove/reorder) — a `dimension` field is just another active field in that system.

## Scope

- In scope:
  - `packages/shopify/src/types.ts` — add `"dimension"` to `ShopifyProductSyncMetafieldValueSchema.type`; change `ShopifyProductSyncMetafieldsSchema` (the wire payload) from a flat scalar record to a `{ type, value }`-per-key record.
  - `packages/shopify/src/lib/resolve-shopify-metafield-input.ts` — add a `"dimension"` resolver kind.
  - `packages/shopify/src/lib/shopify-metafield-value.ts` — dimension-aware `isMetafieldValueFilled` / `toShopifyMetafieldFormValue`; new shared helper to build the wire `{ type, value }` shape per metafield type (reused by submit resolution).
  - `packages/shopify/src/components/metafields/inputs/ShopifyMetafieldDimensionInput.tsx` (new) — wraps `@beyo/ui` `NumberInput`.
  - `packages/shopify/src/components/metafields/ShopifyMetafieldInputResolver.tsx` — render the new input for `"dimension"`; render the "(cm)" suffix in `FieldLabelRow`'s right-side slot.
  - `packages/shopify/src/lib/resolve-shopify-product-sync-submit.ts` — build the wrapped wire payload per key instead of a flat scalar.
  - Matching test files: `resolve-shopify-metafield-input.test.ts`, `resolve-shopify-product-sync-submit.test.ts`, plus a new `shopify-metafield-value.test.ts` if the dimension logic added there isn't already covered elsewhere.
- Out of scope:
  - `use-shopify-metafield-picker.controller.ts` query/search/preference-persistence logic — untouched.
  - `ShopifyMetafieldPickerForm.tsx`, `ShopifyMetafieldFields.tsx`, `ShopifyMetafieldSortableFields.tsx` — untouched (they operate on `ShopifyMetafieldField`/value generically, independent of type).
  - `packages/ui/src/components/primitives/number-input/*` — consumed as-is, no primitive changes.
  - Backend.
- Assumptions:
  - Dimension values are whole centimeters: `NumberInput` used with `step={50}`, `allowDecimal={false}`, `min={0}`, no `max`. (Not specified by the user; a negative or fractional dimension has no physical meaning, and nothing in the intention note asks for decimals — flagged in Risks, not blocking.)
  - The "(cm)" label suffix goes in `FieldLabelRow`'s existing right-side `children` slot next to `field.name` (the row is already `justify-between` and this slot is otherwise unused by `ShopifyMetafieldInputResolver`), not inside the input itself via `NumberInput`'s own `unitLabel` prop — the intention text says "the label of this field should render on the side '(cm)'", which reads as the field-name label, not an in-input unit tag.
  - The internal per-field value channel (`ShopifyProductSyncMetafieldValue.value: string`, `draftValues: Record<string, string>`) stays a string for `dimension` too (the raw numeric draft, e.g. `"120"`) — only the final wire-serialization step (`resolveShopifyProductSyncSubmit`) parses it to `Number` and wraps it as `{ value, unit: "CENTIMETERS" }`. This avoids widening the shared value-plumbing type just for one metafield kind.

## Clarifications required

None blocking. The two open design calls above (step/min defaults, label-slot placement) are resolved with the stated defaults, consistent with existing primitives and layout; low risk to adjust later if wrong.

## Acceptance criteria

1. `resolveMetafieldInputKind({ type: "dimension", validations: [] })` returns `"dimension"` (currently returns `"unsupported"` — see existing assertion in `resolve-shopify-metafield-input.test.ts:22-24`).
2. `ShopifyMetafieldInputResolver` renders a `NumberInput`-backed field for a `dimension` definition, with `step={50}`, and the field's `FieldLabelRow` shows `field.name` on the left and a `(cm)` suffix on the right — matching the existing `justify-between` row layout used by `optional`/drag-handle content.
3. A `dimension` field is considered filled only when its draft parses to a finite number; non-numeric/empty drafts are not filled and are excluded from `isFormFilled` / the submit payload, matching how `url` already requires `isValidShopifyMetafieldUrl`.
4. `resolveShopifyProductSyncSubmit` emits, for every included metafield key, `{ type, value }` instead of a bare scalar:
   - `single_line_text_field` / `url` entries: `{ type: "single_line_text_field" | "url", value: "<trimmed string>" }`.
   - `dimension` entries: `{ type: "dimension", value: { value: <number>, unit: "CENTIMETERS" } }`.
5. `ProcessShopifyProductsRequestSchema.parse(...)` (called synchronously inside `processShopifyProducts`) accepts the new wrapped shape without throwing — i.e. `ShopifyProductSyncMetafieldsSchema` is updated to match, not just the TypeScript type.
6. `resolve-shopify-product-sync-submit.test.ts`'s existing `"scopes metafields into one request item per shop"` case is updated to expect the wrapped shape (`{ material: { type: "single_line_text_field", value: "Wool" } }`, etc.), and a new case covers a `dimension` entry producing `{ widthcm: { type: "dimension", value: { value: 120, unit: "CENTIMETERS" } } }`.
7. `npm run typecheck` (workspace) passes with zero errors in `@beyo/shopify`.

## Contracts and skills

### Contracts loaded

- `architecture/02_types.md`: Zod schema conventions for the changed `ShopifyProductSyncMetafieldsSchema` / new `type` enum member.
- `architecture/07_components.md`: presentational component conventions for the new `ShopifyMetafieldDimensionInput` (props shape, `data-testid`, no network/query access — mirrors `ShopifyMetafieldTextInput`/`ShopifyMetafieldUrlInput`).
- `architecture/09_forms.md`: form-field/label conventions for the "(cm)" suffix placement.
- `architecture/17_testing.md`: Vitest unit-test conventions already used by `resolve-shopify-metafield-input.test.ts` / `resolve-shopify-product-sync-submit.test.ts`.
- `architecture/34_runtime_validation.md` + `_local.md`: the outgoing-request `.parse()` call in `process-shopify-products.ts` is a real runtime boundary, not just a compile-time type — the wire-schema change is mandatory, not cosmetic.
- `architecture/35_shared_packages.md`: file placement inside `@beyo/shopify` (`components/metafields/inputs/`, `lib/`), reuse of `@beyo/ui`'s `NumberInput` rather than a new primitive.

### Local extensions loaded

- None beyond the above; no project-local deltas affect this change.

### File read intent — pattern vs. relational

All implementation-file reads for this plan were relational (understanding what exists), per the guide:
- `ShopifyMetafieldInputResolver.tsx`, `ShopifyMetafieldTextInput.tsx`, `ShopifyMetafieldUrlInput.tsx`, `ShopifyMetafieldChoiceInput.tsx`, `ShopifyMetafieldUnsupportedField.tsx` — current resolver/input pattern and prop shapes to match for the new dimension input.
- `resolve-shopify-metafield-input.ts`, `shopify-metafield-value.ts`, `resolve-shopify-product-sync-submit.ts` — exact current kind/fill/submit logic being extended.
- `types.ts` — exact Zod field names and current `ShopifyProductSyncMetafieldsSchema`/`ShopifyProductSyncMetafieldValueSchema` shapes.
- `packages/ui/src/components/primitives/number-input/{NumberInput.tsx,types.ts,index.ts}` — exact `NumberInputProps` (confirmed `step`, `unitLabel`, `onValueChange(number|null, meta)`, no built-in validation beyond min/max/step) to wrap correctly rather than guessing its API.
- `packages/ui/src/components/primitives/form-field-container/FieldLabelRow.tsx` — confirmed the `children` prop is an existing, currently-unused-by-this-resolver right-side slot, rather than inventing a new label layout.
- `resolve-shopify-product-sync-submit.test.ts`, `resolve-shopify-metafield-input.test.ts` — exact current test expectations that must be updated (e.g. the `"dimension"` → `"unsupported"` assertion, the flat-scalar `metafields: { material: "Wool" }` assertion).
- Backend: `process_shopify_products_request.py`, `product_sync_payloads.py`, `product_sync_client.py` — confirmed (via a research subagent, source-cited) that the backend already tolerates and correctly forwards the `{type, value}` wrapper to Shopify's `metafieldsSet`, and does no `dimension`/`MEASUREMENT`-specific handling of its own (nothing to add there).
- `docs/architecture/under_construction/intention/restructuring_metafields_form.md` (archived parent feature) and its `implementation/PLAN_metafield_picker_edit_mode_20260714.md` — confirmed this plan builds on top of an already-implemented generic metafield-picker system, not the old hardcoded `heightCm`/`widthCm`/`depthCm` fields (already removed from the working tree).

### Skill selection

- Primary skill: none required for planning. During implementation, use `verify` to drive adding a dimension-type metafield and confirm the stepper/label/submission before considering the change complete.
- Trigger terms: `metafield`, `dimension`, `number input`, `wire payload`.
- Excluded alternatives: `dataviz`/`artifact-design` — no chart or artifact deliverable.

## Implementation plan

1. **`packages/shopify/src/types.ts`**
   - Add `"dimension"` to `ShopifyProductSyncMetafieldValueSchema.type`'s enum: `z.enum(["single_line_text_field", "url", "dimension"])`.
   - Add `ShopifyDimensionMetafieldWireValueSchema = z.object({ value: z.number(), unit: z.literal("CENTIMETERS") })`.
   - Replace `ShopifyProductSyncMetafieldsSchema` (currently `z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))`) with a per-key wrapper:
     ```ts
     const ShopifyProductSyncMetafieldWireValueSchema = z.object({
       type: z.string(),
       value: z.union([
         z.string(),
         z.number(),
         z.boolean(),
         z.null(),
         ShopifyDimensionMetafieldWireValueSchema,
       ]),
     });
     export const ShopifyProductSyncMetafieldsSchema = z.record(
       z.string(),
       ShopifyProductSyncMetafieldWireValueSchema,
     );
     ```
   - This is the schema `ProcessShopifyProductItemRequestSchema.metafields` uses, and it is `.parse()`-d at runtime in `api/process-shopify-products.ts` — the change must land here, not just as a TS-only type edit.

2. **`packages/shopify/src/lib/resolve-shopify-metafield-input.ts`**
   - Add: `export type ShopifyMetafieldInputKind = "choice" | "text" | "url" | "dimension" | "unsupported";`
   - Add a branch: `if (definition.type === "dimension") return "dimension";` (placed alongside the existing `url` check, before the `single_line_text_field` fallback-to-unsupported branch).

3. **`packages/shopify/src/lib/shopify-metafield-value.ts`**
   - `isMetafieldValueFilled`: add a `dimension` branch — filled only when `Number.isFinite(Number(trimmed))` (mirrors the existing `url` branch's extra validity check beyond non-empty).
   - `toShopifyMetafieldFormValue`: extend the allowed-type guard to include `"dimension"` (currently rejects anything other than `single_line_text_field`/`url`).
   - Add a new exported helper used by the submit resolver:
     ```ts
     export function toShopifyMetafieldWireValue(
       entry: Pick<ShopifyProductSyncMetafieldValue, "type" | "value">,
     ): { type: string; value: string | { value: number; unit: "CENTIMETERS" } } {
       if (entry.type === "dimension") {
         return {
           type: entry.type,
           value: { value: Number(entry.value.trim()), unit: "CENTIMETERS" },
         };
       }
       return { type: entry.type, value: entry.value.trim() };
     }
     ```
   - Keep `isValidShopifyMetafieldUrl` unchanged.

4. **`packages/shopify/src/components/metafields/inputs/ShopifyMetafieldDimensionInput.tsx`** (new)
   - Mirrors `ShopifyMetafieldTextInput.tsx`'s prop shape (`id`, `value: string`, `onChange: (value: string) => void`, `disabled?`), converting to/from `NumberInput`'s `number | null`:
     ```tsx
     import { NumberInput } from "@beyo/ui";

     export function ShopifyMetafieldDimensionInput({
       id,
       value,
       onChange,
       disabled,
     }: {
       id: string;
       value: string;
       onChange: (value: string) => void;
       disabled?: boolean;
     }): React.JSX.Element {
       const numericValue = value.trim() === "" ? null : Number(value);
       return (
         <NumberInput
           id={id}
           value={Number.isFinite(numericValue) ? numericValue : null}
           step={50}
           min={0}
           allowDecimal={false}
           onValueChange={(next) => onChange(next === null ? "" : String(next))}
           disabled={disabled}
           inputTestId="shopify-metafield-dimension-input"
         />
       );
     }
     ```

5. **`packages/shopify/src/components/metafields/ShopifyMetafieldInputResolver.tsx`**
   - Import `ShopifyMetafieldDimensionInput`.
   - Add a `kind === "dimension"` branch rendering it (same position as the other `kind` branches, before the `ShopifyMetafieldUnsupportedField` fallback).
   - Pass a `(cm)` suffix into `FieldLabelRow`'s `children` when `kind === "dimension"`:
     ```tsx
     <FieldLabelRow
       label={field.name}
       htmlFor={kind === "unsupported" ? undefined : inputId}
     >
       {kind === "dimension" ? (
         <span className="text-xs text-muted-foreground">(cm)</span>
       ) : null}
     </FieldLabelRow>
     ```

6. **`packages/shopify/src/lib/resolve-shopify-product-sync-submit.ts`**
   - Replace the flat `.map((entry) => [entry.key, entry.value.trim()])` construction with `.map((entry) => [entry.key, toShopifyMetafieldWireValue(entry)])`, importing `toShopifyMetafieldWireValue` from `./shopify-metafield-value`.
   - Extend the shared filter predicate (currently `entry.value.trim() && (entry.type !== "url" || isValidShopifyMetafieldUrl(entry.value.trim()))`, duplicated in both `isFormFilled` and `resolveShopifyProductSyncSubmit`) to also reject a `dimension` entry whose trimmed value isn't a finite number — factor this predicate into one shared exported function (e.g. `isSubmittableMetafieldEntry`) in `shopify-metafield-value.ts` and call it from both places, removing the duplication rather than pasting the new `dimension` branch twice.

7. **Tests**
   - `resolve-shopify-metafield-input.test.ts`: change the existing `dimension` assertion from `"unsupported"` to `"dimension"`.
   - `resolve-shopify-product-sync-submit.test.ts`: update the `"scopes metafields into one request item per shop"` case's expected `metafields` to the wrapped shape (`{ material: { type: "single_line_text_field", value: "Wool" } }`, `{ manual: { type: "url", value: "https://example.com/manual" } }`), and add a new case with a `dimension` entry asserting `{ widthcm: { type: "dimension", value: { value: 120, unit: "CENTIMETERS" } } }`. Also add/extend a case proving a non-numeric dimension draft is excluded from both `isFormFilled` and the submit payload.
   - Add unit coverage for `isMetafieldValueFilled`/`toShopifyMetafieldWireValue` in `shopify-metafield-value.ts` (new `shopify-metafield-value.test.ts` if one doesn't already exist for this file — confirm before creating, since none was found in the current directory listing).
   - No new component-render test file for `ShopifyMetafieldDimensionInput` or the resolver — consistent with this package's existing density (`ShopifyMetafieldTextInput`/`ShopifyMetafieldUrlInput`/`ShopifyMetafieldChoiceInput` have no dedicated `.test.tsx` either); covered by the lib-level tests above plus manual `verify`.

8. **Manual verification**
   - Run the app, open the Shopify product-sync form's metafields step, search/select (or use a saved preference for) a `dimension`-type definition, confirm: the stepper increments/decrements by 50, the label row shows `(cm)` on the right, and — via network inspection or a temporary log — the submitted request body contains `{ type: "dimension", value: { value: <n>, unit: "CENTIMETERS" } }` for that key, and `{ type: "single_line_text_field"|"url", value: "<string>" }` for the others.

## Risks and mitigations

- Risk: `ShopifyProductSyncMetafieldsSchema` is a real runtime parse boundary (`ProcessShopifyProductsRequestSchema.parse(input)` in `api/process-shopify-products.ts`); if the schema update misses any shape the resolver can actually produce, every product-sync submission with metafields throws at runtime, not just a type error.
  Mitigation: Cover all three wire shapes (`single_line_text_field`/`url` string, `dimension` object) in the updated test, and manually verify one real submission before considering this done.
- Risk: The submit-time filter predicate (filled/valid check) currently exists in two places (`isFormFilled` and inside `resolveShopifyProductSyncSubmit`'s `.filter(...)`) with duplicated URL-validity logic; adding a third (`dimension`) branch to both by hand risks the two copies drifting.
  Mitigation: Factor the predicate into one shared exported function in `shopify-metafield-value.ts` (step 6) and call it from both sites instead of duplicating the new branch.
- Risk: Hardcoded `step=50`/`min=0`/`allowDecimal=false` assumptions (not explicitly specified by the user beyond "steps of 50") could be wrong for some shops' dimension conventions.
  Mitigation: These are the only defaults consistent with "steps of 50" and a physical, non-negative dimension; easy to adjust in one place (`ShopifyMetafieldDimensionInput.tsx`) if corrected later.
- Risk: Placing `(cm)` in `FieldLabelRow`'s `children` slot is a judgment call on an ambiguous instruction ("the label of this field should render on the side").
  Mitigation: This slot is the row's only existing right-side content area and is unused by the resolver today; low-cost to move into `NumberInput`'s own `unitLabel` instead if the reviewer prefers it inside the input.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `@beyo/shopify`.
- `npm run test -- --grep metafield`: `resolve-shopify-metafield-input`, `resolve-shopify-product-sync-submit`, and the new `shopify-metafield-value` tests pass, including the updated wrapped-payload and dimension-specific assertions.
- Manual `verify` pass: add a `dimension` metafield in the product-sync form, confirm the stepper/label UI and the exact submitted wire shape per acceptance criterion 4.

## Review log

- `2026-07-14` `Claude`: Initial draft. Backend contract verified sufficient via source read (no backend changes needed); existing test files identified with their exact current (soon-to-be-wrong) assertions.
- `2026-07-14` `Codex`: Implemented dimension input rendering, finite-number validation, centimeter wire serialization, and typed wrappers for all submitted metafields. `npm run typecheck` passed; all 31 Shopify Vitest files passed (82 tests). Manual authenticated Shopify/Playwright verification was not run.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_shopify_dimension_metafield_20260714.md`
- Archive record: `docs/architecture/archives/ARCHIVE_shopify_dimension_metafield_20260714_1128.md`
