# PLAN_international_phone_input_20260521

## Metadata

- Plan ID: `PLAN_international_phone_input_20260521`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-21T10:23:20Z`
- Last updated at (UTC): `2026-05-21T10:41:26Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal:
  Design a reusable international phone input system for the managers app that defines a stable architecture for E.164 normalization, country inference, local display formatting, prefix selection via sheet surface, local last-country persistence, RHF integration, and future backend validation compatibility.
- Business/user intent:
  Replace plain `type="tel"` string fields with a mobile-native phone entry experience that feels like one unified input, preserves partial editing, remembers the user's last country, and emits backend-friendly normalized values without coupling primitives to forms or business domains.
- Non-goals:
  - No implementation in this plan.
  - No backend API or schema changes in this phase.
  - No server-side normalization implementation in this phase.
  - No country search, favorites, or localization in the first release.
  - No SVG flag pack in the first release.
  - No task-specific business rules beyond identifying where future task phone fields would integrate.

## Scope

- In scope:
  - Shared primitive API design for a unified phone input surface.
  - Shared utility architecture for phone parsing, inference, formatting, normalization, and persistence.
  - Cross-cutting surface architecture for a reusable country/prefix picker sheet.
  - RHF integration strategy for feature fields.
  - Library tradeoff decisions for `libphonenumber-js`, country metadata, and flag rendering.
  - Controlled-value, hydration, formatting, and partial-editing lifecycle design.
  - Testing and rollout strategy.
- Out of scope:
  - Replacing every existing phone field immediately in the same implementation slice.
  - Tight backend validation changes for `primary_phone_number` / `secondary_phone_number`.
  - Locale-aware translated country labels in the first release.
  - Desktop-specific alternate UI separate from the mobile-first unified primitive.
- Assumptions:
  - First implementation target is the managers app under `apps/managers-app/ManagerBeyo-app-managers/`.
  - Existing feature schemas continue to store phone values as plain strings, but the new system will write normalized E.164 strings when parseable.
  - The app currently needs general international phone support, not mobile-only phone support.
  - Bottom-sheet surfaces continue to be opened through the existing `SurfaceProvider` / `sheet` surface contract.
  - The first release should optimize for mobile bundle size and forgiving editing, not maximal strictness while typing.

## Clarifications required

None — the design constraints are sufficient to plan safely.

## Acceptance criteria

1. The implementation creates a reusable low-level phone primitive in `src/components/primitives/` that is app/domain agnostic and has no RHF, feature, or surface-manager knowledge.
2. The implementation introduces a single reusable country picker sheet opened through the existing surface system, with one-tap selection and immediate close behavior.
3. The system accepts an incoming E.164 value, infers the selected country when possible, and hydrates the visible local/national display value correctly.
4. The system emits normalized E.164 values when the typed number is parseable for the selected or inferred country, while preserving incomplete local editing state without clearing the visible input.
5. The system persists the last selected country locally and uses it only as a convenience default when no controlled value is present.
6. RHF-aware feature field components own `useController()` and map primitive/controller output into form state without moving RHF logic into primitives.
7. The first-release implementation documents and enforces a clear precedence order between controlled value, controlled country, hydrated inferred country, and local persisted country.
8. The implementation adds automated validation for utility helpers, primitive/component behavior, and mobile browser runtime behavior.
9. `npm run typecheck`, `npm run build`, and relevant Vitest/Playwright coverage pass for the new phone-input scope.

## Contracts and skills

### Domain schemas consulted

- `apps/managers-app/ManagerBeyo-app-managers/src/features/customers/types.ts`:
  established `primary_phone_number` as the existing customer phone field name across create, update, and field-composition schemas.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`:
  established `primary_phone_number` and `secondary_phone_number` as existing task-level phone field names for future integration.
- `apps/managers-app/ManagerBeyo-app-managers/src/types/common.ts`:
  confirmed shared type placement conventions and that no phone-specific shared type exists yet.

### Contracts loaded

- `architecture/01_architecture.md`: preserve primitive/shared/feature boundaries and keep business logic out of primitives.
- `architecture/01_architecture_local.md`: loaded for completeness; no route-entry behavior is expected for this plan.
- `architecture/02_types.md`: shared types must stay strict, schema-derived where relevant, and free of `any`.
- `architecture/04_api_client.md`: informs future backend compatibility expectations; no direct API work is planned now.
- `architecture/05_server_state.md`: loaded from core set; no server-state work is planned in the first implementation slice.
- `architecture/06_client_state.md`: local draft state and persisted country preference must use the correct storage tier.
- `architecture/07_components.md`: primitive components stay pure and reusable.
- `architecture/08_hooks.md`: utility-hook taxonomy governs any shared non-RHF orchestration hook.
- `architecture/09_forms.md`: RHF and validation ownership stay in feature field components.
- `architecture/13_errors.md`: invalid/parse failure states must surface through typed UI patterns rather than raw errors.
- `architecture/14_styling.md`: Tailwind + `cva` + `cn()` only.
- `architecture/15_feature_structure.md`: new cross-cutting surface capability must export through a feature boundary, not deep imports.
- `architecture/16_feature_workflow.md`: implementation order must go bottom-up from types/helpers to features/tests.
- `architecture/17_testing.md`: unit/component/runtime testing responsibilities.
- `architecture/18_performance.md`: library and metadata bundle decisions must be explicit and justified.
- `architecture/23_providers.md`: loaded to respect current surface/provider context boundaries.
- `architecture/24_dto.md`: informs normalized value and future backend DTO compatibility strategy.
- `architecture/26_persistence.md`: localStorage preference persistence rules.
- `architecture/27_responsive.md`: mobile-first UX and responsive behavior constraints.
- `architecture/28_surfaces.md`: selector sheet must register and open through the Surface Manager.
- `architecture/28_surfaces_local.md`: this app uses `sheet`, not canonical `drawer`.
- `architecture/33_vaul_drawer.md`: bottom-sheet interaction, dismissal, accessibility, and scroll-lock behavior.

### Local extensions loaded

- `architecture/01_architecture_local.md`: no direct delta used in this plan.
- `architecture/28_surfaces_local.md`: `sheet` is the active bottom-overlay type for this app.

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Prohibited (pattern reads — contract already covers these):
- Reading unrelated feature controllers to learn RHF integration shape.
- Reading unrelated surface implementations to learn manager registration shape beyond the existing shared surface pattern already consulted.

Permitted (relational reads — understanding what exists):
- Reading existing phone fields to confirm current field names and current plain-input usage.
- Reading current surface registration files to confirm how sheets and preload helpers are wired.
- Reading existing primitive input files to align visual API shape and styling conventions.

### Skill selection

- Primary skill: none
- Excluded alternatives: no named skill was requested or required for this planning-only turn

## Architecture strategy

### 1. Layered system shape

The implementation should be split into four layers:

1. Low-level primitive layer:
   purely visual input composition and event plumbing.
2. Shared phone utility layer:
   parsing, formatting, inference, persistence, and metadata lookup.
3. Cross-cutting phone-input feature layer:
   reusable app-level controller component and country picker sheet registration.
4. Domain field layer:
   RHF-aware feature fields such as customer phone fields and future task phone fields.

### 2. Stable ownership boundaries

- `PhoneInput` primitive:
  owns only rendering, focus states, separator, disabled/error visuals, input DOM props, and the selector button surface.
- Shared phone utilities:
  own conversion between display text, digits, country, and E.164 normalized output.
- Cross-cutting phone-input feature:
  owns surface opening, picker sheet content, last-country hydration orchestration, and controlled-value reconciliation.
- Feature fields:
  own RHF `useController()`, validation messaging, and field-name mapping into schemas such as `customer.primary_phone_number`.

### 3. Recommended file structure

#### Shared primitive layer

- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/phone-input/PhoneInput.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/phone-input/CountryPrefixSelector.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/phone-input/CountryFlag.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/phone-input/phone-input.variants.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/phone-input/types.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/phone-input/index.ts`

#### Shared utility layer

- `apps/managers-app/ManagerBeyo-app-managers/src/lib/phone/metadata.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/phone/countries.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/phone/flag.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/phone/storage.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/phone/parse-e164.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/phone/normalize-phone.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/phone/format-phone-display.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/lib/phone/phone-input-state.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/types/phone.ts`

#### Cross-cutting phone-input feature layer

- `apps/managers-app/ManagerBeyo-app-managers/src/features/phone-input/components/ManagedPhoneInput.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/phone-input/pages/PhoneCountryPickerSheetPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/phone-input/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/phone-input/preload.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/phone-input/index.ts`

#### Domain field layer

- `apps/managers-app/ManagerBeyo-app-managers/src/features/customers/components/fields/CustomerPhoneField.tsx`
- Future follow-up:
  task phone field components once those task UI fields are introduced.

### 4. Why a cross-cutting feature layer is needed

The primitive cannot import feature code or surface registrations, and the field components should not duplicate open/close/persistence/formatting orchestration. A small cross-cutting `features/phone-input` slice is the correct boundary for:

- exporting a reusable managed component through a feature `index.ts`
- registering the reusable country picker sheet in `surfaces.ts`
- encapsulating app-level surface interaction while keeping the primitive pure

This keeps the primitive reusable and keeps other features from deep-importing surface internals.

## Library decisions

### 1. `libphonenumber-js`

Use `libphonenumber-js` as the normalization and formatting engine.

#### Metadata evaluation

- `min`:
  smallest metadata bundle, includes parsing, country inference, E.164 serialization, and `AsYouType`, but validation is less strict.
- `max`:
  strictest validation and type detection, but materially larger.
- `mobile`:
  only appropriate when the app intentionally rejects non-mobile numbers.

#### First-release decision

Choose `libphonenumber-js/min` for the first implementation.

Reasoning:
- the app needs international general phone support, not mobile-only support, so `mobile` is the wrong semantic fit
- the first-release problem is editing, inference, formatting, and normalization, not strict carrier/type validation
- the primitive must tolerate incomplete edits, making `AsYouType` and parse/infer behavior more important than maximal `isValid()` strictness
- `max` should remain swappable later through a single metadata adapter if backend or compliance requirements demand stricter validation

Implementation seam:
- `src/lib/phone/metadata.ts` becomes the only file that imports `libphonenumber-js/*`
- every helper imports from that adapter, so metadata strategy can be swapped later without rewriting the primitive or feature fields

### 2. Country metadata

Use a curated static dataset for the first release instead of `i18n-iso-countries`.

Reasoning:
- the runtime needs more than country names:
  it needs `iso2`, dial prefix, flag rendering input, default sort order, and a predictable supported-country list
- `i18n-iso-countries` is useful for localization, but it does not by itself solve dial-prefix ownership
- the current app is English-first, mobile-first, and bundle-sensitive

Dataset shape:

```ts
type PhoneCountry = {
  iso2: CountryIso2;
  name: string;
  dialCode: string;     // e.g. '46'
  prefix: string;       // e.g. '+46'
  flagEmoji: string;    // e.g. '🇸🇪'
};
```

Future seam:
- `countries.ts` should export selector helpers from a stable interface so country-name localization can later swap to `i18n-iso-countries` or `Intl.DisplayNames`.

### 3. Flag rendering

Choose emoji flags for the first release.

Reasoning:
- zero extra asset bundle
- no SVG loading path
- fast to render in a large list
- easiest PWA/mobile-first baseline

Architecture requirement:
- do not inline emoji generation directly everywhere
- create a `CountryFlag` component or `getCountryFlag()` helper so the rendering strategy can later switch to SVG or lazy-loaded assets without changing callers

Fallback requirement:
- if emoji rendering is visually inconsistent on a device, the flag component should be able to fall back to the ISO code text without breaking layout

## Primitive API design

### Low-level primitive contract

`PhoneInput` should be controlled by display state, not by domain form state.

Proposed primitive props:

```ts
type PhoneInputProps = {
  displayValue: string;
  country: PhoneCountry | null;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  selectorAriaLabel?: string;
  inputAriaLabel?: string;
  onDisplayValueChange: (next: string, event: React.ChangeEvent<HTMLInputElement>) => void;
  onCountryPress: () => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>;
  'data-testid'?: string;
};
```

### Selector primitive contract

`CountryPrefixSelector` should be a button-like sub-primitive with:
- current flag
- current prefix
- disabled state
- invalid state border inheritance
- `aria-haspopup="dialog"`

### Why the primitive should not accept raw E.164 directly

The primitive is visual and should not own:
- parsing libphonenumber metadata
- local storage hydration
- surface opening semantics
- controlled-value precedence rules

Those belong in shared orchestration above the primitive.

## State ownership design

### Canonical state

There are three distinct state representations and they must not be collapsed:

1. Controlled external canonical value:
   E.164 string from parent form state or entity data.
2. Controlled or derived selected country:
   `CountryIso2 | null`
3. Local editable display draft:
   visible national/local string that may be incomplete

### Source-of-truth precedence

When reconciling state, use this order:

1. Parseable controlled `value` prop
2. Explicit controlled `country` prop when `value` is absent or empty
3. Persisted last-selected country in local storage
4. Browser locale region if supported by the curated dataset
5. App fallback country (recommend `SE` unless product-wide default is defined elsewhere)

Conflict rule:
- if a parseable E.164 `value` implies a country, that inferred country wins over persisted local storage
- if `value` and controlled `country` conflict, `value` wins for hydration and formatting, while the mismatch is documented as unsupported caller behavior

### Why a local draft is necessary

If the component only exposes controlled E.164 and the user types an incomplete number, the parent would have no valid E.164 to feed back. The visible input would collapse or clear on every render.

Therefore:
- the managed layer must keep a local draft display string
- the parent remains the source of truth for committed normalized value
- the local draft remains the source of truth for in-progress editing

## Hydration and normalization flow

### Incoming value hydration

If `value` is present:

1. Parse with `parsePhoneNumberFromString(value)`
2. Infer country from the parsed number when available
3. Derive national display format for the visible input
4. Set selected country from the parsed result
5. Ignore local-storage default for this render path

### Empty-value hydration

If `value` is empty or absent:

1. Try controlled `country`
2. Else try persisted last country
3. Else try locale-derived country
4. Else app fallback country
5. Start with empty display value

### On country selection

1. Update selected country
2. Persist selected country ISO code to local storage
3. Re-evaluate the current draft digits under the new country
4. If digits produce a parseable E.164 under the new country, emit updated normalized value
5. Close the surface immediately

### On typing

1. Sanitize the typed input into a permissive digit-oriented draft
2. Attempt to format visible text using `AsYouType`
3. Attempt to parse into E.164 using the selected country
4. Emit meta describing whether a normalized value exists
5. Keep the local draft even when no parseable E.164 exists yet

## Formatting lifecycle

### Chosen strategy

Use a hybrid formatting approach:

- hydrate and paste:
  aggressively normalize and format
- append-at-end typing:
  use live `AsYouType`
- deletion and mid-string editing:
  prioritize cursor stability and user control over perfect live prettification
- blur:
  canonicalize visible national formatting when parseable; otherwise leave the draft as-is

### Why not fully live formatting for every keystroke

Always-live formatting is attractive, but cursor preservation becomes brittle when:
- the user edits in the middle
- deletes separators
- pastes mixed-format content
- selects and replaces a substring

The plan should explicitly prefer native-feeling editing over maximum prettification.

### Cursor strategy

Phase 1 target:
- track selection range in the managed layer
- apply full `AsYouType` only when the edit happened at the end or when the full value was replaced
- avoid reformatting that would jump the caret during mid-string edits

This keeps implementation complexity bounded while still giving a polished mobile experience.

## Paste handling

### International paste

If pasted text starts with `+`:
- sanitize
- parse as international
- infer country from the number
- replace selected country when inference succeeds
- emit normalized E.164 immediately

### Local paste

If pasted text does not start with `+`:
- sanitize
- parse relative to the current selected country
- keep the current country
- emit E.164 if parseable

### Invalid paste

If parsing fails:
- keep a sanitized visible draft
- do not throw or clear the field
- emit `null` / empty canonical value and meta indicating incomplete or invalid draft

## Local storage lifecycle

### Persistence contract

Persist only the last selected country, not the phone number itself.

Recommended key:
- `managerbeyo.phone-input.last-country.v1`

Stored payload shape:

```ts
const LastPhoneCountrySchema = z.object({
  iso2: z.string().length(2),
  updatedAt: z.number().int(),
});
```

### Read lifecycle

- read once during managed-layer initialization when no external `value` is present
- validate the stored payload with Zod before using it
- ignore invalid or unknown stored values silently

### Write lifecycle

- write after explicit user selection
- do not write on every keystroke
- optionally write when an incoming E.164 value infers a different country only if the user explicitly interacted; do not let remote hydrated data silently overwrite the user's preference

## Surface responsibilities

### Country picker sheet

The reusable country sheet should live in `features/phone-input/pages/PhoneCountryPickerSheetPage.tsx`.

Responsibilities:
- receive current selection and `onSelect` callback through `useSurfaceProps()`
- render a vertically scrollable button list of countries
- display flag, country name, and prefix on each row
- show current selection affordance
- close immediately after `onSelect`

Non-responsibilities:
- no RHF
- no entity-specific labels
- no local storage writes directly unless explicitly delegated by the managed layer

### Surface registration

Register one reusable surface id, for example:
- `phone-country-picker`

In:
- `apps/managers-app/ManagerBeyo-app-managers/src/features/phone-input/surfaces.ts`

### Preload helper

Add:
- `preloadPhoneCountryPickerSurface()`

This mirrors existing sheet preloading patterns and lets field components or the managed layer warm the chunk on focus.

## RHF integration strategy

### Field-layer rule

Feature fields must own `useController()` because the phone system is no longer a simple native input with `register()`.

### Initial integration target

Replace the current customer phone field implementation in:
- `apps/managers-app/ManagerBeyo-app-managers/src/features/customers/components/fields/CustomerPhoneField.tsx`

The new field should:
- call `useController({ name: 'customer.primary_phone_number' })`
- pass the RHF string value into the managed phone-input layer
- write normalized E.164 back to RHF
- surface RHF field errors with the existing `FieldErrorPill`

### Future task integration

Task phone fields do not exist yet as separate field components. The plan should stage them as a follow-up integration target for:
- `primary_phone_number`
- `secondary_phone_number`

once task form field components are introduced.

## Validation strategy

### First-release validation mode

Do not block typing with strict runtime validation.

Expose meta states such as:
- `isPossible`
- `hasCompleteNationalNumber`
- `hasNormalizedValue`
- `inferredCountryChanged`

The field can use RHF validation on submit/blur while the managed layer remains forgiving during entry.

### Why strict `max` validation is deferred

The first problem to solve is stable editing plus normalization. Strict digit-regex validation can be added later behind the metadata adapter if backend requirements demand it.

## Accessibility strategy

- The selector is a real button with `aria-haspopup="dialog"`.
- The visible input remains a native `<input type="tel">`.
- The feature field owns the accessible label; the primitive should support `id` and `aria-*` passthrough.
- The unified wrapper should expose one clear focus ring and error state.
- The country picker sheet rows should be real buttons, not clickable `<div>` elements.
- Selection state in the sheet should be communicated with `aria-pressed` or `aria-selected`, depending on final row semantics.

## Mobile keyboard and autofill behavior

- Use `type="tel"`.
- Use `inputMode="tel"`.
- Prefer `autoComplete="tel-national"` when the prefix is selected separately.
- Preserve large touch targets for the selector and input.
- Keep the prefix selector and input visually merged as one control surface with a separator.

## UX edge cases to explicitly cover

- user pastes a full international number while another country is selected
- user deletes the full local number but keeps the selected country
- user switches country after typing a national number
- user receives a new external E.164 value while editing
- user edits in the middle of a formatted number
- local storage contains an unsupported or stale country code
- country inference from E.164 is ambiguous or unavailable
- disabled state while a value is already present
- invalid RHF state with no normalized value but non-empty visible draft

## Controlled vs uncontrolled behavior

### External contract

The managed layer should support:
- controlled canonical `value`
- optional controlled `country`
- uncontrolled local draft display state

### Recommended rule

Do not provide a fully uncontrolled public primitive API in phase 1.

Reason:
- the main integration target is forms and hydrated entity data
- canonical E.164 ownership needs a deterministic parent signal
- a fully uncontrolled API would create a second public behavior surface with more edge cases and lower architectural clarity

## Testing strategy

### Utility tests

Add Vitest coverage for:
- E.164 hydration from incoming values
- country inference
- local-number normalization under a selected country
- paste sanitization
- storage read/write validation
- fallback precedence order

### Primitive/component tests

Add RTL coverage for:
- unified surface rendering
- disabled and invalid state visuals/attributes
- selector button semantics
- display-value changes flowing through callbacks

### Managed-layer tests

Add RTL coverage for:
- incoming E.164 hydration populates country and display
- persisted country hydrates only when value is empty
- selecting a country writes persistence and closes the sheet
- incomplete typing preserves visible draft without clearing

### Runtime tests

Add Playwright mobile coverage for:
- opening the selector sheet from the phone input
- selecting a country and seeing prefix update
- typing a local number and observing normalized submission value in a test form harness
- pasting an international number and seeing country inference
- persisted last-country default across reload or re-open in a controlled test harness

Desktop Playwright coverage can be lighter, because the UX is still mobile-first, but should confirm no regression in sheet opening and keyboard input.

## Implementation plan

1. Add shared phone types and a single metadata adapter boundary.
2. Add the curated country dataset, flag helper, and local-storage helper with Zod validation.
3. Add pure phone helpers for hydration, display formatting, normalization, and paste handling.
4. Build the low-level `PhoneInput` and `CountryPrefixSelector` primitives with unified Tailwind/CVA styling.
5. Create the cross-cutting `features/phone-input` slice with:
   - `ManagedPhoneInput`
   - country picker sheet page
   - `surfaces.ts`
   - `preload.ts`
   - public `index.ts`
6. Integrate the first RHF-aware field in `CustomerPhoneField` via `useController()`.
7. Add a lightweight test harness surface or testing-form integration path for runtime validation.
8. Add Vitest coverage for utilities and managed behavior.
9. Add Playwright mobile coverage for selection, typing, paste, persistence, and hydration.
10. Run `typecheck`, `build`, Vitest scope, and Playwright mobile/desktop validation.

## Rollout order

### Phase 1 — architecture foundation

- shared types
- utility helpers
- curated country dataset
- persistence helper

### Phase 2 — reusable UI system

- phone primitives
- managed phone-input component
- phone country picker sheet

### Phase 3 — first field integration

- `CustomerPhoneField`
- optional test harness integration in testing forms

### Phase 4 — broader adoption

- future task phone fields
- future customer/task detail/edit screens

### Phase 5 — extensions

- search
- favorites
- localization
- optional strict validation mode
- alternate flag rendering strategy

## Risks and mitigations

- Risk:
  `libphonenumber-js/min` may be too permissive for some strict validation cases.
  Mitigation:
  isolate metadata import in one adapter and document a future `max` switch or split validation mode.

- Risk:
  always-live formatting causes cursor jumps and hostile editing.
  Mitigation:
  use a hybrid formatting strategy with a local draft and guarded `AsYouType` application.

- Risk:
  local storage could override backend-hydrated values incorrectly.
  Mitigation:
  define strict precedence: controlled `value` always beats persistence.

- Risk:
  a primitive that tries to own surface logic would violate architecture boundaries.
  Mitigation:
  keep the low-level primitive pure and introduce a cross-cutting managed component plus feature surface slice.

- Risk:
  emoji flags may render inconsistently on some Android devices.
  Mitigation:
  encapsulate rendering behind a `CountryFlag` abstraction with text fallback.

- Risk:
  replacing `register()` with `useController()` in phone fields changes field integration semantics.
  Mitigation:
  limit the first rollout to one field, add runtime coverage, and document the pattern for later reuse.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run build`: successful managers app production build
- `vitest` scoped to phone-input utilities/components: pass
- `npx playwright test --grep "phone input|testing forms" --project=mobile`: pass
- `npx playwright test --grep "phone input|testing forms" --project=desktop`: pass

## Review log

- `2026-05-21` `Codex`: initial architecture-first implementation plan created from current contracts, field schemas, surface patterns, and library tradeoff analysis
- `2026-05-21` `Codex`: implemented the phone-input architecture, added unit/runtime coverage, and completed lifecycle archive after passing typecheck, build, and mobile Playwright validation

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
