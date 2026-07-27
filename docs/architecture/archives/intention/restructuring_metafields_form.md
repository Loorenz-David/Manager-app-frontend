Intention: Restructure Shopify Product Sync Form with Dynamic Metafields

Objective

Restructure ShopifyProductSyncForm so product metafields are no longer represented by hardcoded dimension fields.

The form will instead use a reusable metafield component that allows the user to:

1. Load previously preferred metafields for the current internal item category.
2. Search the selected Shopify shops for additional metafield definitions.
3. Add relevant metafields to the form.
4. Enter values for those metafields inside the same component.
5. Track newly used metafields as pending preferences.
6. Allow the parent form to decide when pending preferences should be persisted.
7. Include valid dynamic metafield values in the final product-processing request.

The implementation must support one or more selected Shopify shops while preserving the distinction between:

- Saved metafield preferences.
- Live Shopify metafield-definition search results.
- Active metafield fields in the current form.
- Values entered for the current product.
- Unsaved preference candidates.

⸻

Existing Form

The current form is located at:

frontend/packages/shopify/src/components/ShopifyProductSyncForm.tsx

It currently contains:

- Shopify shop selection.
- SKU.
- Hardcoded dimension fields.
- Title.
- Description.

The existing dimension fields and all dimension-specific form logic will be removed.

This includes the current use of:

ShopifyProductSyncDimensionField
SHOPIFY_PRODUCT_SYNC_DIMENSION_FIELDS
shopify-product-sync-dimensions
heightCm
widthCm
depthCm

It also includes dimension-specific logic inside:

frontend/packages/shopify/src/lib/resolve-shopify-product-sync-submit.ts

The product-sync form must no longer construct metafields from a predefined local dimensions map.

Metafields will instead be collected dynamically from the new metafield component.

⸻

Backend Contract

The frontend implementation must follow:

frontend/docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_metafield_preferences_20260713.md

The backend exposes:

POST /api/v1/integrations/shopify/metafield-preferences

and:

GET /api/v1/integrations/shopify/metafield-preferences

The frontend must preserve the distinction between the two record types returned by the GET route:

saved metafield preferences

and:

live metafield-definition search results

Saved preferences include local preference metadata such as:

client_id
item_category_id
shop_integration_id
sequence_order
created_by

Search results include current Shopify metafield-definition characteristics but do not represent saved preferences.

⸻

1. New Metafield Component

Create a reusable component responsible for displaying, searching, selecting, and filling Shopify metafields.

Suggested name:

ShopifyMetafieldPickerForm

Suggested location:

frontend/packages/shopify/src/components/metafields/ShopifyMetafieldPickerForm.tsx

The final name may change if another name more clearly communicates that the component handles both metafield selection and value entry.

The component will be rendered inside ShopifyProductSyncForm where the current hardcoded dimension fields are rendered.

The component consists of:

search header

- search results
- active metafield fields
- loading, empty, and error states

⸻

Component Responsibilities

The metafield component is responsible for:

- Receiving the currently selected Shopify integration IDs.
- Receiving the current internal item category ID.
- Loading saved metafield preferences for the current category.
- Searching live Shopify metafield definitions.
- Preserving the distinction between saved preferences and search results.
- Rendering saved preferences as editable fields.
- Rendering selected search results as editable fields.
- Preventing duplicate active fields within the same Shopify shop.
- Resolving the correct input component from each metafield type and validations.
- Tracking entered metafield values.
- Determining which unsaved fields are eligible to become preferences.
- Exposing current metafield values to the parent form.
- Exposing pending preference candidates through a controller or explicit callback boundary.
- Preserving shop-specific ownership of every definition and value.
- Displaying shop-identification labels only when multiple shops are selected.

The component is not responsible for:

- Inferring shop ownership from visual position.
- Submitting the final product-processing request.
- Deciding when pending preferences should be persisted.
- Automatically creating preferences after every keystroke.
- Accepting or constructing raw Shopify domains.
- Owning the selected Shopify shop list.
- Owning the current item category.
- Persisting preferences without direction from the parent.
- Rendering editable inputs for unsupported metafield types.
- Serializing the final Shopify product-processing payload.

⸻

2. Parent-Provided Inputs

The parent must provide the selected Shopify integration IDs.

These IDs are the client_id values from:

ShopifyShopIntegration

Suggested prop:

shopIntegrationIds: string[];

The component must never receive raw Shopify domains as request authority.

The parent should also provide the internal item category ID:

itemCategoryId?: string | null;

The category ID is required for:

- Loading saved preferences.
- Creating new preferences.

The component may still support live metafield search when no item category is available, but category preference loading and preference creation must remain disabled.

A conceptual prop contract is:

type ShopifyMetafieldPickerFormProps = {
shopIntegrationIds: string[];
itemCategoryId?: string | null;
value: ShopifyMetafieldFormValue[];
onChange: (value: ShopifyMetafieldFormValue[]) => void;
};

The final contract must follow the existing form and controller conventions.

⸻

3. Multi-Shop Boundary

Every Shopify metafield definition belongs to a specific Shopify shop integration.

The same visible metafield may exist independently in several shops with different definition IDs.

Example:

Shop A
Height
gid://shopify/MetafieldDefinition/111
Shop B
Height
gid://shopify/MetafieldDefinition/987

These must remain separate frontend records.

The stable identity of an active metafield field must therefore include:

shop_integration_id

- shopify_metafield_definition_id

Do not identify a field only by:

name
namespace
key
shopify_metafield_definition_id

because those values must not be assumed globally unique across connected shops.

A conceptual identity helper is:

function createMetafieldFieldIdentity(
shopIntegrationId: string,
definitionId: string,
): string {
return `${shopIntegrationId}:${definitionId}`;
}

This identity must be used for:

- Active-field deduplication.
- Form value updates.
- Pending preference tracking.
- React keys.
- Successful preference reconciliation.
- Removal behavior.

⸻

4. Conditional Shop Identification in the UI

Metafield fields and search results must display their owning Shopify shop only when more than one Shopify integration is currently selected.

Exactly one selected shop

When exactly one Shopify shop is selected:

- Do not render a shop name next to each metafield.
- Do not render a shop badge on every field.
- Do not render a repeated shop heading solely for identification.
- Treat shop ownership as visually implicit.
- Continue preserving shop_integration_id internally.
- Continue using the shop-specific identity for values, queries, preferences, and submission.

More than one selected shop

When multiple Shopify shops are selected:

- Every saved preference, search result, and active metafield must visibly identify its owning shop.
- Use the integration’s human-readable shop display name.
- Do not display the raw integration client ID as the primary visible label.
- Use the shop domain only as a fallback when no better display name exists.
- Identical-looking metafields from different shops must remain visually distinguishable.
- Shop identity may be displayed beside each field or through an unambiguous shop-specific group heading.

The presentation rule is:

one selected shop
→ shop identity remains internal
→ no repeated shop label
multiple selected shops
→ display the owning shop name
→ preserve shop-specific visual grouping

A conceptual helper is:

const shouldDisplayShopIdentity =
shopIntegrationIds.length > 1;

This helper controls presentation only.

It must not control:

- Field identity.
- Query grouping.
- Preference scope.
- Form value identity.
- Pending-preference identity.
- Product submission.
- Backend request construction.

All underlying operations remain shop-specific regardless of whether the shop label is visible.

⸻

5. Shop Display Metadata

The metafield component requires enough integration metadata to display a readable shop name when multiple shops are selected.

The normalized field state should retain:

shopIntegrationId: string;
shopDisplayName: string;
shopDomain?: string | null;

shopDisplayName should come from the Shopify integration records already available to the product-sync form.

The metafield-preference response identifies the owning shop using shop_integration_id and may include shop_domain, but the frontend should prefer the integration’s existing display name.

When no dedicated display name exists, use the normalized shop domain as the visible fallback.

The metadata must remain attached to the field even in single-shop mode, where it is not rendered.

⸻

6. Category Preference Loading

Category mode loads metafields previously selected for the current item category.

It runs when:

shopIntegrationIds.length > 0
AND
itemCategoryId is available
AND
there is no active valid search query

The component calls:

GET /api/v1/integrations/shopify/metafield-preferences

with:

shop_integration_ids
item_category_ids

Example:

GET /api/v1/integrations/shopify/metafield-preferences
?shop_integration_ids=shpint_shop_a,shpint_shop_b
&item_category_ids=icat_001

The component reads:

shops[].item_categories[].metafield_preferences[]

The returned records are already saved preferences.

They must:

- Render as active fields.
- Preserve their returned sequence_order.
- Preserve their client_id.
- Preserve created_by.
- Remain associated with their owning shop.
- Never be added to the pending-preference store.

⸻

7. Search Behavior

The component includes a search bar using:

frontend/packages/ui/src/components/primitives/search-bar

The query-state behavior should follow the established pattern used by:

frontend/packages/tasks/src/components/TasksView.tsx
frontend/packages/tasks/src/components/TasksHeader.tsx

The search bar controls the backend query parameter:

q

Search requirements:

- Trim the entered search text.
- Search only when the normalized query contains more than three characters.
- Debounce the query by 300 milliseconds.
- Do not issue a request for every keystroke.
- Search all currently selected Shopify integrations.
- Do not include item_category_ids while search mode is active.
- Disable the search query when the normalized search no longer satisfies the minimum length.
- Restore category mode when search is cleared.
- Preserve already active fields while search results change.

Example:

GET /api/v1/integrations/shopify/metafield-preferences
?shop_integration_ids=shpint_shop_a,shpint_shop_b
&q=height

The component reads:

shops[].search_results[]

Each result remains associated with the shop group that returned it.

⸻

8. Query Mode Separation

The component has two mutually exclusive query modes.

Category mode

Runs when:

itemCategoryId is available
AND
there is no valid debounced search query

Request includes:

shop_integration_ids
item_category_ids

Purpose:

load saved metafield preferences

Search mode

Runs when:

debounced search query length > 3

Request includes:

shop_integration_ids
q

Purpose:

search live metafield definitions

While search mode is active:

- Do not send item_category_ids.
- Do not run the category query simultaneously.
- Do not discard or clear active fields already added to the form.
- Keep category-loaded fields visible unless the intended UX explicitly hides them.

The implementation should use query-enabling conditions rather than firing both requests and discarding one response.

⸻

9. Search Result Presentation

Search results must be displayed separately from active form fields.

When exactly one shop is selected:

- Do not display the shop name on every result.

When multiple shops are selected:

- Every result must display its owning shop name, or
- Results must appear inside a clearly labeled shop-specific result group.

The result presentation must include enough information for the user to distinguish similarly named definitions.

Recommended visible information:

- Definition name.
- Shop name when multiple shops are selected.
- Namespace and key as secondary technical context when useful.
- Type where useful.
- Description when available.

⸻

10. Search Result Selection

When the user selects a search result:

1. Add it to the active metafield fields.
2. Preserve its shop_integration_id.
3. Preserve its shopify_metafield_definition_id.
4. Preserve its live metadata:
   - name
   - namespace
   - key
   - description
   - type
   - validations
5. Preserve its shop display metadata.
6. Assign deterministic sequence_order.
7. Mark its source as an unsaved search result.
8. Do not create a preference immediately.
9. Do not add it to pending preferences merely because it was selected.
10. Prevent the same shop-specific definition from being added twice.
11. Close or reset the search interaction according to the final UX decision.

A selected search result only becomes eligible for preference creation after it contains a valid confirmed value.

Clearing the search query must not remove active fields already selected from search results.

⸻

11. Saved Preferences Versus Search Results

The frontend must preserve an explicit distinction between:

saved preference

and:

unsaved selected definition

A saved preference has a backend preference client_id.

An unsaved selected definition does not.

A conceptual source type is:

type ShopifyMetafieldFieldSource =
| "saved_preference"
| "search_result";

A conceptual normalized field model is:

type ShopifyMetafieldField = {
identity: string;
source: ShopifyMetafieldFieldSource;
preferenceClientId?: string;
shopIntegrationId: string;
shopDisplayName: string;
shopDomain?: string | null;
shopifyMetafieldDefinitionId: string;
itemCategoryId?: string | null;
name: string;
namespace: string;
key: string;
description: string | null;
type: string;
validations: ShopifyMetafieldValidation[];
sequenceOrder: number;
value: unknown;
};

The exact names and casing must follow the package conventions.

The source must remain explicit and must not be inferred from presentation state alone.

⸻

12. Metafield Body

The body displays active metafields as form fields.

Each active field contains:

- A visible metafield label.
- An input selected by the input resolver.
- Optional description or supporting text.
- The shop display name when multiple shops are selected.
- No shop label when exactly one shop is selected.
- Unsupported-type presentation when the field cannot currently be edited.

Saved preferences render in their returned sequence_order.

Newly selected search results receive deterministic ordering after the existing fields for the same shop and category.

Sequence ordering is independent per shop.

Example:

Shop A
0 Height
1 Width
2 Material
Shop B
0 Height
1 Designer

The implementation must not mix unlabeled fields from several shops into one ambiguous list.

⸻

13. Metafield Input Resolver

Create a resolver responsible for selecting the correct input component from the metafield definition.

Suggested name:

ShopifyMetafieldInputResolver

Suggested location:

frontend/packages/shopify/src/components/metafields/ShopifyMetafieldInputResolver.tsx

Conceptual props:

type ShopifyMetafieldInputResolverProps = {
definition: ShopifyMetafieldDefinition;
value: unknown;
onChange: (value: unknown) => void;
disabled?: boolean;
invalid?: boolean;
};

The resolver must inspect:

type

- validations

The resolver must not:

- Perform backend queries.
- Own preference state.
- Persist preferences.
- Know the item category.
- Coordinate selected shops.
- Build the final product-processing request.
- Serialize the final Shopify metafield payload.

For choice-based `single_line_text_field` definitions, the resolver must render the package-specific `ShopifyMetafieldChoiceInput`.

`ShopifyMetafieldChoiceInput` composes the existing shared `SearchableSelectInput`.

The resolver must not render `SearchableSelectInput` directly when metafield-specific parsing and result adaptation are required.

⸻

14. Initially Supported Types

The initial resolver supports:

single_line_text_field
url

All other types render an explicit unsupported-field presentation.

Unsupported fields must not be silently omitted.

The unsupported presentation should communicate that the definition was returned successfully but its input type is not yet supported.

⸻

15. Single-Line Text Field

For:

single_line_text_field

the resolver must inspect the definition validations.

With valid choices

When a valid `choices` validation exists, render the existing generic searchable select input:

SearchableSelectInput

Existing implementation:

frontend/packages/ui/src/components/primitives/input/SearchableSelectInput.tsx

The metafield implementation must consume this existing primitive rather than creating another searchable select input.

Shopify returns choices in a validation shaped like:

{
"name": "choices",
"value": "[\"Oak\",\"Teak\",\"Walnut\"]"
}

The validation value is a JSON-encoded string.

The frontend must parse it defensively.

Conceptual parser:

function parseMetafieldChoices(
validations: ShopifyMetafieldValidation[],
): string[] {
const choicesValidation = validations.find(
(validation) => validation.name === "choices",
);
if (!choicesValidation?.value) {
return [];
}
try {
const parsed: unknown = JSON.parse(
choicesValidation.value,
);
if (!Array.isArray(parsed)) {
return [];
}
return parsed.filter(
(value): value is string =>
typeof value === "string",
);
} catch {
return [];
}
}

Behavior:

single_line_text_field + valid non-empty choices
→ SearchableSelectInput
single_line_text_field + no valid choices
→ TextInput

For the searchable select:

- The choice string may be used as both option value and label.
- The committed value must be one of the available choices.
- Filtering happens locally.
- Typing inside the choice input must not trigger a backend metafield search.

The metafield choice field must adapt the parsed Shopify choices into the option contract expected by `SearchableSelectInput`.

Conceptually:

type MetafieldChoiceOption = {
value: string;
displayValue: string;
disabled?: boolean;
};

const options = choices.map((choice) => ({
value: choice,
displayValue: choice,
}));

The metafield field must use:

forceSelection={true}

This ensures that a committed value must be one of the predefined choices.

The field must adapt `SearchableSelectResult` into the metafield string value:

- A result with `type: "option"` stores `result.option.value`.
- A `null` result clears the metafield value.
- A result with `type: "text"` must not be accepted for a predefined-choice metafield.

The Shopify-specific field component is responsible for this adaptation.

`SearchableSelectInput` must remain generic and must not be modified to understand metafields, Shopify validations, or product submission behavior.

Without choices

Use:

frontend/packages/ui/src/components/primitives/input/TextInput.tsx

A trimmed non-empty string is considered filled.

⸻

16. URL Field

For:

url

use:

frontend/packages/ui/src/components/primitives/input/TextInput.tsx

The input should use the most appropriate URL input type or input mode supported by TextInput.

The field should preserve the raw entered value while editing.

A non-empty value must be validated before final form submission.

The implementation plan should inspect existing URL validation conventions before introducing a new validator.

⸻

17. Unsupported Types

When the resolver receives an unsupported type, render a dedicated unsupported field.

Suggested name:

ShopifyMetafieldUnsupportedField

It should display:

- The metafield name.
- The unsupported type.
- A short explanation that the field cannot currently be edited.

It must not:

- Render a misleading free-text fallback.
- Accept arbitrary values.
- Be silently omitted.
- Be treated as filled.
- Be added to pending preferences.

⸻

18. Metafield Value State

The parent form must ultimately own the metafield values included in the product-processing request.

The metafield component may manage interaction state, but it must expose normalized value changes through an explicit controlled contract or controller.

The value identity must include:

shop_integration_id

- shopify_metafield_definition_id

A conceptual value model is:

type ShopifyMetafieldFormValue = {
shopIntegrationId: string;
shopifyMetafieldDefinitionId: string;
namespace: string;
key: string;
type: string;
value: string;
sequenceOrder: number;
};

The final model must align with the backend product-processing contract.

Do not assume the current dimensions-based payload remains valid.

⸻

19. Filled and Confirmed Values

A metafield is considered filled only when its resolved input contains a valid committed value.

Examples:

single_line_text_field with choices
→ one valid option is selected
single_line_text_field without choices
→ trimmed text is non-empty
url
→ trimmed value is non-empty and valid

A field must not count as filled merely because:

- It was returned by category preference loading.
- It was selected from search results.
- Its input was focused.
- It contains an invalid draft value.
- It is unsupported.

Where relevant, the component should distinguish:

draft value

from:

confirmed valid value

⸻

20. Pending Preference Store

When an unsaved search-result field receives a valid confirmed value, it becomes a pending preference candidate.

Use a temporary Zustand store.

Suggested name:

useShopifyMetafieldPendingPreferencesStore

Suggested location:

frontend/packages/shopify/src/stores/use-shopify-metafield-pending-preferences-store.ts

The store must contain only unsaved preference candidates.

It must not contain fields already returned as saved preferences.

A conceptual record is:

type PendingShopifyMetafieldPreference = {
itemCategoryId: string;
shopIntegrationId: string;
shopifyMetafieldDefinitionId: string;
sequenceOrder: number;
};

The stable identity is:

item_category_id

- shop_integration_id
- shopify_metafield_definition_id

The store must deduplicate by that identity.

⸻

21. Pending Preference Eligibility

A field may enter the pending store only when all of these are true:

source is search_result

- field is not already a saved preference
- itemCategoryId is available
- field contains a valid confirmed value

A field must not enter the pending store when:

- It was selected but not filled.
- Its value is invalid.
- It was loaded from saved preferences.
- The item category is unavailable.
- The same candidate already exists.
- The field type is unsupported.

If a pending field becomes empty or invalid before preferences are persisted, remove it from the pending store.

The implementation plan must define cleanup behavior when:

- A field is removed.
- A selected shop is removed.
- The item category changes.
- The form closes.
- The form is skipped.
- Product submission fails.
- Preference creation succeeds.

⸻

22. Parent-Controlled Preference Creation

The metafield component must not decide when to call:

POST /api/v1/integrations/shopify/metafield-preferences

The parent owns that decision.

The component exposes pending candidates through a controller or store-backed interface.

The parent must not send the create request when there are no pending candidates.

The exact trigger remains an implementation clarification.

Possible trigger points include:

- After successful product processing.
- Before product processing.
- When leaving the metafield step.
- Through an explicit confirmation action.

The component itself must not choose the trigger.

⸻

23. Preference Creation Request

When the parent decides to persist pending preferences, send one batch request.

Example:

{
"item_category_id": "icat_001",
"preferences": [
{
"shop_integration_id": "shpint_shop_a",
"shopify_metafield_definition_id": "gid://shopify/MetafieldDefinition/111",
"sequence_order": 0
},
{
"shop_integration_id": "shpint_shop_b",
"shopify_metafield_definition_id": "gid://shopify/MetafieldDefinition/987",
"sequence_order": 0
}
]
}

Do not send one request per shop.

The request may contain several definitions for the same shop.

Before sending:

- Remove duplicate shop-and-definition pairs.
- Preserve deterministic order.
- Exclude saved preferences.
- Exclude invalid or empty fields.
- Require item_category_id.
- Skip the mutation when the resulting list is empty.

The backend operation is atomic.

If one entry fails, none of the preferences are created.

The frontend must preserve pending candidates when creation fails so the user can retry.

⸻

24. Successful Preference Creation

The create route returns one saved preference for each submitted entry, in request order.

After success:

1. Change the matching field source from search_result to saved_preference.
2. Store the returned preference client_id.
3. Update returned server metadata where appropriate.
4. Remove the matching pending candidate.
5. Avoid adding duplicate active fields.
6. Update or invalidate the relevant preference query cache.

The implementation plan should decide whether to:

- Merge the response directly into active state.
- Invalidate and refetch the category query.
- Use both for immediate continuity and server reconciliation.

Do not maintain two active copies of the same field.

⸻

25. Unavailable Definitions

The category query may return:

unavailable_definition_ids

These represent saved preferences whose Shopify definitions can no longer be resolved.

The component must not silently ignore them.

Render visible shop-specific feedback.

Example:

One or more saved metafields are no longer available in this Shopify shop.

The IDs remain scoped to the shop result that returned them.

This phase does not include deleting or repairing unavailable preferences unless an existing backend capability supports it.

The frontend must not invent a delete request.

⸻

26. Shop Selection Changes

When shopIntegrationIds changes:

- Query only currently selected shops.
- Remove active fields that belong only to deselected shops.
- Remove pending candidates belonging to deselected shops.
- Preserve values for shops that remain selected.
- Prevent stale responses from previous selections from overwriting current state.
- Preserve selected shop order in shop groups.
- Recalculate whether shop labels should be displayed.
- Hide or show shop labels without recreating field values.

Changing from one selected shop to several must reveal shop identity without losing field state.

Changing from several selected shops to one must hide redundant shop identity without losing field state.

⸻

27. Item Category Changes

When itemCategoryId changes:

- Clear saved-preference fields from the previous category.
- Clear pending candidates from the previous category.
- Prevent stale responses for the previous category from populating the new state.
- Start the category query for the new category when available.
- Clear manually selected dynamic fields by default unless a deliberate migration rule is established.

The safer default is to clear dynamic metafields because their relevance was determined using the previous category.

⸻

28. Search Clearing

When search is cleared:

- Disable search mode.
- Clear visible search results.
- Restore category mode when an item category is available.
- Preserve active fields previously selected from search results.
- Preserve entered field values.
- Do not remove pending preference candidates solely because search text was cleared.

Search results and active fields are separate states.

⸻

29. Form Integration

The new component replaces the current dimension section inside:

frontend/packages/shopify/src/components/ShopifyProductSyncForm.tsx

The current dimension rendering should be removed:

<ContentCard gapClassName="gap-3">
  {SHOPIFY_PRODUCT_SYNC_DIMENSION_FIELDS.map(
    ({ name, label, inputTestId }) => (
      <ShopifyProductSyncDimensionField
        key={name}
        name={name}
        label={label}
        inputTestId={inputTestId}
      />
    ),
  )}
</ContentCard>

Conceptual replacement:

<ContentCard gapClassName="gap-3">
  <ShopifyMetafieldPickerForm
    shopIntegrationIds={selectedShopIntegrationIds}
    itemCategoryId={itemCategoryId}
    value={metafieldValues}
    onChange={setMetafieldValues}
  />
</ContentCard>

The exact integration must follow the existing react-hook-form architecture.

The implementation plan must choose one authoritative value source:

- react-hook-form.
- A metafield controller synchronized with react-hook-form.
- Another existing form-state mechanism.

Do not create two competing authoritative sources.

⸻

30. Form Schema Changes

Remove these dimension-specific fields from ShopifyProductSyncFormSchema:

heightCm
widthCm
depthCm

Add a dynamic metafield collection.

Conceptual shape:

metafields: ShopifyProductSyncMetafieldValue[];

The schema should validate:

- Shop integration ID.
- Shopify definition ID.
- Namespace.
- Key.
- Type.
- Value.
- Supported type-specific constraints.

The schema must not assume all metafield values are numeric.

⸻

31. Form-Filled Logic

Update isFormFilled in:

frontend/packages/shopify/src/lib/resolve-shopify-product-sync-submit.ts

The form counts as filled when:

SKU is filled
OR
at least one dynamic metafield is valid and filled
OR
title is filled
OR
description is filled

A returned preference without a value must not count as filled.

A selected search result without a value must not count as filled.

An unsupported field must not count as filled.

⸻

32. Product Submission

Remove the dimension-specific construction of:

const metafields: Record<string, number> = {};

The form must serialize valid dynamic metafields according to the backend products/process contract.

The implementation plan must inspect the current backend request model and resolve:

- Whether metafields are scoped globally or per target shop.
- Whether different shops can receive different definitions.
- Whether the backend accepts definition IDs.
- Whether it requires namespace and key.
- Whether it requires type.
- Whether the value must already be serialized.
- Whether the current dict[str, object] contract is sufficient.
- How empty and unsupported fields are excluded.

Do not force dynamic values into the previous dimensions-only representation.

This contract must be resolved before final submission wiring.

⸻

33. API Layer

Add frontend API functions and hooks for:

GET /api/v1/integrations/shopify/metafield-preferences

and:

POST /api/v1/integrations/shopify/metafield-preferences

Suggested files:

frontend/packages/shopify/src/api/get-shopify-metafield-preferences.ts
frontend/packages/shopify/src/api/use-shopify-metafield-preferences-query.ts
frontend/packages/shopify/src/actions/create-shopify-metafield-preferences.ts
frontend/packages/shopify/src/actions/use-create-shopify-metafield-preferences.ts

Final placement must follow existing package conventions.

Query keys must include normalized:

shopIntegrationIds
itemCategoryIds
q
onlyMyPreferences

Category and search modes must use distinct query keys.

Queries must be disabled when required parameters are unavailable.

⸻

34. Response Types

Add explicit frontend types for:

ShopifyMetafieldValidation
ShopifyMetafieldDefinition
ShopifyMetafieldPreference
ShopifyMetafieldPreferenceItemCategory
ShopifyMetafieldPreferenceShopResult
ShopifyMetafieldPreferencesResponse
CreateShopifyMetafieldPreferencesRequest

Do not use one ambiguous type for saved preferences and search results.

Conceptually:

type ShopifyMetafieldDefinition = {
shopify_metafield_definition_id: string;
name: string;
namespace: string;
key: string;
description: string | null;
type: string;
validations: ShopifyMetafieldValidation[];
};
type ShopifyMetafieldPreference =
ShopifyMetafieldDefinition & {
client_id: string;
item_category_id: string;
shop_integration_id: string;
sequence_order: number;
is_enabled: boolean;
created_at: string;
updated_at: string | null;
created_by: ShopifyPreferenceCreatedBy;
};

Follow the existing API response casing consistently.

⸻

35. Component Structure

The implementation plan should consider separating the capability into focused components.

Possible structure:

components/metafields/
├── ShopifyMetafieldPickerForm.tsx
├── ShopifyMetafieldSearch.tsx
├── ShopifyMetafieldSearchResults.tsx
├── ShopifyMetafieldFields.tsx
├── ShopifyMetafieldField.tsx
├── ShopifyMetafieldInputResolver.tsx
├── ShopifyMetafieldUnsupportedField.tsx
└── inputs/
├── ShopifyMetafieldTextInput.tsx
├── ShopifyMetafieldChoiceInput.tsx
└── ShopifyMetafieldUrlInput.tsx

`ShopifyMetafieldChoiceInput.tsx` is a package-specific adapter around the existing shared primitive:

frontend/packages/ui/src/components/primitives/input/SearchableSelectInput.tsx

It is responsible for:

- Parsing the metafield `choices` validation.
- Mapping each string choice into a `SearchableSelectOption`.
- Passing `forceSelection={true}`.
- Converting `SearchableSelectResult` into the metafield string value.
- Forwarding disabled and invalid state where required.

It must not reimplement:

- Popup positioning.
- Local option filtering.
- Keyboard navigation.
- Active-option behavior.
- Selected-option behavior.
- Floating keyboard behavior.
- Option selection.
- Blur and focus reconciliation.

This structure is conceptual.

The parent form should gather and orchestrate.

Individual fields and behaviors should remain independently scalable.

Avoid implementing the entire capability in one large component.

⸻

36. Controller Boundary

Create an explicit controller or hook for orchestration.

Suggested name:

useShopifyMetafieldPickerController

Possible responsibilities:

- Normalize selected integration IDs.
- Determine whether shop labels should be visible.
- Manage category versus search mode.
- Debounce search input.
- Load category preferences.
- Load search results.
- Normalize shop display metadata.
- Maintain active definitions.
- Maintain field values.
- Track pending preferences.
- Reconcile successful creation.
- Handle shop-selection changes.
- Handle category changes.
- Expose loading and error states.

The presentational component should not contain all network and orchestration behavior directly.

⸻

37. Loading States

Distinguish between:

loading saved category preferences

and:

searching metafield definitions

Category loading must not look like an active user search.

Search loading must not remove already active fields.

Recommended behavior:

- Keep active fields rendered.
- Show a compact search-loading state near search results.
- Show an initial skeleton only when no category fields have been resolved.
- Do not replace filled fields with a loading state.

⸻

38. Error States

The component must handle:

- Category preference query failure.
- Search query failure.
- Preference creation failure.
- Invalid shop integration.
- Invalid item category.
- Shopify upstream failure.
- Unsupported metafield type.
- Unavailable saved definitions.

Errors should remain scoped to the failed operation.

Examples:

search failure
→ display near search results
category preload failure
→ display in the metafield body
preference creation failure
→ preserve pending candidates and allow retry

Do not clear valid field values because a search or preference request failed.

⸻

39. Empty States

Define distinct empty states.

No saved preferences

No preferred metafields have been saved for this category.
Search to add a metafield.

No search results

No matching metafields were found.

No selected shops

Select at least one Shopify shop to load metafields.

No item category

When no category is available:

- Live search may still work.
- Category preference loading is disabled.
- Preference creation is disabled.
- The UI must not imply that new selections will be remembered for a category.

⸻

40. Architectural Boundaries

The implementation must preserve these boundaries:

API layer
→ executes backend contracts
query and mutation hooks
→ manage server state
controller
→ coordinates query modes, field state, and pending preferences
metafield component
→ renders search and active fields
input resolver
→ selects the correct input component
field component
→ manages type-specific interaction
parent form
→ owns final submission and preference-persistence timing
Zustand pending store
→ temporarily tracks unsaved preference candidates

Do not place all responsibilities inside ShopifyProductSyncForm.

⸻

41. Non-Goals

This intention does not include:

- Creating Shopify metafield definitions.
- Editing Shopify metafield definitions.
- Deleting Shopify metafield definitions.
- Repairing unavailable preferences.
- Persisting live Shopify definition characteristics locally.
- Supporting every Shopify metafield type.
- Building product-reference pickers.
- Building collection-reference pickers.
- Building file or metaobject pickers.
- Supporting list metafields.
- Adding backend pagination to the current search response.
- Changing Shopify Admin’s metafield presentation.
- Creating a preference-management settings page.
- Persisting preferences before a valid value exists.
- Replacing or duplicating the existing `SearchableSelectInput` primitive.
- Adding metafield-specific behavior to `SearchableSelectInput`.

⸻

42. Required Clarifications Before Implementation Planning Is Final

Clarification 1: Dynamic product-processing payload

What exact request shape does the existing backend products/process endpoint require for dynamic metafields?

Confirm:

- Whether metafields are scoped per product or per target shop.
- Whether different shops can receive different metafield definitions.
- Whether the backend accepts definition IDs.
- Whether namespace and key are required.
- Whether type is required.
- Whether values must already be serialized.
- Whether the current dict[str, object] request field is sufficient.

This clarification may require a backend contract change.

Clarification 2: Item category ID source

The current provider exposes:

productCategory

The preference routes require:

item_category_id

Confirm which existing item or provider field supplies the internal item-category client ID.

Do not pass a category name or Shopify product type where an internal ID is required.

Clarification 3: Preference creation trigger

Confirm when the parent persists pending preferences:

- After successful product processing.
- Before product processing.
- When leaving the metafield step.
- Through an explicit action.
- Through another lifecycle event.

The metafield component must not decide this.

Clarification 4: Form state ownership

Confirm whether dynamic metafield values are authoritative in:

- react-hook-form.
- The metafield controller.
- Another shared form-state mechanism.

There must be one authoritative value source.

Clarification 5: Equivalent metafields across shops

The visual rule is already resolved:

one selected shop
→ no shop label
multiple selected shops
→ visibly identify the owning shop

The remaining question is whether equivalent definitions across shops should:

- Render as separate shop-specific fields.
- Or share one compatible input with fan-out behavior.

The safer initial design is one field per shop-specific definition because definition IDs, validations, and types may differ.

A shared field requires explicit compatibility rules.

Clarification 6: Removing active fields

Confirm whether the user may remove:

- Newly selected search-result fields.
- Saved preference fields.
- Both.

Removing a field from the current product form is not the same as deleting its saved preference.

No delete-preference route is currently part of this contract.

⸻

43. Required Tests

Numbering in this section is provisional. The implementation plan should normalize it into one continuous sequence without changing the grouping or test meaning.

Query Mode

1. Category mode runs with selected shops, an item category, and no valid search.
2. Search mode runs when the debounced query has more than three characters.
3. Category mode is disabled while search mode is active.
4. Search mode is disabled when search is cleared.
5. Search is debounced by 300 milliseconds.
6. Queries do not run without selected shops.
7. Category queries do not run without an item category.
8. Stale category responses do not overwrite a newer category.
9. Stale search responses do not overwrite a newer search.

Multi-Shop Behavior

10. All selected integration IDs are passed to the query.
11. Results remain grouped by shop.
12. Equivalent-looking definitions from different shops remain distinct.
13. Deselecting a shop removes its active and pending fields.
14. Requested shop order is preserved.
15. Raw shop domains are never sent.
16. With one selected shop, active fields do not render shop labels.
17. With one selected shop, search results do not render shop labels.
18. With multiple selected shops, every active field identifies its shop.
19. With multiple selected shops, every search result identifies its shop or appears in a labeled shop group.
20. Identical names from different shops remain visually distinguishable.
21. Hiding the shop label does not remove shop_integration_id.
22. Changing from one shop to multiple shops reveals labels without recreating values.
23. Changing from multiple shops to one hides labels without losing values.

Search

24. Search results render from shops[].search_results.
25. Selecting a search result adds one active field.
26. Selecting the same shop-specific definition twice does not duplicate it.
27. Equivalent definitions from different shops create separate fields.
28. Clearing search preserves selected active fields.
29. Search errors do not clear active values.
30. Queries with three or fewer characters do not call the backend.

Saved Preferences

31. Category preferences render from metafield_preferences.
32. Preferences render in sequence_order.
33. Saved preferences do not enter the pending store.
34. created_by remains available in normalized preference data.
35. Unavailable IDs produce visible shop-specific feedback.
36. No saved preferences renders the correct empty state.

Input Resolver

37. single_line_text_field without choices renders TextInput.
38. `single_line_text_field` with valid choices renders `SearchableSelectInput`.
39. Choice strings are mapped to options whose `value` and `displayValue` equal the original choice.
40. Choice-based metafields pass `forceSelection={true}` to `SearchableSelectInput`.
41. Selecting an option stores the selected option value as the metafield value.
42. Clearing the searchable select clears the metafield value.
43. A `text` result from `SearchableSelectInput` is not accepted for a predefined-choice metafield.
44. The metafield adapter does not duplicate filtering, popup, keyboard, or selection logic.

45. Malformed choices fall back safely.
46. url renders the URL input.
47. Unsupported types render the unsupported component.
48. The resolver performs no API calls.
49. The resolver does not persist preferences.

Pending Preferences

44. A valid filled search-result field enters the pending store.
45. Selecting without filling does not create a pending candidate.
46. Invalid values do not create pending candidates.
47. Saved preferences never enter the pending store.
48. Pending candidates are deduplicated.
49. Clearing a pending field removes its candidate.
50. Changing category clears previous-category candidates.
51. Deselecting a shop clears that shop’s candidates.
52. Successful creation removes matching candidates.
53. Failed creation preserves candidates.

Preference Creation

54. The parent skips the create mutation when no pending candidates exist.
55. One batch request may contain candidates from multiple shops.
56. Several definitions for one shop are allowed.
57. Exact duplicate shop-and-definition pairs are removed.
58. The item category ID is required.
59. Successful responses convert unsaved fields into saved preferences.
60. Atomic backend failure does not mark any candidate as saved.

Form Integration

61. Hardcoded dimension fields are removed.
62. Dimension-specific default values are removed.
63. Dimension-specific schema fields are removed.
64. Dimension-specific filled-state logic is removed.
65. A valid dynamic metafield makes the form count as filled.
66. An unfilled saved preference does not make the form count as filled.
67. An unfilled search selection does not make the form count as filled.
68. Unsupported fields do not make the form count as filled.
69. Final metafield submission follows the confirmed backend contract.

⸻

44. Acceptance Criteria

Numbering in this section is provisional. The implementation plan should normalize it into one continuous sequence while preserving the order and meaning.

The capability is complete when:

1. Hardcoded dimension fields and dimension-specific submission logic are removed.
2. ShopifyProductSyncForm renders the new metafield component.
3. The component accepts one or more Shopify integration client IDs.
4. The component can preload saved preferences for an internal item category.
5. The component can search live metafield definitions by visible name.
6. Category and search modes are mutually exclusive.
7. Search begins only after more than three characters and uses a 300 ms debounce.
8. Results remain grouped and identified per shop.
9. With one selected shop, fields and search results do not render redundant shop labels.
10. With multiple selected shops, every field and search result visibly identifies its shop.
11. Shop-label visibility affects presentation only.
12. All underlying identities, values, preferences, and requests remain scoped by shop_integration_id.
13. Saved preferences and unsaved search results remain distinct.
14. Search results can be added as active fields.
15. The resolver supports single_line_text_field and url.
16. Choice-based single-line fields use the existing `SearchableSelectInput` from `@beyo/ui` through a metafield-specific adapter.
17. The metafield implementation does not duplicate searchable-select filtering, popup, keyboard, focus, or selection behavior.
18. Predefined-choice metafields enforce selection from the supplied choices through `forceSelection={true}`.
19. The metafield adapter converts selected option results into the final string value without introducing metafield behavior into the shared primitive.
20. Unsupported types render explicit unsupported presentation.
21. Valid filled unsaved fields become pending preference candidates.
22. Saved preferences do not become pending candidates.
23. The parent controls when pending preferences are persisted.
24. Empty pending sets do not trigger creation.
25. Preference creation uses one atomic multi-shop request.
26. Successful creation reconciles active fields and pending state.
27. Unavailable saved definitions receive visible shop-specific feedback.
28. Dynamic metafield values participate in form-filled logic.
29. Dynamic metafield values are submitted using a confirmed backend contract.
30. Shop-selection changes preserve values for remaining shops.
31. Changing between single-shop and multi-shop presentation does not recreate field state.
32. API, server state, controller, presentation, resolver, field, pending store, and parent orchestration responsibilities remain separated.

## Implementation tracking

| Implementation plan | Status | Summary |
|---|---|---|
| `docs/architecture/archives/implementation/PLAN_restructure_metafields_form_20260713.md` | archived | `docs/architecture/implemented_summaries/SUMMARY_restructure_metafields_form_20260713.md` |

- `2026-07-13T11:22:14Z`: Frontend implementation completed and archived. The current products/process route remains key-to-scalar and assigns its legacy metafield type; a backend extension is still needed for definition-ID, namespace, and URL-type fidelity.
