# PLAN_customer_item_features_field_composition_20260520

## Metadata

- Plan ID: `PLAN_customer_item_features_field_composition_20260520`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-20T00:00:00Z`
- Last updated at (UTC): `2026-05-20T16:55:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/primitives.md` (field system section)

## Goal and intent

- Goal: Build the **domain-owned modular field composition layer** for the `customers` and `items` features. The type schemas and API key factories are already implemented. This plan adds field composition schema exports to the existing `types.ts` files and builds the full `components/fields/` layer for each feature.
- Business/user intent: These field components are the foundational composition layer for all future form surfaces in the app. The task creation form and other future forms will import and compose these fields without duplicating label text, validation logic, or error display.
- Non-goals: Actions, controllers, providers, and view components (CRUD layers) — deferred to a separate plan. Form surfaces themselves — future plans that will consume the field components built here.

## Scope

- Already implemented (do not rebuild):
  - `src/features/customers/types.ts` — full DTO schemas, view model, transformation functions. See schema details in Implementation Plan.
  - `src/features/customers/api/customer-keys.ts` — query key factory
  - `src/features/items/types.ts` — full DTO schemas, view model, transformation functions
  - `src/features/items/api/item-keys.ts` — query key factory
- In scope:
  - `src/features/customers/types.ts` — **augment** with `CustomerFieldsSchema` + `CustomerFields` export
  - `src/features/customers/components/fields/` — five field components
  - `src/features/customers/components/CustomerAddressFieldGroup.tsx` — RHF-aware address subfields group
  - `src/features/customers/components/CustomerFieldGroup.tsx` — layout-only group
  - `src/features/customers/index.ts` — add field component and schema exports
  - `src/features/items/types.ts` — **augment** with `ItemDetailsFieldsSchema` + `ItemDetailsFields` export
  - `src/features/items/components/fields/` — five field components
  - `src/features/items/components/ItemDetailsFieldGroup.tsx` — layout-only group
  - `src/features/items/index.ts` — add field component and schema exports
- Out of scope:
  - CRUD layers (actions, controllers, providers, view components) — deferred
  - Form surfaces — future plan
  - Address primitive component — `CustomerAddressFieldGroup` uses `TextInput` directly for each sub-field
  - Item pricing and dimension field components (`item_value_minor`, `item_cost_minor`, dimensions) — deferred; requires minor-unit display conversion design

## Clarifications required

All clarifications are resolved:

- [x] **Field names confirmed from actual `types.ts`**: Customer fields: `display_name`, `customer_type`, `primary_email`, `primary_phone_number`, `address`. Item fields: `designer`, `article_number`, `sku`, `quantity`, `item_position`, `item_currency`.
- [x] **Customer `address` shape**: `address` is a structured object — `{ street?, city?, postal_code?, country? } | null` — defined as `AddressSchema` in `src/types/common.ts`. `CustomerAddressFieldGroup` renders four `TextInput` sub-fields.
- [x] **Item position field name**: The backend field is `item_position` (not `position`). Field path in form: `item.item_position`.
- [x] **No `secondary_email` or `secondary_phone_number` on customer**: Confirmed absent from `CustomerSchema` and `CreateCustomerInputSchema`. Do not build those field components.

## Acceptance criteria

1. `npm run typecheck` passes with zero TypeScript errors
2. Both `src/features/customers/index.ts` and `src/features/items/index.ts` export their field components and schema types
3. `CustomerEmailField` renders correctly inside a `<FormProvider>` with a schema containing `customer.primary_email`
4. `CustomerFieldsSchema` and `ItemDetailsFieldsSchema` can be embedded in `z.object({ customer: CustomerFieldsSchema, item: ItemDetailsFieldsSchema })` without type errors
5. All field components read errors through `useFormContext()` — no error prop on any field component
6. No feature component imports from `api/`, `actions/`, or `controllers/` directly
7. `grep -r "useFormContext" src/features/customers src/features/items` — only appears in `components/fields/` and `CustomerAddressFieldGroup.tsx`

---

## Contracts and skills

### Contracts loaded

Core always-include (per `frontend_contract_goal_mapping_guide.md`):
- `architecture/01_architecture.md`: dependency rules
- `architecture/02_types.md`: Zod schema conventions
- `architecture/08_hooks.md`: field component anatomy
- `architecture/15_feature_structure.md`: feature folder layout and `index.ts` boundary

New feature bundle:
- `architecture/07_components.md`: named exports, `cva`, `cn()`, no default exports
- `architecture/09_forms.md`: RHF contract — `FormProvider`, `useFormContext`, `register`
- `architecture/14_styling.md`: Tailwind-only, `cva`, `cn()`
- `architecture/24_dto.md`: DTO categories and schema conventions

### File read intent — pattern vs. relational

Permitted relational reads:
- `src/features/customers/types.ts` — to read exact field names, schema shapes, enums (existing behavior)
- `src/features/items/types.ts` — to read exact field names, schema shapes, enums (existing behavior)
- `src/types/common.ts` — to read `AddressSchema` shape before building address field components (existing behavior)
- `src/components/primitives/index.ts` — to verify available primitive imports (existing behavior)

Prohibited pattern reads:
- Any other field component to understand `useFormContext` usage → `09_forms.md`
- Any other provider to understand context shell → `23_providers.md`
- Any other types.ts to understand schema structure → `24_dto.md`

---

## Field Composition Architecture

### The pattern

Each feature owns field components in `features/<entity>/components/fields/`. These components:
1. Use `useFormContext()` to read the active form's RHF instance
2. Bind their own canonical field path (e.g., `customer.primary_email`)
3. Own their label, placeholder, autocomplete, and error display
4. Render a primitive input
5. Know nothing about submission, mutations, or the surrounding form's schema

### The `FormProvider` contract

The parent form calls `useForm()` and wraps with `<FormProvider>`. The schema must declare the same namespaced paths:

```tsx
const CreateTaskSchema = z.object({
  client_id: ClientIdSchema,
  customer: CustomerFieldsSchema,    // from @/features/customers
  item: ItemDetailsFieldsSchema,     // from @/features/items
});

function CreateTaskForm() {
  const form = useForm<z.infer<typeof CreateTaskSchema>>({
    resolver: zodResolver(CreateTaskSchema),
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CustomerFieldGroup />
        <ItemDetailsFieldGroup />
      </form>
    </FormProvider>
  );
}
```

### Field component anatomy

```tsx
// features/customers/components/fields/CustomerEmailField.tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function CustomerEmailField() {
  const { register, formState: { errors } } = useFormContext();
  const customerErrors = (errors as { customer?: Record<string, { message?: string }> }).customer;
  const error = customerErrors?.primary_email?.message;

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
- Error display uses `role="alert"` for screen reader accessibility
- The `<label>` uses a stable `htmlFor` matching the input's `id`
- Add stable `data-testid` attributes to inputs/selects and error elements when the field is expected to participate in E2E automation
- Imports only from `@/components/primitives` and `react-hook-form`

### Layer responsibility table

| Layer | RHF-aware? | Imports from |
|---|---|---|
| Primitive (`TextInput`) | No | Nothing RHF-related |
| Field component (`CustomerEmailField`) | Yes — `useFormContext()` | `primitives/`, `react-hook-form` |
| Field group (`CustomerFieldGroup`) | No — pure layout | Feature field components only |
| Address group (`CustomerAddressFieldGroup`) | Yes — `useFormContext()` | `primitives/`, `react-hook-form` |
| Form controller | Yes — `useForm()`, `FormProvider` | Field groups, actions, schemas |

---

## Implementation plan

### Step A1 — Augment `src/features/customers/types.ts`

**Append** to the bottom of the existing file (do not modify existing content):

```ts
// ─── Field composition schema (for form composition in other features) ────────

export const CustomerFieldsSchema = z.object({
  display_name:        z.string().min(1, 'Name is required.').max(255),
  customer_type:       z.enum(CUSTOMER_TYPE, { message: 'Select a customer type.' }),
  primary_email:       z.string().email('Enter a valid email.').optional().or(z.literal('')),
  primary_phone_number: z.string().optional(),
  address:             AddressSchema,
});
export type CustomerFields = z.infer<typeof CustomerFieldsSchema>;
```

`AddressSchema` is already imported in `customers/types.ts` from `@/types/common`. `CUSTOMER_TYPE` is already defined in the same file. No new imports needed.

---

### Step A2 — `src/features/customers/components/fields/CustomerDisplayNameField.tsx`

```tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function CustomerDisplayNameField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as { customer?: Record<string, { message?: string }> }).customer?.display_name?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="customer-display-name" className="text-sm font-medium text-foreground">
        Name
      </label>
      <TextInput
        id="customer-display-name"
        type="text"
        autoComplete="name"
        placeholder="Customer name"
        invalid={Boolean(error)}
        {...register('customer.display_name')}
      />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
```

---

### Step A3 — `src/features/customers/components/fields/CustomerTypeField.tsx`

`customer_type` is an enum (`person` | `company` | `unknown`). Use a native `<select>` element styled with Tailwind to match the app's input aesthetic. If a custom Select primitive is added later, swap it in.

```tsx
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  person: 'Person',
  company: 'Company',
  unknown: 'Unknown',
};

export function CustomerTypeField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as { customer?: Record<string, { message?: string }> }).customer?.customer_type?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="customer-type" className="text-sm font-medium text-foreground">
        Type
      </label>
      <select
        id="customer-type"
        aria-invalid={Boolean(error)}
        className={cn(
          'h-12 w-full rounded-lg border bg-input px-3 text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          error ? 'border-destructive ring-2 ring-destructive' : 'border-border',
        )}
        {...register('customer.customer_type')}
      >
        <option value="">Select type…</option>
        <option value="person">{CUSTOMER_TYPE_LABELS.person}</option>
        <option value="company">{CUSTOMER_TYPE_LABELS.company}</option>
        <option value="unknown">{CUSTOMER_TYPE_LABELS.unknown}</option>
      </select>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
```

---

### Step A4 — `src/features/customers/components/fields/CustomerEmailField.tsx`

Field path: `customer.primary_email`. Type: `email`, `autoComplete="email"`, `inputMode="email"`. Label: "Email". Optional indicator.

```tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function CustomerEmailField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as { customer?: Record<string, { message?: string }> }).customer?.primary_email?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="customer-primary-email" className="text-sm font-medium text-foreground">
        Email <span className="text-muted-foreground font-normal">(optional)</span>
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

---

### Step A5 — `src/features/customers/components/fields/CustomerPhoneField.tsx`

Field path: `customer.primary_phone_number`. Type: `tel`, `autoComplete="tel"`, `inputMode="tel"`. Label: "Phone". Optional indicator.

```tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function CustomerPhoneField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as { customer?: Record<string, { message?: string }> }).customer?.primary_phone_number?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="customer-primary-phone" className="text-sm font-medium text-foreground">
        Phone <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <TextInput
        id="customer-primary-phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="+1 555 000 0000"
        invalid={Boolean(error)}
        {...register('customer.primary_phone_number')}
      />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
```

---

### Step A6 — `src/features/customers/components/CustomerAddressFieldGroup.tsx`

`AddressSchema` is `{ street?, city?, postal_code?, country? } | null`. This group binds to four sub-field paths. It **is** RHF-aware (uses `useFormContext()`) because it directly accesses the form state for error messages.

**Important**: The parent form's `defaultValues` must initialize `customer.address` as an empty object (`{ street: '', city: '', postal_code: '', country: '' }`) rather than `null`. This ensures RHF can correctly bind to the sub-field paths on mount.

```tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function CustomerAddressFieldGroup() {
  const { register, formState: { errors } } = useFormContext();
  const addressErrors = (errors as { customer?: { address?: Record<string, { message?: string }> } }).customer?.address;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">Address <span className="text-muted-foreground font-normal">(optional)</span></p>
      <TextInput
        id="customer-address-street"
        type="text"
        autoComplete="street-address"
        placeholder="Street"
        invalid={Boolean(addressErrors?.street?.message)}
        {...register('customer.address.street')}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          id="customer-address-city"
          type="text"
          autoComplete="address-level2"
          placeholder="City"
          invalid={Boolean(addressErrors?.city?.message)}
          {...register('customer.address.city')}
        />
        <TextInput
          id="customer-address-postal"
          type="text"
          autoComplete="postal-code"
          placeholder="Postal code"
          invalid={Boolean(addressErrors?.postal_code?.message)}
          {...register('customer.address.postal_code')}
        />
      </div>
      <TextInput
        id="customer-address-country"
        type="text"
        autoComplete="country-name"
        placeholder="Country"
        invalid={Boolean(addressErrors?.country?.message)}
        {...register('customer.address.country')}
      />
    </div>
  );
}
```

---

### Step A7 — `src/features/customers/components/CustomerFieldGroup.tsx`

Pure layout — composes the five field components and the address group. **No `useFormContext()` here** — layout only.

```tsx
import { CustomerDisplayNameField } from './fields/CustomerDisplayNameField';
import { CustomerTypeField } from './fields/CustomerTypeField';
import { CustomerEmailField } from './fields/CustomerEmailField';
import { CustomerPhoneField } from './fields/CustomerPhoneField';
import { CustomerAddressFieldGroup } from './CustomerAddressFieldGroup';

export function CustomerFieldGroup() {
  return (
    <div className="flex flex-col gap-4">
      <CustomerDisplayNameField />
      <CustomerTypeField />
      <CustomerEmailField />
      <CustomerPhoneField />
      <CustomerAddressFieldGroup />
    </div>
  );
}
```

---

### Step A8 — Update `src/features/customers/index.ts`

Replace the existing minimal file with:

```ts
// Field components (used by form compositions in other features)
export { CustomerDisplayNameField } from './components/fields/CustomerDisplayNameField';
export { CustomerTypeField } from './components/fields/CustomerTypeField';
export { CustomerEmailField } from './components/fields/CustomerEmailField';
export { CustomerPhoneField } from './components/fields/CustomerPhoneField';
export { CustomerAddressFieldGroup } from './components/CustomerAddressFieldGroup';
export { CustomerFieldGroup } from './components/CustomerFieldGroup';

// Schema (used by composed form schemas in other features)
export { CustomerFieldsSchema } from './types';
export type {
  CustomerFields,
  Customer,
  CustomerViewModel,
  CustomerType,
  CustomerStatus,
  CreateCustomerInput,
  UpdateCustomerInput,
  FindOrCreateCustomerInput,
  ListCustomersParams,
} from './types';
export type { CustomerId } from '@/types/common';
```

---

### Step B1 — Augment `src/features/items/types.ts`

**Append** to the bottom of the existing file (do not modify existing content):

```ts
// ─── Field composition schema (for form composition in other features) ────────

export const ItemDetailsFieldsSchema = z.object({
  designer:       z.string().max(255).optional(),
  article_number: z.string().max(128).optional(),
  sku:            z.string().max(128).optional(),
  quantity:       z.number({ invalid_type_error: 'Enter a number.' }).int().nonnegative().optional(),
  item_position:  z.string().max(255).optional(),
  item_currency:  z.enum(ITEM_CURRENCY, { message: 'Select a currency.' }).optional(),
});
export type ItemDetailsFields = z.infer<typeof ItemDetailsFieldsSchema>;
```

`ITEM_CURRENCY` is already defined in `items/types.ts`. No new imports needed.

**Note on `item_position`**: The backend field name is `item_position`. The field path in form composition is therefore `item.item_position` (not `item.position`).

**Note on deferred fields**: `item_value_minor`, `item_cost_minor`, `height_in_cm`, `width_in_cm`, `depth_in_cm` are excluded from `ItemDetailsFieldsSchema` for now. They require minor-unit display conversion and dimension grouping that are out of scope for this plan. Add them in a follow-up plan.

---

### Step B2 — `src/features/items/components/fields/ItemDesignerField.tsx`

Field path: `item.designer`. Type: `text`. Label: "Designer". Optional.

```tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function ItemDesignerField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as { item?: Record<string, { message?: string }> }).item?.designer?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="item-designer" className="text-sm font-medium text-foreground">
        Designer <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <TextInput
        id="item-designer"
        type="text"
        placeholder="e.g. Knoll"
        invalid={Boolean(error)}
        {...register('item.designer')}
      />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
```

---

### Step B3 — `src/features/items/components/fields/ItemArticleNumberField.tsx`

Field path: `item.article_number`. Type: `text`, `autoCapitalize="characters"` for article codes. Label: "Article number". Optional.

```tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function ItemArticleNumberField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as { item?: Record<string, { message?: string }> }).item?.article_number?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="item-article-number" className="text-sm font-medium text-foreground">
        Article number <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <TextInput
        id="item-article-number"
        type="text"
        autoCapitalize="characters"
        placeholder="e.g. KN-123"
        invalid={Boolean(error)}
        {...register('item.article_number')}
      />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
```

---

### Step B4 — `src/features/items/components/fields/ItemSkuField.tsx`

Field path: `item.sku`. Type: `text`, `autoCapitalize="characters"`. Label: "SKU". Optional.

```tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function ItemSkuField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as { item?: Record<string, { message?: string }> }).item?.sku?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="item-sku" className="text-sm font-medium text-foreground">
        SKU <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <TextInput
        id="item-sku"
        type="text"
        autoCapitalize="characters"
        placeholder="e.g. SKU-456"
        invalid={Boolean(error)}
        {...register('item.sku')}
      />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
```

---

### Step B5 — `src/features/items/components/fields/ItemQuantityField.tsx`

Field path: `item.quantity`. Uses `register('item.quantity', { valueAsNumber: true })` — RHF coerces the string input to a number before validation. Schema uses `z.number().int().nonnegative()`. Label: "Quantity". Optional.

**`valueAsNumber` note**: `valueAsNumber: true` returns `NaN` on empty input, which `z.number({ invalid_type_error: 'Enter a number.' })` catches correctly. The schema must NOT use `.optional()` separately unless empty quantity is intentionally valid.

```tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function ItemQuantityField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as { item?: Record<string, { message?: string }> }).item?.quantity?.message;
  const field = register('item.quantity', { valueAsNumber: true });

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="item-quantity" className="text-sm font-medium text-foreground">
        Quantity <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <TextInput
        id="item-quantity"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="e.g. 1"
        invalid={Boolean(error)}
        {...field}
      />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
```

---

### Step B6 — `src/features/items/components/fields/ItemPositionField.tsx`

Field path: `item.item_position`. The backend field name is `item_position` — the path segment in the form schema must also be `item_position`. Label: "Position". Optional.

```tsx
import { useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives';

export function ItemPositionField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as { item?: Record<string, { message?: string }> }).item?.item_position?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="item-position" className="text-sm font-medium text-foreground">
        Position <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <TextInput
        id="item-position"
        type="text"
        placeholder="e.g. Top-left corner"
        invalid={Boolean(error)}
        {...register('item.item_position')}
      />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
```

---

### Step B7 — `src/features/items/components/fields/ItemCurrencyField.tsx`

Field path: `item.item_currency`. Enum: `swedish_krona` | `danish_krona` | `euro`. Uses a native `<select>`. Label: "Currency". Optional.

```tsx
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';

const CURRENCY_LABELS: Record<string, string> = {
  swedish_krona: 'SEK — Swedish Krona',
  danish_krona:  'DKK — Danish Krone',
  euro:          'EUR — Euro',
};

export function ItemCurrencyField() {
  const { register, formState: { errors } } = useFormContext();
  const error = (errors as { item?: Record<string, { message?: string }> }).item?.item_currency?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="item-currency" className="text-sm font-medium text-foreground">
        Currency <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <select
        id="item-currency"
        aria-invalid={Boolean(error)}
        className={cn(
          'h-12 w-full rounded-lg border bg-input px-3 text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          error ? 'border-destructive ring-2 ring-destructive' : 'border-border',
        )}
        {...register('item.item_currency')}
      >
        <option value="">Select currency…</option>
        <option value="swedish_krona">{CURRENCY_LABELS.swedish_krona}</option>
        <option value="danish_krona">{CURRENCY_LABELS.danish_krona}</option>
        <option value="euro">{CURRENCY_LABELS.euro}</option>
      </select>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
```

---

### Step B8 — `src/features/items/components/ItemDetailsFieldGroup.tsx`

Pure layout — composes the field components. **No `useFormContext()`**.

```tsx
import { ItemDesignerField } from './fields/ItemDesignerField';
import { ItemArticleNumberField } from './fields/ItemArticleNumberField';
import { ItemSkuField } from './fields/ItemSkuField';
import { ItemQuantityField } from './fields/ItemQuantityField';
import { ItemPositionField } from './fields/ItemPositionField';
import { ItemCurrencyField } from './fields/ItemCurrencyField';

export function ItemDetailsFieldGroup() {
  return (
    <div className="flex flex-col gap-4">
      <ItemDesignerField />
      <div className="grid grid-cols-2 gap-3">
        <ItemArticleNumberField />
        <ItemSkuField />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ItemQuantityField />
        <ItemCurrencyField />
      </div>
      <ItemPositionField />
    </div>
  );
}
```

---

### Step B9 — Update `src/features/items/index.ts`

Replace the existing minimal file with:

```ts
// Field components (used by form compositions in other features)
export { ItemDesignerField } from './components/fields/ItemDesignerField';
export { ItemArticleNumberField } from './components/fields/ItemArticleNumberField';
export { ItemSkuField } from './components/fields/ItemSkuField';
export { ItemQuantityField } from './components/fields/ItemQuantityField';
export { ItemPositionField } from './components/fields/ItemPositionField';
export { ItemCurrencyField } from './components/fields/ItemCurrencyField';
export { ItemDetailsFieldGroup } from './components/ItemDetailsFieldGroup';

// Schema (used by composed form schemas in other features)
export { ItemDetailsFieldsSchema } from './types';
export type {
  ItemDetailsFields,
  Item,
  ItemViewModel,
  ItemCurrency,
  CreateItemInput,
  UpdateItemInput,
  ListItemsParams,
} from './types';
export type { ItemId } from '@/types/common';
```

---

### Step C — Typecheck

```bash
npm run typecheck
```

Expected: zero errors.

---

## Full file tree produced by this plan

```
src/
  features/customers/
    types.ts                                ← MODIFIED: append CustomerFieldsSchema
    components/
      fields/
        CustomerDisplayNameField.tsx        ← NEW
        CustomerTypeField.tsx               ← NEW
        CustomerEmailField.tsx              ← NEW
        CustomerPhoneField.tsx              ← NEW
      CustomerAddressFieldGroup.tsx         ← NEW (RHF-aware address subfields)
      CustomerFieldGroup.tsx                ← NEW (layout-only)
    index.ts                                ← MODIFIED: full field + schema exports
  features/items/
    types.ts                                ← MODIFIED: append ItemDetailsFieldsSchema
    components/
      fields/
        ItemDesignerField.tsx               ← NEW
        ItemArticleNumberField.tsx          ← NEW
        ItemSkuField.tsx                    ← NEW
        ItemQuantityField.tsx               ← NEW
        ItemPositionField.tsx               ← NEW
        ItemCurrencyField.tsx               ← NEW
      ItemDetailsFieldGroup.tsx             ← NEW (layout-only)
    index.ts                                ← MODIFIED: full field + schema exports
```

---

## Mobile UX strategy for field components

**Touch target**: `TextInput` at `size="md"` = 48px tall, meeting Apple HIG minimum. The native `<select>` must also reach 48px via `h-12` class.

**Keyboard types**: Email fields: `type="email" inputMode="email"`. Phone fields: `type="tel" inputMode="tel"`. Quantity/numeric: `type="text" inputMode="numeric" pattern="[0-9]*"`.

**iOS zoom prevention**: `TextInput` already sets `text-base` (16px). The native `<select>` element must also be `text-sm` (14px) — on iOS, inputs below 16px trigger auto-zoom. Add `text-base` to the `<select>` class string if the `text-sm` causes zoom on iOS.

**Field spacing**: Groups use `flex flex-col gap-4` between fields.

**Error display**: `role="alert"` on all error `<p>` elements.

---

## Risks and mitigations

- Risk: `errors.customer?.primary_email?.message` access is not type-safe without knowing the parent form's schema type
  Mitigation: Access errors with a cast: `(errors as { customer?: Record<string, { message?: string }> }).customer?.primary_email?.message`. Acceptable since field components are intentionally schema-agnostic.

- Risk: `customer.address.street` path access fails if the parent form initializes `customer.address` as `null`
  Mitigation: Document in `CustomerAddressFieldGroup` JSDoc that the parent form must initialize `customer.address` as `{ street: '', city: '', postal_code: '', country: '' }` (not `null`).

- Risk: `item.item_position` path looks redundant (double `item`) in a composed schema
  Mitigation: This is correct — the outer `item` is the schema namespace prefix, the inner `item_position` is the backend field name. Document the distinction in `ItemPositionField`.

- Risk: Native `<select>` styling diverges from `TextInput` visual style across browsers/OS
  Mitigation: Use a custom Select primitive when one is available. For now, native `<select>` with explicit `h-12`, `rounded-lg`, `border`, `bg-input`, `px-3` Tailwind classes provides adequate consistency.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: `CustomerEmailField` inside a `<FormProvider>` with `{ customer: CustomerFieldsSchema }` schema renders and shows error on invalid email
- Manual: `ItemQuantityField` with empty input shows `'Enter a number.'` (not silent NaN pass)
- Manual: `CustomerTypeField` shows all three options and error message when unselected
- Manual: `CustomerAddressFieldGroup` all four sub-inputs render and bind correctly
- `grep -r "useFormContext" src/features/customers src/features/items` — only appears in `components/fields/` files and `CustomerAddressFieldGroup.tsx`

---

## Review log

Updated 2026-05-20: Revised from original full-vertical plan. Types and API keys are already implemented. Plan now scoped to field components only. Field names updated to match actual `types.ts`: `display_name`, `customer_type`, `primary_phone_number`, `address` (structured) for customers; `item_position` (not `position`), no secondary contact fields. Folder paths updated to `customers/` and `items/` (plural). Pricing/dimension item fields deferred.
Updated 2026-05-20: Post-implementation follow-up added stable `data-testid` attributes across the new customer/item field inputs, error messages, and field groups for selector consistency.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
