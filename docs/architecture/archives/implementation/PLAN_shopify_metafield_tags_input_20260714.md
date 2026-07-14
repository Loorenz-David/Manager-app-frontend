# PLAN_shopify_metafield_tags_input_20260714

## Metadata

- Plan ID: `PLAN_shopify_metafield_tags_input_20260714`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-14T00:00:00Z`
- Last updated at (UTC): `2026-07-14T13:01:36Z`
- Related issue/ticket: none provided
- Intention plan: none — direct implementation request from user, 2026-07-14 (no intention document exists for this feature)

## Goal and intent

- Goal: Add a new `@beyo/ui` input primitive, `TagSelectInput`, that follows `SearchableSelectInput`'s "option list mode" (search-narrows-list, `FloatingKeyboardBar variant="panel"` on mobile, `AnchoredOptionList` on desktop) but commits **multiple** values as removable tag pills instead of a single value. Wire it into `ShopifyMetafieldInputResolver` so every Shopify metafield whose `type` starts with `"list."` renders this new tags input instead of falling into the current `"unsupported"` bucket.
- Business/user intent: Shopify metafield definitions of type `list.*` (list of text, list of URLs, list of predefined choices, etc.) currently render as "unsupported" in the product-sync metafield form, so sellers/workers cannot fill them in at all. This plan makes every `list.*` metafield fillable with a modern tag-entry UX: type to search/filter, tap an option to add it as a pill, backspace from an empty input to remove the last pill, or tap a pill's `x` to remove it directly.
- Non-goals:
  - No backend changes. The frontend keeps metafield values as a JSON array string internally, then sends `list.*` values as a normal `string[]` in the wire payload so the backend owns JSON encoding.
  - No per-subtype validation of individual tags (e.g. validating each tag as a URL for `list.url`, or as a number for `list.number_integer`). Per the user's instruction, **all** `list.*` types share one component and one non-empty-array validation rule. Per-subtype tag validation is explicitly out of scope (see Clarifications).
  - No changes to `ShopifyMetafieldChoiceInput`, `ShopifyMetafieldTextInput`, `ShopifyMetafieldUrlInput`, or `ShopifyMetafieldDimensionInput` — those keep handling their existing (non-list) types unchanged.
  - No new app route or surface wiring — `ShopifyMetafieldInputResolver` is already mounted wherever `ShopifyMetafieldFields` renders (`ShopifyMetafieldPickerForm`, `ShopifyProductSyncSlidePage`); this plan only changes what that resolver renders for one more `kind`.

## Scope

- In scope:
  - New primitive: `packages/ui/src/components/primitives/input/TagSelectInput.tsx` (+ `TagSelectInput.test.tsx`), exported from `packages/ui/src/components/primitives/input/index.ts`.
  - `packages/shopify/src/lib/resolve-shopify-metafield-input.ts` (+ test): new `"tags"` kind, matched by `type.startsWith("list.")`.
  - New lib: `packages/shopify/src/lib/shopify-metafield-tags-value.ts` (+ test): JSON array `string` ⇄ `string[]` encode/decode helpers.
  - New component: `packages/shopify/src/components/metafields/inputs/ShopifyMetafieldTagsInput.tsx`, parallel to `ShopifyMetafieldChoiceInput.tsx`.
  - `packages/shopify/src/components/metafields/ShopifyMetafieldInputResolver.tsx`: render the new input for `kind === "tags"`.
  - `packages/shopify/src/lib/shopify-metafield-value.ts` (+ test): extend `isMetafieldValueFilled`, `toShopifyMetafieldFormValue`, `isSubmittableMetafieldEntry` to handle `list.*` types.
  - `packages/shopify/src/types.ts`: loosen `ShopifyProductSyncMetafieldValueSchema.type` from a closed 3-value enum to `z.string()` (Shopify has many `list.*` subtypes; the definition schema already uses `z.string()` for `type`, so this makes the two schemas consistent).
- Out of scope: everything under "Non-goals" above; any change to `ShopifyMetafieldPickerForm`, `ShopifyProductSyncFormProvider`, or the item-category preference save/search flow beyond the value-shape changes listed above.
- Assumptions:
- Shopify list values are stored internally as a JSON array string (e.g. `'["red","blue"]'`) for the existing form contract, then parsed into `string[]` at the wire boundary. The backend receives the normal list and owns any JSON string encoding required for Shopify.
  - `field.validations`' `"choices"` entry (parsed by `parseMetafieldChoices`) applies to `list.*` types the same way it does to `single_line_text_field` today: if present, the field is choice-constrained (`forceSelection = true`, tags may only come from the option list); if absent, the field is freeform (`forceSelection = false`, typed text commits as a tag on Enter/blur).

## Clarifications required

- [x] Losing focus with unsubmitted typed text auto-commits the trimmed text when `forceSelection` is `false` and discards it otherwise, matching `SearchableSelectInput`'s existing behavior.
- [x] All `list.*` subtypes use the same generic free-text/choice tag input with no per-item type validation, per the user's instruction.

## Acceptance criteria

1. A Shopify metafield field whose `type` starts with `"list."` renders `TagSelectInput` (via `ShopifyMetafieldTagsInput`) instead of the "unsupported" placeholder.
2. Typing in the input filters `options` (built from `parseMetafieldChoices(field.validations)`) the same way `SearchableSelectInput` filters — case-insensitive substring match on `displayValue` — and excludes options already added as tags.
3. Tapping a filtered option adds it as a tag pill, clears the search text, and keeps focus in the input (cursor visually lands after the new pill because the pill is rendered before the input in DOM order, not via manual cursor positioning).
4. Pressing Backspace while the search text is empty removes the most recently added tag.
5. Tapping a tag's `x` icon removes that specific tag regardless of its position, without blurring the input.
6. When `field.validations` has no `"choices"` entry, typing free text and pressing Enter commits it as a tag (`forceSelection` is `false`); when `"choices"` is present, only listed options can become tags (`forceSelection` is `true`) — mirroring `ShopifyMetafieldChoiceInput`'s existing `forceSelection` usage.
7. On mobile, the option list opens via `FloatingKeyboardBar variant="panel"` exactly as `SearchableSelectInput` does; on desktop, it opens via `AnchoredOptionList` beneath the input.
8. The committed tag set round-trips through `ShopifyMetafieldTagsInput`'s `value: string` as a JSON array string, and `isMetafieldValueFilled` / `isSubmittableMetafieldEntry` correctly treat `"[]"` and `""` as not-filled.
9. `npm run test:ui` and `npm run test:shopify` pass with new tests covering the above.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: named-export, no-nested-definition, `cva` variant, forwarded-ref rules for the new shared UI primitive and its file-private `TagPill` helper.
- `architecture/37_keyboard_aware_inputs.md`: `TagSelectInput` is a second consumer of `FloatingKeyboardBar variant="panel"` (`SearchableSelectInput` is the documented canonical consumer) — governs the `renderControls` contract, `isFloating`/`panelProgress`/`isInlineHidden`/`isPanelOpening` semantics, and the "never hand-roll the floating/inline duplication" rule.
- `architecture/17_testing.md`: Vitest/RTL query priority and `data-testid` conventions for the new primitive's and wrapper's tests.
- `architecture/02_types.md`: Zod schema conventions applied to loosening `ShopifyProductSyncMetafieldValueSchema.type`.

### Local extensions loaded

- None of the canonical contracts above have a `*_local.md` companion relevant to this change (checked: `07`, `37`, `17`, `02` have no local companions in `architecture/`).

### File read intent — pattern vs. relational

Already applied during research for this plan:

- **Relational reads** (what exists, not how to write): `SearchableSelectInput.tsx`, `option-list.types.ts`, `OptionList.tsx`, `AnchoredOptionList.tsx`, `TextInput.tsx`, `SearchableSelectInput.test.tsx`, `FloatingKeyboardBar` directory listing, `ShopifyMetafieldInputResolver.tsx`, `ShopifyMetafieldChoiceInput.tsx`, `ShopifyMetafieldTextInput.tsx`, `resolve-shopify-metafield-input.ts` (+ test), `parse-metafield-choices.ts`, `shopify-metafield-value.ts`, `ShopifyMetafieldField.tsx`, `ShopifyMetafieldFields.tsx`, `normalize-shopify-metafield-fields.ts`, `packages/shopify/src/types.ts`, `packages/ui/src/components/primitives/shared/primitive-base.ts`, and the live wiring in `apps/workers-app/.../use-task-step-detail.controller.ts` / `task_steps/surfaces.ts`. These establish exact prop shapes, the existing `value: string` contract, the `forceSelection`/`kind` pattern, and where the resolver is actually reachable at runtime.
- No implementation file outside this scope needs to be read to learn "how to write" — the option-list-mode pattern is fully specified by `SearchableSelectInput.tsx` itself (the explicit source pattern named in the user's request) plus `37_keyboard_aware_inputs.md`.

### Skill selection

- Primary skill: none — this is a component/lib implementation task, not a skill-triggered flow (no forms/surfaces/realtime skill applies beyond the contracts already loaded).
- Trigger terms: `FloatingKeyboardBar`, `keyboard aware`, `option list` → resolved to `37_keyboard_aware_inputs.md` per the trigger expansion map.
- Excluded alternatives: `09_forms.md` — excluded because `TagSelectInput` is a shared UI primitive (props-only, no context, no schema/`useForm` involvement) and the Shopify wiring reuses the existing `value: string` / `onChange` prop contract already established by `ShopifyMetafieldField`, with no new form schema. `24_dto.md` — excluded, no server response is being transformed into a view model here; the value stays a raw string end-to-end. `28_surfaces.md` — excluded, the new input is inline, not a modal/sheet/slide surface.

## Implementation plan

### Part A — `@beyo/ui`: `TagSelectInput` primitive

1. In `packages/ui/src/components/primitives/input/TagSelectInput.tsx`, reuse `SearchableSelectResult<TValue>` / `SearchableSelectOption<TValue>` from `../option-list` unchanged — one tag is one `SearchableSelectResult<TValue>` (`{ type: 'option', option }` or `{ type: 'text', text }`). Define:
   ```ts
   export type TagSelectInputProps<TValue extends string = string> = {
     options: readonly SearchableSelectOption<TValue>[];
     value: readonly SearchableSelectResult<TValue>[];
     onValueChange: (value: SearchableSelectResult<TValue>[]) => void;
     forceSelection?: boolean;
     emptyMessage?: string;
     maxVisibleOptions?: number;
     placeholder?: string;
     disabled?: boolean;
     id?: string;
     "data-testid"?: string;
   };
   ```
   Keep the prop names (`options`, `value`, `onValueChange`, `forceSelection`, `emptyMessage`, `maxVisibleOptions`) identical in spirit to `SearchableSelectInputProps` so the two primitives read as one family — only the `value`/`onValueChange` types are pluralized.
2. Build the input's own bordered wrapper (not `TextInput`, which assumes a single fixed-height input): a `flex flex-wrap items-center gap-1.5 min-h-12 rounded-lg border border-border bg-transparent px-2 py-1.5` container, importing `FOCUS_WITHIN_RING`, `DISABLED_BASE`, `INVALID_RING` from `../shared` (same tokens `TextInput` uses) so visual chrome matches other inputs without touching `TextInput.tsx`.
3. Inside the wrapper, render one pill per `value` entry (private, non-exported `TagPill` component per `07_components.md`'s "small file-private helper" rule) followed by a bare `<input>` (not wrapped in `TextInput`) carrying the live search text, then the raw `<input>` element itself as the last flex child — tag order plus DOM order alone produces the "cursor after the last tag" effect; no manual caret/position logic is needed.
   - `TagPill` renders `option.displayValue` or `text`, plus a trailing `button type="button"` with `X` (`lucide-react`) icon, `aria-label={\`Remove ${label}\`}`, `onMouseDown={(e) => e.preventDefault()}` (keep focus in the text input), `onClick` removing that tag by index.
4. Port `SearchableSelectInput`'s dual inline/floating architecture as-is: a private `TagSelectControls` component (parallel to `SearchableSelectControls`) receiving the same `renderControls` fields (`inputRef`, `isFloating`, `panelProgress`, `isInlineHidden`, `isPanelOpening`) from `FloatingKeyboardBar variant="panel"`, rendering the pills+input host inline and `OptionList`/`AnchoredOptionList` for suggestions exactly like `SearchableSelectInput` does (`isFloating` → `OptionList` inside the panel; otherwise → `AnchoredOptionList` when `isOpen`).
5. State and behavior in `TagSelectInput` (top-level component, mirroring `SearchableSelectInput`'s internal state shape):
   - `queryText` (search string), `activeValue` (keyboard-highlighted option), `isOpen`.
   - `filteredOptions` = `options` filtered by case-insensitive `displayValue` substring match on `queryText`, **and** excluding any option whose `value` already appears in `value` as an option-tag, **and** excluding any option whose `displayValue` case-insensitively equals an existing text-tag's `text` (prevents adding the same thing twice via two different paths).
   - `commitOption(option)`: append `{ type: 'option', option }` to `value` (skip if a duplicate per the dedupe rule above), clear `queryText`, call `onValueChange`, keep focus (do not blur/close the way single-select does after commit — the input must stay usable for the next tag).
   - `commitFreeformTag(text)`: only when `!forceSelection`; trim, no-op on empty; dedupe case-insensitively against existing text-tags and against option-tags' `displayValue`; append `{ type: 'text', text }`; clear `queryText`; call `onValueChange`.
   - `removeTagAt(index)`: splice `value`, call `onValueChange`; does not touch `queryText`.
   - `onKeyDown`: `ArrowDown`/`ArrowUp`/`Home`/`End` move `activeValue` over `filteredOptions` (port `moveActive` from `SearchableSelectInput` unchanged in shape); `Enter` commits the active option if one is highlighted, else `commitFreeformTag(queryText)`; `Backspace` with `queryText === ''` and `value.length > 0` calls `removeTagAt(value.length - 1)`; `Escape` clears `queryText` and closes the list; `Tab` closes the list (blur handler covers any pending-text commit).
   - `onBlur`: per the Clarifications answer, if `!forceSelection` and `queryText.trim()` is non-empty, `commitFreeformTag(queryText)`; otherwise clear `queryText` without committing. Use the same `queueMicrotask` + "is focus still inside one of our own inputs" guard `SearchableSelectInput` uses (`isKnownInput`) so tapping an option (which blurs then refocuses) does not spuriously discard the in-progress search text.
6. Accessibility: `role="combobox"` on the visible text `<input>`, `aria-expanded`, `aria-controls` (listbox id), `aria-activedescendant` — same wiring as `SearchableSelectInput`. Additionally set `aria-multiselectable="true"` is not a valid combobox attribute; instead expose the tag count via a visually-hidden live region only if accessibility testing later flags it as needed — do not add speculative ARIA beyond what `SearchableSelectInput` already establishes as the pattern.
7. Export from `packages/ui/src/components/primitives/input/index.ts`:
   ```ts
   export { TagSelectInput } from './TagSelectInput';
   export type { TagSelectInputProps } from './TagSelectInput';
   ```
   `packages/ui/src/index.ts` already does `export * from './components/primitives/input'` — no further export change needed.
8. `data-testid` placement (per `17_testing.md` / `34_runtime_validation_local.md` conventions): the outer wrapper gets the caller-supplied `data-testid`; each `TagPill`'s remove button gets `data-testid={\`${testId}-remove-${index}\`}` when a `data-testid` prop is supplied, so Shopify's wrapper (`shopify-metafield-tags-input`) produces stable per-tag selectors.

### Part B — `@beyo/ui`: tests

9. `TagSelectInput.test.tsx`, mirroring `SearchableSelectInput.test.tsx`'s setup (mock `useKeyboardInset` from `../../../providers/KeyboardInsetProvider`, `fireEvent`/`screen` from RTL). Cover: filtering + tap-to-add; dedupe of an already-added option from the suggestion list; Backspace-on-empty removes the last tag; clicking a pill's `x` removes that exact tag (not just the last one); Enter commits a freeform tag when `forceSelection` is `false`; Enter does **not** commit freeform text when `forceSelection` is `true`; arrow-key navigation + Enter selects the highlighted option.

### Part C — `@beyo/shopify`: kind resolution and value helpers

10. `resolve-shopify-metafield-input.ts`: add `"tags"` to `ShopifyMetafieldInputKind`. Add the `type.startsWith("list.")` check **first** in `resolveMetafieldInputKind` (before the `url`/`dimension`/`single_line_text_field` checks), since `list.url` and `list.dimension` must resolve to `"tags"`, not `"url"`/`"dimension"`:
    ```ts
    export type ShopifyMetafieldInputKind =
      | "choice" | "text" | "url" | "dimension" | "tags" | "unsupported";

    export function resolveMetafieldInputKind(
      definition: Pick<ShopifyMetafieldField, "type" | "validations">,
    ): ShopifyMetafieldInputKind {
      if (definition.type.startsWith("list.")) return "tags";
      if (definition.type === "url") return "url";
      if (definition.type === "dimension") return "dimension";
      if (definition.type !== "single_line_text_field") return "unsupported";
      return parseMetafieldChoices(definition.validations).length ? "choice" : "text";
    }
    ```
11. New `packages/shopify/src/lib/shopify-metafield-tags-value.ts`, mirroring `parse-metafield-choices.ts`'s try/catch-and-validate style:
    ```ts
    export function parseShopifyMetafieldTagsValue(value: string): string[] {
      try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
          ? parsed
          : [];
      } catch {
        return [];
      }
    }

    export function stringifyShopifyMetafieldTagsValue(tags: string[]): string {
      return JSON.stringify(tags);
    }
    ```
12. `shopify-metafield-value.ts`:
    - `isMetafieldValueFilled`: add a `tags` branch before the generic `return true`: `if (kind === "tags") return parseShopifyMetafieldTagsValue(value).length > 0;` (placed after the existing `!trimmed || kind === "unsupported"` guard, since `"[]"` is a non-empty trimmed string but an empty list).
    - `toShopifyMetafieldFormValue`: extend the type guard so `list.*` types are not rejected:
      ```ts
      if (
        field.type !== "single_line_text_field" &&
        field.type !== "url" &&
        field.type !== "dimension" &&
        !field.type.startsWith("list.")
      ) {
        return null;
      }
      ```
    - `isSubmittableMetafieldEntry`: add `if (entry.type.startsWith("list.")) return parseShopifyMetafieldTagsValue(entry.value).length > 0;` before the generic `return true` (per the Clarifications item on uniform, non-per-subtype validation).
    - `toShopifyMetafieldWireValue`: add a `list.*` branch that parses the internal JSON array string into `string[]`; keep the existing dimension object branch unchanged.
13. `packages/shopify/src/types.ts`: change `ShopifyProductSyncMetafieldValueSchema`'s `type` field from `z.enum(["single_line_text_field", "url", "dimension"])` to `z.string()`, matching `ShopifyMetafieldDefinitionSchema.type: z.string()`. Grep the package for any other site narrowing on this same closed enum before changing it, to confirm nothing else assumes exhaustiveness over exactly those three values.

### Part D — `@beyo/shopify`: components

14. New `packages/shopify/src/components/metafields/inputs/ShopifyMetafieldTagsInput.tsx`, parallel to `ShopifyMetafieldChoiceInput.tsx`:
    ```tsx
    import { TagSelectInput, type SearchableSelectOption, type SearchableSelectResult } from "@beyo/ui";

    export function ShopifyMetafieldTagsInput({
      id, choices, value, onChange, disabled,
    }: { id: string; choices: string[]; value: string; onChange: (value: string) => void; disabled?: boolean }): React.JSX.Element {
      const options: SearchableSelectOption[] = choices.map((choice) => ({ value: choice, displayValue: choice }));
      const tags = parseShopifyMetafieldTagsValue(value);
      const result: SearchableSelectResult[] = tags.map((tag) => {
        const matched = options.find((option) => option.value === tag);
        return matched ? { type: "option", option: matched } : { type: "text", text: tag };
      });

      return (
        <TagSelectInput
          id={id}
          options={options}
          value={result}
          onValueChange={(next) =>
            onChange(
              stringifyShopifyMetafieldTagsValue(
                next.map((entry) => (entry.type === "option" ? entry.option.value : entry.text)),
              ),
            )
          }
          forceSelection={choices.length > 0}
          disabled={disabled}
          data-testid="shopify-metafield-tags-input"
        />
      );
    }
    ```
15. `ShopifyMetafieldInputResolver.tsx`: add a `kind === "tags"` branch in the existing `kind === "choice" ? ... : kind === "text" ? ...` chain, calling `ShopifyMetafieldTagsInput` with the same `parseMetafieldChoices(field.validations)` call already used for the `"choice"` branch.

### Part E — tests for Part C/D

16. Update `resolve-shopify-metafield-input.test.ts`: assert `list.single_line_text_field`, `list.url`, and `list.dimension` (or similar) all resolve to `"tags"`.
17. New `shopify-metafield-tags-value.test.ts` mirroring `parse-metafield-choices.test.ts`: valid JSON array, invalid JSON, non-string-array JSON, round-trip via `stringifyShopifyMetafieldTagsValue`.
18. Update `shopify-metafield-value.test.ts`: cover `isMetafieldValueFilled` (`"[]"` → not filled, `'["a"]'` → filled) for a `list.*` field; `toShopifyMetafieldFormValue` accepting a `list.*` field; `isSubmittableMetafieldEntry` for a `list.*` entry.

## Risks and mitigations

- Risk: `TagSelectInput`'s pill-row wrapper duplicates some of `TextInput`'s visual chrome (border, focus ring, disabled state) since it cannot reuse `TextInput` directly (multi-line flex-wrap vs. fixed single-line height).
  Mitigation: import the same shared tokens (`FOCUS_WITHIN_RING`, `DISABLED_BASE`, `INVALID_RING`) from `../shared` that `TextInput` uses, so the visual language stays identical even though the two components don't share a wrapper `cva`.
- Risk: `ShopifyMetafieldInputResolver` (and its host pages `ShopifyMetafieldPickerForm`, `ShopifyProductSyncSlidePage`) has no dedicated Playwright coverage today, and the only live app route that reaches it (`apps/workers-app` task-step "sync to Shopify" flow, opened from `use-task-step-detail.controller.ts:407`) depends on a real Shopify test store having a configured `list.*` metafield definition to exercise this new branch end-to-end.
  Mitigation: treat Vitest (Part B/E) as the primary, deterministic validation layer for this change. For Playwright, add a spec that mocks the metafield-preferences search response via `page.route()` (per `34_runtime_validation_local.md`'s documented mocking pattern) to inject a synthetic `list.*` definition, rather than depending on real Shopify store data.
- Risk: loosening `ShopifyProductSyncMetafieldValueSchema.type` from a closed enum to `z.string()` removes a compile-time exhaustiveness guard other code may have relied on.
  Mitigation: Part C step 13 explicitly requires grepping for other exhaustive-switch sites on this schema's `type` before changing it.

## Validation plan

- `npm run test:ui`: `TagSelectInput.test.tsx` passes; existing `SearchableSelectInput.test.tsx` and `OptionList.test.tsx` remain green (untouched).
- `npm run test:shopify`: `resolve-shopify-metafield-input.test.ts`, `shopify-metafield-tags-value.test.ts`, `shopify-metafield-value.test.ts` pass; existing `resolve-shopify-product-sync-submit.test.ts` remains green (untouched — its inputs are unaffected by this change).
- `npx playwright test --grep "shopify.*metafield.*tags" --project=mobile` (new spec, `apps/workers-app/ManagerBeyo-app-workers/tests/playwright/features/task_steps/shopify-metafield-tags.spec.ts` or similar, using a mocked metafield-preferences response): filter, tap-to-add, backspace-remove, and x-icon-remove all work inside the real product-sync slide surface with the on-screen keyboard panel.
- `npx playwright test --grep "shopify.*metafield.*tags" --project=desktop`: same flow, `AnchoredOptionList` presentation instead of the keyboard panel.

## Review log

- `2026-07-14` `Claude`: initial plan drafted from user's stated intention plus direct reads of `SearchableSelectInput`, the option-list primitives, the Shopify metafield resolver/value pipeline, and the live `workers-app` wiring that reaches `ShopifyProductSyncSlidePage`.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `Codex`

## Post-archive wire-contract correction

- `2026-07-14T13:01:36Z`: corrected `list.*` wire values from JSON-encoded strings to `string[]`; updated the wire schema and submit regression coverage. The form's internal string contract remains unchanged.
