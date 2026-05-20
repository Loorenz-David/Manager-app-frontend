# PLAN_input_primitives_20260520

## Metadata

- Plan ID: `PLAN_input_primitives_20260520`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-20T00:00:00Z`
- Last updated at (UTC): `2026-05-20T10:40:31Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/primitives.md`

## Goal and intent

- Goal: Create three pure presentation primitives — `TextInput`, `TextArea`, and `SwitchCheckbox` — in `src/components/primitives/`, along with a shared focus-ring/disabled utility and the design tokens they depend on.
- Business/user intent: Establish the foundational input layer that all future form components and RHF wrappers will build on top of. Getting this layer right prevents styling drift, accessibility regressions, and iOS keyboard UX issues across the entire app.
- Non-goals: RHF form-field wrappers (`FormTextInput`, `FormTextArea`, `FormSwitch`) — those come in a future plan. Validation logic, labels, and helper-text display are not part of this scope. Auto-growing textarea is out of scope.

## Scope

- In scope:
  - `src/components/primitives/shared/primitive-base.ts` — shared focus-ring, disabled, and invalid class constants
  - `src/components/primitives/input/TextInput.tsx` + `index.ts`
  - `src/components/primitives/textarea/TextArea.tsx` + `index.ts`
  - `src/components/primitives/switch/SwitchCheckbox.tsx` + `index.ts`
  - `src/components/primitives/index.ts` — public re-export barrel
  - Design token additions to `src/index.css` (`--color-border`, `--color-input`, `--color-destructive`)
  - `class-variance-authority` package installation
- Out of scope:
  - RHF-connected form field wrappers
  - Labels, helper text, character count
  - Auto-resize textarea behavior
  - Dark mode tokens (future)
  - Form-level error display
- Assumptions:
  - Tailwind v4 via `@tailwindcss/vite` is active and already processes `src/index.css`
  - `cn()` already exists at `src/lib/utils.ts`
  - `clsx` and `tailwind-merge` are already installed
  - `framer-motion` is installed but is NOT used in primitives — CSS transitions handle all micro-animation here per `31_animations.md`

## Clarifications required

_(none — intention document is comprehensive)_

## Acceptance criteria

1. `npm run typecheck` passes with zero TypeScript errors after implementation
2. All three primitives are exported from `src/components/primitives/index.ts`
3. `TextInput` and `TextArea` accept `{...register('fieldName')}` spread without TypeScript errors (because they extend the native `HTMLInputElement` / `HTMLTextAreaElement` attribute interfaces)
4. `SwitchCheckbox` accepts `{...register('fieldName')}` spread without TypeScript errors
5. All three components correctly forward `ref` (verified by TypeScript — `forwardRef` return type matches the element)
6. No hardcoded hex color values in any component — only design token classes
7. `TextInput` with `type="password"` or `type="email"` compiles without type errors
8. Focus ring appears on the outer wrapper (not the raw `<input>`) for `TextInput` and `TextArea`

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: shared UI primitive pattern — `forwardRef`, `cva`, `cn()`, `displayName`, named exports, `Omit<HTMLAttributes, ...>` type pattern
- `architecture/14_styling.md`: Tailwind-only styling, `cva` for variants, `cn()` for conditional composition, no CSS files, design tokens only, no arbitrary hex values
- `architecture/09_forms.md`: understanding how `register()` spreads onto uncontrolled inputs and why `forwardRef` is required for RHF compatibility
- `architecture/31_animations.md`: CSS handles hover/focus/active color transitions; Framer Motion is NOT used in primitives

### Local extensions loaded

- `architecture/01_architecture_local.md`: `route-entry.tsx` pattern — no impact on primitives (informational only)

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

Permitted relational reads:
- `src/index.css` — to read existing `@theme` tokens before adding new ones (existing behavior)
- `src/lib/utils.ts` — to verify `cn()` signature (existing behavior)
- `src/components/ui/PageSkeleton.tsx` — to understand existing component conventions if needed

Prohibited pattern reads (contract already covers these):
- Any other component in `components/ui/` to understand `cva` or `forwardRef` structure → `07_components.md`
- Any form component to understand RHF usage → `09_forms.md`

### Skill selection

- Primary skill: none — this is a UI primitive build, not a feature scaffold

## Implementation plan

### Step 0 — ~~Install `class-variance-authority`~~ ✓ Already installed (`^0.7.1`)

---

### Step 1 — Add missing design tokens to `src/index.css`

Open `src/index.css` and extend the `@theme` block with three new tokens:

```css
@theme {
  /* existing tokens */
  --color-background: #f8f7f2;
  --color-foreground: #161615;
  --color-muted: #e8e1d6;
  --color-muted-foreground: #706659;
  --color-primary: #183a63;

  /* NEW — required by input primitives */
  --color-border: #d4cdc4;          /* subtle warm-tinted input/card border */
  --color-input: #ffffff;            /* input field background */
  --color-destructive: #c0392b;     /* error/invalid ring and text */
}
```

These values are warm-palette-aligned. The exact hex values may be updated by design; these are the semantic slots that the primitives depend on. **Do not hardcode these values in component files — always use the token class names** (`border-border`, `bg-input`, `text-destructive`, `ring-destructive`).

---

### Step 2 — Create shared primitive base

**File:** `src/components/primitives/shared/primitive-base.ts`

```ts
// Shared Tailwind class constants across all three input primitives.
// Centralised here to ensure focus ring, disabled, and invalid states
// are visually consistent without per-component drift.

export const FOCUS_WITHIN_RING =
  'focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2';

export const DISABLED_BASE =
  'has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed';

export const INVALID_RING = 'ring-2 ring-destructive ring-offset-0';
```

**File:** `src/components/primitives/shared/index.ts`

```ts
export { FOCUS_WITHIN_RING, DISABLED_BASE, INVALID_RING } from './primitive-base';
```

**Rationale for `has-[:disabled]` on the wrapper:** The focus ring lives on the outer container (so it wraps icons too). The disabled visual state should also darken the entire container including icons. Using `has-[:disabled]:` on the wrapper lets a single class handle both the input's disabled prop and the container appearance.

---

### Step 3 — `TextInput` component

**File:** `src/components/primitives/input/TextInput.tsx`

#### Architecture decisions

**Wrapper + inner input split**: `TextInput` renders a `<div>` wrapper + a bare `<input>` inside. The wrapper owns the border, focus ring, and icon slots. The `<input>` is transparent (no own border, no own background). This allows:
- Left/right icon injection without complicating the input element itself
- Focus ring on the container (wraps the entire interaction area including icons)
- Clean `{...props}` spread onto the `<input>` without fighting wrapper styles

**`Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>`**: HTML's native `size` attribute is of type `number` (controls visible character width). Our `size` prop is a CVA variant (`'sm' | 'md' | 'lg'`). We omit the HTML attribute to avoid a type conflict.

**`text-base` on the input**: iOS Safari zooms the viewport when a focused input has `font-size < 16px`. `text-base` = `1rem` = 16px at the browser default. This is non-negotiable for mobile.

**`appearance-none`**: Removes browser-default borders, shadows, and autofill background tinting from the `<input>` element itself. The container provides all visual decoration.

**Focus ring on wrapper via `focus-within:`**: When the inner `<input>` receives focus, the outer `<div>` gains the `focus-within:ring-*` classes. The inner `<input>` gets `outline-none` to suppress the native outline.

#### CVA schemas

```ts
const inputWrapperVariants = cva(
  [
    'relative flex items-center rounded-lg border bg-input',
    'transition-colors duration-150',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-border',
        ghost: 'border-transparent bg-transparent',
      },
      size: {
        sm: 'h-10 px-0',    // height only; horizontal padding is on inner slots
        md: 'h-12 px-0',
        lg: 'h-14 px-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);
```

```ts
const inputFieldClasses =
  'h-full flex-1 min-w-0 bg-transparent px-3 text-base text-foreground ' +
  'placeholder:text-muted-foreground appearance-none outline-none ' +
  'disabled:cursor-not-allowed';
```

#### Type signature

```ts
type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> &
  VariantProps<typeof inputWrapperVariants> & {
    invalid?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    wrapperClassName?: string;
  };
```

`wrapperClassName` provides an escape hatch for callers that need to override the wrapper's layout (e.g., `flex-1` in a row). `className` is forwarded to the inner `<input>` in case the caller needs to override input-level classes.

#### Full component

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { FOCUS_WITHIN_RING, INVALID_RING } from '../shared';

// ... (inputWrapperVariants and inputFieldClasses as above)

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      variant,
      size,
      invalid = false,
      leftIcon,
      rightIcon,
      wrapperClassName,
      className,
      ...props
    },
    ref,
  ) => (
    <div
      className={cn(
        inputWrapperVariants({ variant, size }),
        FOCUS_WITHIN_RING,
        invalid && INVALID_RING,
        wrapperClassName,
      )}
    >
      {leftIcon && (
        <span className="pointer-events-none pl-3 text-muted-foreground flex-shrink-0">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(inputFieldClasses, className)}
        {...props}
      />
      {rightIcon && (
        <span className="pointer-events-none pr-3 text-muted-foreground flex-shrink-0">
          {rightIcon}
        </span>
      )}
    </div>
  ),
);
TextInput.displayName = 'TextInput';
```

**File:** `src/components/primitives/input/index.ts`

```ts
export { TextInput } from './TextInput';
export type { TextInputProps } from './TextInput';
```

_(Note: `TextInputProps` must be exported from the component file with `export type`.)_

---

### Step 4 — `TextArea` component

**File:** `src/components/primitives/textarea/TextArea.tsx`

`TextArea` follows the same container + inner element split as `TextInput`. It does not support icon slots (not meaningful for textarea). The wrapper provides the border, focus ring, and padding. The `<textarea>` fills the wrapper.

#### Architecture decisions

**`resize` prop**: Controls whether the textarea is resizable.
- `'none'` → `resize-none` (default for mobile, prevents layout breakage)
- `'vertical'` → `resize-y`
- `'both'` → `resize` (not recommended on mobile; included for desktop scenarios)

Native `resize` HTML attribute is a string, so no `Omit` needed — we just add a strongly-typed `resize` prop that maps to a Tailwind class.

**Minimum height via `rows`**: Callers use the standard `rows` HTML attribute to set minimum height. No internal state for height management.

#### CVA schemas

```ts
const textareaWrapperVariants = cva(
  [
    'relative flex rounded-lg border bg-input',
    'transition-colors duration-150',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-border',
        ghost: 'border-transparent bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const textareaFieldClasses =
  'w-full flex-1 bg-transparent px-3 py-3 text-base text-foreground ' +
  'placeholder:text-muted-foreground appearance-none outline-none ' +
  'disabled:cursor-not-allowed';
```

#### Type signature

```ts
type ResizeProp = 'none' | 'vertical' | 'both';

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof textareaWrapperVariants> & {
    invalid?: boolean;
    resize?: ResizeProp;
    wrapperClassName?: string;
  };
```

#### Full component

```tsx
const resizeClassMap: Record<ResizeProp, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  both: 'resize',
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      variant,
      invalid = false,
      resize = 'none',
      wrapperClassName,
      className,
      ...props
    },
    ref,
  ) => (
    <div
      className={cn(
        textareaWrapperVariants({ variant }),
        FOCUS_WITHIN_RING,
        invalid && INVALID_RING,
        wrapperClassName,
      )}
    >
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(textareaFieldClasses, resizeClassMap[resize], className)}
        {...props}
      />
    </div>
  ),
);
TextArea.displayName = 'TextArea';
```

**File:** `src/components/primitives/textarea/index.ts`

```ts
export { TextArea } from './TextArea';
export type { TextAreaProps } from './TextArea';
```

---

### Step 5 — `SwitchCheckbox` component

**File:** `src/components/primitives/switch/SwitchCheckbox.tsx`

#### Architecture decisions

**Semantic foundation**: `SwitchCheckbox` is a styled `<input type="checkbox">` — not a `<div role="switch">`. This means:
- It works with `{...register('fieldName')}` natively (RHF's `register` spreads `name`, `ref`, `onChange`, `onBlur`)
- It participates in native form submission and `FormData`
- It is keyboard-accessible by default (Space to toggle)
- Screen readers announce it correctly as a checkbox

**Visual structure using `group-has-*`**:

The label is the interaction root. It wraps the hidden `<input>` and the visual track + thumb. The input is `sr-only` (visually hidden but accessible). The outer label carries a `group` class. Track and thumb use `group-has-[:checked]:` Tailwind variants to respond to the checkbox's checked state without JavaScript.

```
<label group>
  <input sr-only>          ← real checkbox, keyboard and screen-reader accessible
  <span track>             ← visual track, group-has-[:checked]:bg-primary
    <span thumb />         ← visual thumb, group-has-[:checked]:translate-x-N
  </span>
</label>
```

This pattern works in Tailwind v4 and requires no JavaScript state.

**Minimum touch target**: The label element gets `min-h-[44px] min-w-[44px]` applied via the `items-center` + height of the track to ensure it meets the Apple HIG 44×44pt minimum tappable target. If needed, an invisible hit-area expansion can be applied with `after:absolute after:inset-[-8px] after:content-['']`.

**`Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>`**: `type` is always `"checkbox"` internally. Callers must not override it.

#### CVA schemas

```ts
const switchTrackVariants = cva(
  [
    'relative block flex-shrink-0 rounded-full',
    'bg-muted transition-colors duration-200',
    'group-has-[:checked]:bg-primary',
    'group-has-[:focus-visible]:ring-2',
    'group-has-[:focus-visible]:ring-primary',
    'group-has-[:focus-visible]:ring-offset-2',
    'group-has-[:disabled]:opacity-50',
    'group-has-[:disabled]:cursor-not-allowed',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-5 w-9',
        md: 'h-6 w-11',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

const switchThumbVariants = cva(
  [
    'absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm',
    'transition-transform duration-200',
  ].join(' '),
  {
    variants: {
      size: {
        // sm: track=36px, thumb=16px, padding=2px, checked-offset = (36-16-2*2)=16px = translate-x-4
        sm: 'h-4 w-4 group-has-[:checked]:translate-x-4',
        // md: track=44px, thumb=20px, padding=2px, checked-offset = (44-20-2*2)=20px = translate-x-5
        md: 'h-5 w-5 group-has-[:checked]:translate-x-5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
```

**Checked offset calculation**: Tailwind's default spacing scale uses `0.25rem` per unit. `translate-x-4` = 1rem = 16px; `translate-x-5` = 1.25rem = 20px. Verified against track and thumb dimensions above.

#### Type signature

```ts
type SwitchCheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> &
  VariantProps<typeof switchTrackVariants> & {
    invalid?: boolean;
    wrapperClassName?: string;
  };
```

#### Full component

```tsx
export const SwitchCheckbox = forwardRef<HTMLInputElement, SwitchCheckboxProps>(
  ({ size, invalid = false, wrapperClassName, className, ...props }, ref) => (
    <label
      className={cn(
        'group relative inline-flex cursor-pointer select-none items-center',
        invalid && 'ring-2 ring-destructive ring-offset-2 rounded-full',
        wrapperClassName,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        aria-invalid={invalid || undefined}
        className={cn('sr-only', className)}
        {...props}
      />
      <span className={switchTrackVariants({ size })}>
        <span className={switchThumbVariants({ size })} />
      </span>
    </label>
  ),
);
SwitchCheckbox.displayName = 'SwitchCheckbox';
```

**File:** `src/components/primitives/switch/index.ts`

```ts
export { SwitchCheckbox } from './SwitchCheckbox';
export type { SwitchCheckboxProps } from './SwitchCheckbox';
```

---

### Step 6 — Public barrel export

**File:** `src/components/primitives/index.ts`

```ts
export { TextInput } from './input';
export type { TextInputProps } from './input';

export { TextArea } from './textarea';
export type { TextAreaProps } from './textarea';

export { SwitchCheckbox } from './switch';
export type { SwitchCheckboxProps } from './switch';
```

---

### Step 7 — Verify typecheck

```bash
npm run typecheck
```

Expected: zero TypeScript errors.

---

## RHF integration strategy (non-goals for this plan — documented for next plan)

The primitives are RHF-agnostic by design. `register()` returns `{ name, ref, onChange, onBlur }` — all of which are valid props on `HTMLInputElement` and `HTMLTextAreaElement`. The spread works directly:

```tsx
// Works today — uncontrolled via register()
<TextInput {...register('email')} type="email" />
<TextArea {...register('notes')} rows={4} />
<SwitchCheckbox {...register('active')} />
```

The future `FormTextInput`, `FormTextArea`, and `FormSwitch` wrappers (out of scope for this plan) will:
1. Accept `name` + `control` from RHF
2. Use `Controller` internally for the switch (or `register` for text)
3. Read `fieldState.error?.message` and render it as `<p>` with `text-destructive`
4. Render `<label>` and optional helper text
5. Live in `src/components/forms/` (a sibling folder to `src/components/primitives/`)

The separation matters because:
- Primitives can be used in any context — controlled, uncontrolled, or third-party forms
- Form wrappers are opinionated about RHF and Zod — they belong in a separate layer
- Testing primitives (visual/interaction) does not require a form context
- Storybook stories for primitives are cleaner without RHF dependencies

---

## Performance strategy

**Why uncontrolled is correct here**:

Controlled inputs call `setState` on every keystroke, triggering a re-render. For a form with 10 fields, that means 10 × keystrokes re-renders of the form component. RHF stores values in an internal ref-based store and only triggers React re-renders when validation state changes or the form is submitted. The primitives contribute zero internal state — they are `div` + `input` with no `useState`.

Rules to preserve this:
- Never add `useState` to any primitive for focus/hover tracking — use CSS pseudo-classes (`:focus-within`, `:hover`, `has-[:disabled]`) instead
- Never default `value` to a state variable inside the primitive
- The `invalid` prop is passed from the form layer; the primitive does not derive it

---

## Accessibility summary

| Primitive | Keyboard | Screen reader | ARIA |
|---|---|---|---|
| `TextInput` | Tab to focus, native input behavior | Reads label + value natively | `aria-invalid={true}` when invalid |
| `TextArea` | Tab to focus, Enter for newlines | Reads label + content natively | `aria-invalid={true}` when invalid |
| `SwitchCheckbox` | Tab to focus, Space to toggle | "checkbox, checked/unchecked" | `aria-invalid={true}` when invalid |

**Labelling**: Primitives do not render labels. The calling component is responsible for associating a `<label htmlFor={id}>` or using `aria-label` / `aria-labelledby`. This is intentional — primitives are label-agnostic; form wrappers add labels.

**Focus visibility**: All three primitives produce a visible `ring-2 ring-primary` focus ring via `focus-within:` (text inputs/textarea) or `group-has-[:focus-visible]:ring-2` (switch). The ring satisfies WCAG 2.4.11 at the default ring size.

---

## Risks and mitigations

- Risk: `group-has-[:checked]:` variant not working in Tailwind v4 during compilation
  Mitigation: If the class is not generated, fall back to the `peer` pattern for track and a `data-checked` attribute set via `onChange` on the wrapper label. Document the fallback in a comment in `SwitchCheckbox.tsx`.

- Risk: `translate-x-4` / `translate-x-5` thumb offset is off by sub-pixel amounts
  Mitigation: Validate visually in the browser; adjust to `translate-x-[18px]` with an explanatory comment if Tailwind's scale unit doesn't land exactly.

- Risk: iOS keyboard pushes content up, breaking layout
  Mitigation: This is a viewport/shell concern, not a primitive concern. Safe-area insets and `overflow: hidden` on root elements are already in `src/index.css`.

- Risk: `sr-only` input in `SwitchCheckbox` not being associated with a label
  Mitigation: The `<input>` is always a DOM child of `<label>`, so the association is implicit by nesting — no `htmlFor`/`id` required.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual browser check: `TextInput` with `leftIcon` and `rightIcon` shows consistent focus ring around entire container
- Manual browser check: `SwitchCheckbox` toggle animation is smooth (`duration-200`)
- Manual browser check (iOS Safari): tapping `TextInput` does not zoom the viewport
- Manual browser check: `TextInput` with `invalid={true}` shows destructive ring; `aria-invalid` is set on the `<input>` element (verify in DevTools → Accessibility panel)

---

## Review log

- `2026-05-20T10:40:31Z`: implemented the primitive layer in `apps/managers-app/ManagerBeyo-app-managers/src/...`, mapping the plan's `src/...` paths to the managers app package root in this monorepo.
- `2026-05-20T10:40:31Z`: added `TextInput`, `TextArea`, `SwitchCheckbox`, shared primitive state classes, and the required design tokens.
- `2026-05-20T10:40:31Z`: validation completed with `npm run typecheck` and `npm run build` passing in `apps/managers-app/ManagerBeyo-app-managers`.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: David
