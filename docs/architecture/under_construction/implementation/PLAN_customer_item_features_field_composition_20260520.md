# PLAN_customer_item_features_field_composition_20260520

## Metadata

- Plan ID: `PLAN_customer_item_features_field_composition_20260520`
- Status: `under_construction`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-20T00:00:00Z`
- Last updated at (UTC): `2026-05-20T00:00:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/primitives.md` (field system section)

## Goal and intent

- Goal: Build two complete feature verticals — `customer` and `item` — following the full `16_feature_workflow.md` build order, and establish the **domain-owned modular field composition architecture**: a pattern where each feature owns RHF-aware field components that use `useFormContext()` and bind their own field paths, so forms become thin orchestration containers that compose independent field groups.
- Business/user intent: This is the foundational composition layer for all future form surfaces in the app. Getting the field ownership and schema composition patterns right now prevents monolithic form files, duplicate label/validation logic, and untestable field components later.
- Non-goals: Form surfaces themselves (create/edit drawers or pages for customer and item) — those are future plans that will *consume* the field components built here. API integration with a live backend — the API layer is scaffolded to the correct contract shape but not yet connected to real endpoints. Authentication or permission guards on these features.

## Scope

- In scope:
  - `src/features/customer/` — full vertical: types, api/, actions/, controllers/, providers/, components/, components/fields/, index.ts
  - `src/features/item/` — full vertical: types, api/, actions/, controllers/, providers/, components/, components/fields/, index.ts
  - Field composition pattern definition: `useFormContext()` binding, namespaced field paths (`customer.*`, `item.*`), schema export conventions
  - Schema composition exports: `CustomerFieldsSchema`, `ItemDetailsFieldsSchema` — for use in composed form schemas
- Out of scope:
  - Form surfaces (create/edit drawers, form pages) — future plan
  - Cross-feature composed form schemas — future plan (those live in the feature that owns the form, not here)
  - Upholstery and task detail fields — noted in intention, deferred; no planning tables exist for those domains
  - Real backend API endpoint contracts — API layer is stubbed with correct shape; field names used are from the intention document (see Clarifications)
- Assumptions:
  - Input primitives (`TextInput`, `TextArea`, `SwitchCheckbox`) from `PLAN_input_primitives_20260520` are implemented and available at `@/components/primitives`
  - Design tokens (`--color-destructive`, `--color-border`, `--color-input`) from the primitives plan are in `src/index.css`
  - `react-hook-form`, `@hookform/resolvers`, `zod` are already installed

## Clarifications required

- [ ] **No planning tables exist for `customer` or `item` domains.** The field names used in this plan come directly from the intention document. Before Codex implements, the user must confirm: are these the final, backend-aligned field names (`primary_email`, `primary_phone_number`, `secondary_phone_number`, `secondary_email`, `address`, `designer`, `quantity`, `position`, `article_number`)? If the backend uses different names (e.g., `phone` instead of `primary_phone_number`), the `types.ts` schemas must be updated before the API layer is wired.
- [ ] **Customer `address` shape**: Is `address` a single free-text string field, or will it be split into sub-fields (`street`, `city`, `postal_code`, `country`) in a future iteration? This plan treats it as a single string — confirm before implementation.
- [ ] **Item `position`**: Is this a free-text string (e.g., "Top-left corner") or an enum/select? This plan treats it as a free-text string — confirm if it is an enum.

## Acceptance criteria

1. `npm run typecheck` passes with zero TypeScript errors after full implementation
2. Both `src/features/customer/index.ts` and `src/features/item/index.ts` export their providers, context hooks, view components, field components, and schema types
3. `CustomerEmailField` renders correctly inside a `<FormProvider>` with a schema containing `customer.primary_email`
4. Spreading `{...register('customer.primary_email')}` results in a TypeScript error — confirming that field components do NOT accept register props
5. `CustomerFieldsSchema` and `ItemDetailsFieldsSchema` can be embedded inside a composed `z.object({ customer: CustomerFieldsSchema, item: ItemDetailsFieldsSchema })` without type errors
6. All field components read errors through `useFormContext()` — no error prop on any field component
7. No feature component imports from `api/`, `actions/`, or `controllers/` directly

---

## Contracts and skills

### Contracts loaded

Core always-include (per `frontend_contract_goal_mapping_guide.md`):
- `architecture/01_architecture.md`: dependency rules — feature imports through `index.ts` only, no circular cross-feature imports
- `architecture/02_types.md`: Zod schema conventions — `z.infer`, branded ID types, snake_case field names
- `architecture/04_api_client.md`: API layer — `apiClient.get/post/patch/delete`, Zod parse at the boundary
- `architecture/05_server_state.md`: TanStack Query — query key factories, `useQuery`, `useMutation`
- `architecture/08_hooks.md`: Action and controller patterns — optimistic lifecycle, `ReturnType<>` exported type
- `architecture/13_errors.md`: Error handling — `ApiRequestError`, `validation_failed` mapping
- `architecture/15_feature_structure.md`: Feature folder layout — exact subfolder responsibilities and `index.ts` boundary

New feature bundle:
- `architecture/16_feature_workflow.md`: Build order — Types → API → Actions → Controllers → Providers → Components → Pages → Routes → `index.ts`
- `architecture/07_components.md`: Component rules — named exports, no default exports, `forwardRef`, `cva`, `cn()`, one component per file
- `architecture/09_forms.md`: RHF contract — `useForm`, `FormProvider`, `useFormContext`, `zodResolver`, `Controller`, error mapping
- `architecture/10_pages.md`: Page structure — thin shell, `RouteErrorBoundary`, `Suspense`, provider wrapping
- `architecture/14_styling.md`: Tailwind-only, `cva`, `cn()`, design tokens
- `architecture/23_providers.md`: Provider pattern — `createContext(null)`, provider component + consumer hook, placement in pages
- `architecture/24_dto.md`: DTO categories — Response, Request, QueryParams, ViewModel; `client_id` convention; transformation pipeline

### Local extensions loaded

- `architecture/01_architecture_local.md`: `route-entry.tsx` pattern — applies to top-level tab features only; customer and item are domain features mounted inside surfaces/drawers, not primary tab routes. This local extension does NOT apply here.

### File read intent — pattern vs. relational

Permitted relational reads:
- `src/features/tasks/types.ts` — to see existing feature type conventions (existing behavior)
- `src/features/tasks/index.ts` — to verify existing public API shape (existing behavior)
- `src/components/primitives/index.ts` — to verify which primitives are available to import (existing behavior)
- `src/lib/routes.ts` — to verify ROUTES shape before adding new paths (existing behavior)

Prohibited pattern reads (contract already covers):
- Any other action hook to understand `onMutate/onError/onSuccess` lifecycle → `08_hooks.md`
- Any other provider to understand context shell → `23_providers.md`
- Any other query hook to understand TanStack Query setup → `05_server_state.md`
- Any other `types.ts` to understand DTO structure → `24_dto.md`

### Skill selection

- Primary skill: none — standard feature build following `16_feature_workflow.md`

---

## Field Composition Architecture (new pattern — read this first)

This section defines the modular RHF field architecture that both feature verticals implement. Read it in full before writing any field component.

### The problem with monolithic forms

A monolithic form places all field rendering, all label text, all placeholder logic, and all error display into a single form component. When a customer's fields appear across multiple surfaces (create-customer drawer, task creation form, inline edit panel), all that logic must be duplicated or awkwardly extracted into render props. This plan eliminates that.

### The solution: domain-owned field modules

Each feature owns its field components in `features/<entity>/components/fields/`. These components:

1. Use `useFormContext()` to read the active form's RHF instance
2. Bind their own canonical field path (e.g., `customer.primary_email`)
3. Own their label, placeholder, autocomplete, and error display
4. Render a primitive input (`TextInput`, `TextArea`, `SwitchCheckbox`)
5. Know nothing about submission, mutations, or the surrounding form's schema

### The `FormProvider` contract

The parent form is the only place where `useForm()` is called. It wraps field groups with `<FormProvider>`:

```tsx
// EXAMPLE — not built in this plan, shown for architectural clarity
function CreateTaskForm() {
  const form = useForm<CreateTaskInput>({ resolver: zodResolver(CreateTaskInputSchema) });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CustomerFieldGroup />      {/* from @/features/customer */}
        <ItemDetailsFieldGroup />   {/* from @/features/item */}
        <TaskDetailsFieldGroup />   {/* from @/features/tasks */}
      </form>
    </FormProvider>
  );
}
```

The schema must declare the same namespaced paths that the field components bind to:

```ts
const CreateTaskInputSchema = z.object({
  client_id: z.string().uuid(),
  customer: CustomerFieldsSchema,       // from @/features/customer
  item: ItemDetailsFieldsSchema,        // from @/features/item
});
```

### Field component anatomy

Every field component follows this structure:

```tsx
// features/customer/components/fields/CustomerEmailField.tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function CustomerEmailField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as Record<string, unknown>).customer?.primary_email?.message as string | undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="customer-primary-email" className="text-sm font-medium text-foreground">
        Email
      </label>
      <TextInput
        id="customer-primary-email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="email@example.com"
        invalid={Boolean(error)}
        {...register('customer.primary_email')}
      />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
```

**Rules for field components:**
- `useFormContext()` is the only hook call — no `useState`, no business hooks
- The field path is hardcoded in the component — never passed as a prop
- No `register` or `errors` props on the component type
- Error is read through `useFormContext().formState.errors` using the field's own path
- The error display uses `role="alert"` for screen reader accessibility
- The `<label>` uses a stable `htmlFor` matching the input's `id`
- Imports only from `@/components/primitives` (for the input) and `react-hook-form` (for context)

### Schema composition exports

Field schemas are exported from each feature's `types.ts` as standalone Zod objects. These are **not** the full entity Request DTO — they are the subset of fields that field components bind to:

```ts
// features/customer/types.ts
export const CustomerFieldsSchema = z.object({
  primary_email:        z.string().email('Enter a valid email.'),
  secondary_email:      z.string().email('Enter a valid email.').optional().or(z.literal('')),
  primary_phone_number: z.string().min(1, 'Phone number is required.'),
  secondary_phone_number: z.string().optional(),
  address:              z.string().min(1, 'Address is required.'),
});
export type CustomerFields = z.infer<typeof CustomerFieldsSchema>;
```

```ts
// features/item/types.ts
export const ItemDetailsFieldsSchema = z.object({
  designer:       z.string().min(1, 'Designer is required.'),
  quantity:       z.number({ invalid_type_error: 'Enter a number.' }).int().positive('Quantity must be at least 1.'),
  position:       z.string().optional(),
  article_number: z.string().optional(),
});
export type ItemDetailsFields = z.infer<typeof ItemDetailsFieldsSchema>;
```

Both schemas are exported from their feature's `index.ts` so forms in other features can compose them.

### Field group components

Field groups are layout-only components that compose multiple field components into a logical section:

```tsx
// features/customer/components/CustomerFieldGroup.tsx
export function CustomerFieldGroup() {
  return (
    <div className="flex flex-col gap-4">
      <CustomerEmailField />
      <CustomerPhoneField />
      <CustomerAddressField />
    </div>
  );
}
```

Field groups do NOT use `useFormContext()` — they are pure layout components. They are not RHF-aware themselves; their children are.

### Why this separation matters

| Layer | RHF-aware? | Imports from |
|---|---|---|
| Primitive (`TextInput`) | No | Nothing RHF-related |
| Field component (`CustomerEmailField`) | Yes — `useFormContext()` | `primitives/`, `react-hook-form` |
| Field group (`CustomerFieldGroup`) | No — pure layout | Feature field components only |
| Form controller | Yes — `useForm()`, `FormProvider` | Field groups, actions, schemas |

Testing a primitive requires no form context. Testing a field component requires a `FormProvider` wrapper. Testing a form controller requires mocked actions. Each layer has a clear, isolated test surface.

---

## Implementation plan

Follow both features in parallel using the same build order from `16_feature_workflow.md`.

---

### Part A — Customer Feature Vertical

#### A1 — `src/features/customer/types.ts`

Define four sections in the fixed DTO order:

**Section 1 — Response DTO:**

```ts
export const CustomerSchema = z.object({
  id:                     z.string().uuid().transform((v) => v as CustomerId),
  primary_email:          z.string().email(),
  secondary_email:        z.string().email().nullable(),
  primary_phone_number:   z.string(),
  secondary_phone_number: z.string().nullable(),
  address:                z.string(),
  created_at:             z.string().datetime({ offset: true }),
  updated_at:             z.string().datetime({ offset: true }),
});
export type Customer = z.infer<typeof CustomerSchema>;
```

**Section 2 — Request DTOs:**

```ts
export const CreateCustomerInputSchema = z.object({
  client_id:              z.string().uuid(),
  primary_email:          z.string().email('Enter a valid email.'),
  secondary_email:        z.string().email('Enter a valid email.').optional().or(z.literal('')),
  primary_phone_number:   z.string().min(1, 'Phone number is required.'),
  secondary_phone_number: z.string().optional(),
  address:                z.string().min(1, 'Address is required.'),
});
export type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;

export const UpdateCustomerInputSchema = z.object({
  id:                     z.string().uuid().transform((v) => v as CustomerId),
  primary_email:          z.string().email('Enter a valid email.').optional(),
  secondary_email:        z.string().email('Enter a valid email.').optional().or(z.literal('')),
  primary_phone_number:   z.string().min(1).optional(),
  secondary_phone_number: z.string().optional(),
  address:                z.string().min(1).optional(),
});
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerInputSchema>;
```

**Section 3 — Query Params DTO:**

```ts
export type ListCustomersParams = {
  page?:    number;
  per_page?: number;
  search?:  string;
};
```

**Section 4 — View Model:**

```ts
export type CustomerViewModel = Customer & {
  display_name: string;      // primary_email (truncated for display)
  has_secondary_contact: boolean;
};

export function toCustomerViewModel(customer: Customer): CustomerViewModel {
  return {
    ...customer,
    display_name: customer.primary_email,
    has_secondary_contact:
      Boolean(customer.secondary_email) || Boolean(customer.secondary_phone_number),
  };
}
```

**Field composition schema (exported for schema composition):**

```ts
export const CustomerFieldsSchema = z.object({
  primary_email:          z.string().email('Enter a valid email.'),
  secondary_email:        z.string().email('Enter a valid email.').optional().or(z.literal('')),
  primary_phone_number:   z.string().min(1, 'Phone number is required.'),
  secondary_phone_number: z.string().optional(),
  address:                z.string().min(1, 'Address is required.'),
});
export type CustomerFields = z.infer<typeof CustomerFieldsSchema>;
```

**Branded ID type**: Add `CustomerId` to `src/types/common.ts` (or create that file if it does not exist) following the existing branded type pattern:

```ts
// src/types/common.ts
export type CustomerId = string & { readonly __brand: 'CustomerId' };
```

---

#### A2 — `src/features/customer/api/customer-keys.ts`

```ts
import type { CustomerId } from '@/types/common';
import type { ListCustomersParams } from '../types';

export const customerKeys = {
  all:     ['customers'] as const,
  lists:   () => [...customerKeys.all, 'list'] as const,
  list:    (params: ListCustomersParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail:  (id: CustomerId) => [...customerKeys.details(), id] as const,
};
```

---

#### A3 — `src/features/customer/api/` — fetch functions and query hooks

Files to create:

- `fetch-customers.ts` — `fetchCustomers(params: ListCustomersParams): Promise<{ items: Customer[]; total: number }>`
- `fetch-customer.ts` — `fetchCustomer(id: CustomerId): Promise<Customer>`
- `create-customer.ts` — `createCustomer(input: CreateCustomerInput): Promise<Customer>`
- `update-customer.ts` — `updateCustomer(input: UpdateCustomerInput): Promise<Customer>`
- `delete-customer.ts` — `deleteCustomer(id: CustomerId): Promise<void>`
- `use-customers.ts` — `useCustomersQuery(params)` → TanStack Query hook
- `use-customer.ts` — `useCustomerQuery(id)` → TanStack Query hook

All fetch functions parse responses through the Zod schema at the boundary (per `04_api_client.md`).

---

#### A4 — `src/features/customer/actions/`

Files to create:

- `use-create-customer.ts` — `useCreateCustomer()` with optimistic cache insert + rollback + `onSettled` invalidation
- `use-update-customer.ts` — `useUpdateCustomer()` with optimistic cache patch + rollback
- `use-delete-customer.ts` — `useDeleteCustomer()` with optimistic cache removal + rollback

Each action hook returns: `{ <verb>Customer: mutation.mutate, <verb>CustomerAsync: mutation.mutateAsync, isPending: mutation.isPending, error: mutation.error }`.

Export `type Create/Update/DeleteCustomerReturn = ReturnType<typeof use...>` from each file.

---

#### A5 — `src/features/customer/controllers/`

**`use-customer-list.controller.ts`:**

Aggregates:
- `useCustomersQuery` + `toCustomerViewModel` mapping
- `useCreateCustomer`, `useDeleteCustomer`
- Filter state (inline — no separate filter hook needed at this scale)
- `isPending`, `isError`, `total`, `page`, `setPage`, `search`, `setSearch`

Exports `type CustomerListController = ReturnType<typeof useCustomerListController>`.

**`use-customer-detail.controller.ts`:**

Accepts `customerId: CustomerId`. Aggregates:
- `useCustomerQuery(customerId)` + `toCustomerViewModel`
- `useUpdateCustomer`, `useDeleteCustomer`
- `isPending`, `isError`

Exports `type CustomerDetailController = ReturnType<typeof useCustomerDetailController>`.

---

#### A6 — `src/features/customer/providers/`

**`CustomerListProvider.tsx`:**
- Context: `createContext<CustomerListController | null>(null)`
- Provider: calls `useCustomerListController()`, injects result
- Consumer hook: `useCustomerListContext()` — throws if used outside provider
- Exports: provider component + consumer hook only (not the context object)

**`CustomerDetailProvider.tsx`:**
- Props: `{ customerId: CustomerId; children: React.ReactNode }`
- Same structure as list provider but wraps `useCustomerDetailController(customerId)`
- Consumer hook: `useCustomerDetailContext()`

---

#### A7 — `src/features/customer/components/`

Layout and display components (leaf → section → view build order):

- `CustomerListView.tsx` — top-level layout: search bar + list + pagination
- `CustomerListItem.tsx` — single row/card in the list (receives `customer: CustomerViewModel` as prop — leaf item pattern)
- `CustomerDetailView.tsx` — top-level detail layout

All components consume context via `useCustomerListContext()` or `useCustomerDetailContext()`. No direct imports from `api/`, `actions/`, or `controllers/`.

---

#### A8 — `src/features/customer/components/fields/`

The field components follow the anatomy defined in the Field Composition Architecture section above.

**Files to create:**

`CustomerEmailField.tsx`
- Field path: `customer.primary_email`
- Input type: `email`, `autoComplete="email"`, `inputMode="email"`
- Label: "Email"

`CustomerSecondaryEmailField.tsx`
- Field path: `customer.secondary_email`
- Input type: `email`, `autoComplete="email"`, `inputMode="email"`
- Label: "Secondary email" with an optional indicator

`CustomerPhoneField.tsx`
- Field path: `customer.primary_phone_number`
- Input type: `tel`, `autoComplete="tel"`, `inputMode="tel"`
- Label: "Phone"

`CustomerSecondaryPhoneField.tsx`
- Field path: `customer.secondary_phone_number`
- Input type: `tel`, `autoComplete="tel"`, `inputMode="tel"`
- Label: "Secondary phone" with an optional indicator

`CustomerAddressField.tsx`
- Field path: `customer.address`
- Uses `TextArea` primitive (not `TextInput`), `rows={3}`, `resize="none"`
- `autoComplete="street-address"`
- Label: "Address"

`CustomerFieldGroup.tsx`
- Pure layout — composes the five field components above in order
- No `useFormContext()` — this is a layout-only component

**Error access pattern** — all field components access nested errors as follows:

```ts
const { register, formState: { errors } } = useFormContext();
// Typed access for namespaced errors:
const customerErrors = (errors as { customer?: Record<string, { message?: string }> }).customer;
const error = customerErrors?.primary_email?.message;
```

---

#### A9 — `src/features/customer/index.ts`

```ts
// Providers
export { CustomerListProvider, useCustomerListContext } from './providers/CustomerListProvider';
export { CustomerDetailProvider, useCustomerDetailContext } from './providers/CustomerDetailProvider';

// View components (used by pages/surfaces)
export { CustomerListView } from './components/CustomerListView';
export { CustomerDetailView } from './components/CustomerDetailView';

// Field components (used by form compositions in other features)
export { CustomerEmailField } from './components/fields/CustomerEmailField';
export { CustomerSecondaryEmailField } from './components/fields/CustomerSecondaryEmailField';
export { CustomerPhoneField } from './components/fields/CustomerPhoneField';
export { CustomerSecondaryPhoneField } from './components/fields/CustomerSecondaryPhoneField';
export { CustomerAddressField } from './components/fields/CustomerAddressField';
export { CustomerFieldGroup } from './components/CustomerFieldGroup';

// Schema (used by composed form schemas in other features)
export { CustomerFieldsSchema } from './types';
export type { CustomerFields, Customer, CustomerViewModel, CreateCustomerInput, UpdateCustomerInput } from './types';
export type { CustomerId } from '@/types/common';
```

---

### Part B — Item Feature Vertical

Item follows exactly the same build order as Customer. The differences are in the entity shape and field set.

---

#### B1 — `src/features/item/types.ts`

**Section 1 — Response DTO:**

```ts
export const ItemSchema = z.object({
  id:             z.string().uuid().transform((v) => v as ItemId),
  designer:       z.string(),
  quantity:       z.number().int().positive(),
  position:       z.string().nullable(),
  article_number: z.string().nullable(),
  created_at:     z.string().datetime({ offset: true }),
  updated_at:     z.string().datetime({ offset: true }),
});
export type Item = z.infer<typeof ItemSchema>;
```

**Section 2 — Request DTOs:**

```ts
export const CreateItemInputSchema = z.object({
  client_id:      z.string().uuid(),
  designer:       z.string().min(1, 'Designer is required.'),
  quantity:       z.number({ invalid_type_error: 'Enter a number.' }).int().positive('Quantity must be at least 1.'),
  position:       z.string().optional(),
  article_number: z.string().optional(),
});
export type CreateItemInput = z.infer<typeof CreateItemInputSchema>;

export const UpdateItemInputSchema = z.object({
  id:             z.string().uuid().transform((v) => v as ItemId),
  designer:       z.string().min(1).optional(),
  quantity:       z.number().int().positive().optional(),
  position:       z.string().optional(),
  article_number: z.string().optional(),
});
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>;
```

**Section 3 — Query Params DTO:**

```ts
export type ListItemsParams = {
  page?:     number;
  per_page?: number;
  search?:   string;
};
```

**Section 4 — View Model:**

```ts
export type ItemViewModel = Item & {
  quantity_label:  string;    // "3 pieces"
  has_position:    boolean;
  has_article_number: boolean;
};

export function toItemViewModel(item: Item): ItemViewModel {
  return {
    ...item,
    quantity_label: `${item.quantity} ${item.quantity === 1 ? 'piece' : 'pieces'}`,
    has_position: Boolean(item.position),
    has_article_number: Boolean(item.article_number),
  };
}
```

**Field composition schema:**

```ts
export const ItemDetailsFieldsSchema = z.object({
  designer:       z.string().min(1, 'Designer is required.'),
  quantity:       z.number({ invalid_type_error: 'Enter a number.' }).int().positive('Quantity must be at least 1.'),
  position:       z.string().optional(),
  article_number: z.string().optional(),
});
export type ItemDetailsFields = z.infer<typeof ItemDetailsFieldsSchema>;
```

**Branded ID type**: Add `ItemId` to `src/types/common.ts`.

---

#### B2 — `src/features/item/api/item-keys.ts`

Same pattern as `customerKeys` — all, lists, list(params), details, detail(id).

---

#### B3–B6 — Item API / Actions / Controllers / Providers

Follow the same structure as Parts A3–A6, substituting `item`/`Item`/`ItemId` throughout:

- `api/fetch-items.ts`, `api/fetch-item.ts`, `api/create-item.ts`, `api/update-item.ts`, `api/delete-item.ts`
- `api/use-items.ts`, `api/use-item.ts`
- `actions/use-create-item.ts`, `actions/use-update-item.ts`, `actions/use-delete-item.ts`
- `controllers/use-item-list.controller.ts`, `controllers/use-item-detail.controller.ts`
- `providers/ItemListProvider.tsx`, `providers/ItemDetailProvider.tsx`

---

#### B7 — `src/features/item/components/`

- `ItemListView.tsx` — top-level list layout
- `ItemListItem.tsx` — single item card (receives `item: ItemViewModel` as prop)
- `ItemDetailView.tsx` — top-level detail layout

---

#### B8 — `src/features/item/components/fields/`

**Files to create:**

`ItemDesignerField.tsx`
- Field path: `item.designer`
- Input type: `text`
- Label: "Designer"

`ItemQuantityField.tsx`
- Field path: `item.quantity`
- Input type: `text`, `inputMode="numeric"`, pattern: `[0-9]*`
- Uses `register('item.quantity', { valueAsNumber: true })` — RHF coerces the string to number
- Label: "Quantity"
- Note: `valueAsNumber: true` is passed inside `register()` at the field component level, not at the schema level

`ItemPositionField.tsx`
- Field path: `item.position`
- Input type: `text`
- Label: "Position" with an optional indicator

`ItemArticleNumberField.tsx`
- Field path: `item.article_number`
- Input type: `text`
- `autoCapitalize="characters"` for article codes
- Label: "Article number" with an optional indicator

`ItemDetailsFieldGroup.tsx`
- Pure layout — composes the four field components above
- No `useFormContext()` calls

**`valueAsNumber` for `ItemQuantityField`:**

The `quantity` field is a `z.number()` in the schema but HTML inputs always return strings. RHF's `register` option `{ valueAsNumber: true }` coerces the native input value to a number before validation. The field component uses it like this:

```tsx
// Inside ItemQuantityField
const { register, formState: { errors } } = useFormContext();
const field = register('item.quantity', { valueAsNumber: true });
// ...
<TextInput
  id="item-quantity"
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  invalid={Boolean(error)}
  {...field}
/>
```

This is the only field that passes options to `register()`. All others use `register('path')` with no options.

---

#### B9 — `src/features/item/index.ts`

```ts
// Providers
export { ItemListProvider, useItemListContext } from './providers/ItemListProvider';
export { ItemDetailProvider, useItemDetailContext } from './providers/ItemDetailProvider';

// View components
export { ItemListView } from './components/ItemListView';
export { ItemDetailView } from './components/ItemDetailView';

// Field components
export { ItemDesignerField } from './components/fields/ItemDesignerField';
export { ItemQuantityField } from './components/fields/ItemQuantityField';
export { ItemPositionField } from './components/fields/ItemPositionField';
export { ItemArticleNumberField } from './components/fields/ItemArticleNumberField';
export { ItemDetailsFieldGroup } from './components/fields/ItemDetailsFieldGroup';

// Schema
export { ItemDetailsFieldsSchema } from './types';
export type { ItemDetailsFields, Item, ItemViewModel, CreateItemInput, UpdateItemInput } from './types';
export type { ItemId } from '@/types/common';
```

---

### Part C — Shared type infrastructure

#### C1 — `src/types/common.ts`

Create (or extend if it already exists):

```ts
// Branded ID types — each feature adds its own here.
// The ID value is always a UUID string; the brand makes accidental cross-assignment a TypeScript error.
export type CustomerId = string & { readonly __brand: 'CustomerId' };
export type ItemId = string & { readonly __brand: 'ItemId' };
```

If `src/types/common.ts` already exists, append only the new branded types. Do not modify existing types.

---

### Part D — Field composition usage example (documentation only — do not implement)

This section documents how a future form surface will use the field components. Codex does NOT implement this — it is included so the field architecture makes sense in context.

```tsx
// FUTURE — not part of this plan
// features/tasks/components/CreateTaskForm.tsx
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CustomerFieldsSchema, CustomerFieldGroup } from '@/features/customer';
import { ItemDetailsFieldsSchema, ItemDetailsFieldGroup } from '@/features/item';

const CreateTaskSchema = z.object({
  client_id: z.string().uuid(),
  customer: CustomerFieldsSchema,
  item: ItemDetailsFieldsSchema,
});
type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export function CreateTaskForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: {
      client_id: crypto.randomUUID(),
      customer: { primary_email: '', primary_phone_number: '', address: '' },
      item: { designer: '', quantity: 1 },
    },
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CustomerFieldGroup />
        <ItemDetailsFieldGroup />
        <button type="submit">Create</button>
      </form>
    </FormProvider>
  );
}
```

The field components (`CustomerEmailField`, `ItemDesignerField`, etc.) do not know they are in a task creation form. They only know their field path and how to render with the form context they find.

---

## Mobile UX strategy for field components

Every field component must follow these mobile-first rules:

**Touch target**: The label + input area combined should reach 44px height minimum. `TextInput` at `size="md"` = 48px tall, satisfying this. Avoid `size="sm"` for form fields — reserve it for compact search bars.

**Keyboard types**: Assign `inputMode` and `type` to minimize keyboard switching on mobile:
- Email fields: `type="email" inputMode="email"` → email keyboard
- Phone fields: `type="tel" inputMode="tel"` → phone pad
- Number fields: `type="text" inputMode="numeric" pattern="[0-9]*"` → numeric keyboard without the `-` and `.` keys that `type="number"` sometimes shows

**Autocomplete**: Use the `autoComplete` attribute on all fields. This allows iOS/Android to prefill from saved contacts and past entries — important for customer fields especially.

**iOS zoom prevention**: `TextInput` already sets `text-base` (16px) on the inner input. No additional action needed.

**Field spacing**: Field groups use `flex flex-col gap-4` between fields. This matches the app's baseline spacing rhythm and gives sufficient touch separation between adjacent fields.

**Error display**: Error messages appear below the input with `text-xs text-destructive`. They must use `role="alert"` so screen readers announce them immediately when they appear.

---

## Risks and mitigations

- Risk: Field path namespace (`customer.*`, `item.*`) conflicts with the parent schema shape if a form doesn't wrap the schema correctly
  Mitigation: The field composition section documents this clearly. When a form doesn't nest its schema under `customer:`, field components will silently not find errors. Document in each field component file with a JSDoc comment: `// Requires parent FormProvider with schema containing customer: CustomerFieldsSchema`

- Risk: `errors.customer?.primary_email?.message` access is not type-safe without knowing the parent form's schema type
  Mitigation: Access errors with a cast: `(errors as Record<string, unknown>).customer?.primary_email?.message` — not ideal but acceptable since field components are intentionally schema-agnostic. A future improvement would be a generic `useFieldError(path: string)` hook.

- Risk: `valueAsNumber: true` in `ItemQuantityField` silently returns `NaN` when the input is empty instead of `undefined`
  Mitigation: The Zod schema uses `z.number({ invalid_type_error: 'Enter a number.' })` which catches `NaN` and returns a user-facing error. The schema must NOT use `.optional()` here unless an empty quantity is intentionally valid.

- Risk: `src/types/common.ts` doesn't exist yet
  Mitigation: Codex must create it as Step C1. Check for existing files before creating. If it already exists with different branded types, append only — never overwrite.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual verification: `CustomerEmailField` used inside a `<FormProvider>` renders without errors and the error message appears when validation fails
- Manual verification: `ItemQuantityField` with an empty string input shows `'Enter a number.'` error (not a silent `NaN` pass)
- Manual verification: `CustomerFieldGroup` renders all five fields with correct labels and input types
- `grep -r "useFormContext" src/features/customer src/features/item` — only appears in `components/fields/` subfolders

---

## Review log

_(empty — awaiting Codex implementation)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David
