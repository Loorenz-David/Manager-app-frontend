# 14 — Styling Contract

## Definition

Tailwind CSS is the styling primitive. `class-variance-authority` (cva) is the component variant system. Together they replace CSS files, CSS modules, and CSS-in-JS. The design token system (Tailwind config) is the single source of truth for spacing, color, and typography.

Animation is governed by [31_animations.md](31_animations.md). CSS handles simple color, border, shadow, and focus transitions; Framer Motion handles structural UI transitions such as surfaces, route transitions, list add/remove, and collapse/expand behavior.

Loading shimmer is governed by [32_loading_skeletons.md](32_loading_skeletons.md). Skeleton gradients and keyframes are centralized in global CSS utilities; components only compose skeleton shapes.

---

## Rules

1. **Utility classes only.** No `.css` files, no CSS modules, no `<style>` tags for component styles.
2. **Design tokens, not raw values.** `text-gray-700` not `text-[#374151]`. `p-4` not `p-[16px]`.
3. **No arbitrary values** (`[...]`) except for one-off layout constraints that cannot be expressed with tokens (e.g., `max-w-[680px]` for a specific content width). Arbitrary values require a comment.
4. **`cn()` for conditional classes.** Never build class strings with template literals.
5. **`cva` for component variants.** Never branch on a prop to return different class strings.

---

## The `cn` utility

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`cn` combines `clsx` (conditional class logic) and `tailwind-merge` (deduplication of conflicting Tailwind utilities). Use it everywhere class names are conditional or composed.

```tsx
// Correct
<div className={cn('base-class', isActive && 'text-blue-600', className)} />

// Wrong — template literals don't merge conflicts
<div className={`base-class ${isActive ? 'text-blue-600' : ''} ${className}`} />
```

---

## cva for component variants

```tsx
// src/components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base classes applied to every variant
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
        ghost: 'hover:bg-gray-100 text-gray-700',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-12 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

The `className` prop is always accepted and merged last — it allows callers to add one-off overrides without breaking the component's base styles.

---

## Design tokens in tailwind.config.ts

All colors, spacing, and typography used beyond Tailwind's defaults are defined in the Tailwind config — not hardcoded in component class strings:

```ts
// tailwind.config.ts
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a5f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

Use `text-brand-600` in components, not `text-[#2563eb]`.

---

## Layout primitives

Common layout patterns use consistent utility combinations:

```
Stack (vertical)   flex flex-col gap-4
Row (horizontal)   flex items-center gap-3
Grid 2-col         grid grid-cols-2 gap-4
Full-width card    rounded-lg border border-gray-200 bg-white p-6
Page container     mx-auto max-w-5xl px-4 py-8
```

Define these as components when they're used more than twice:

```tsx
export function Stack({ children, gap = 4 }: { children: ReactNode; gap?: number }) {
  return <div className={cn('flex flex-col', `gap-${gap}`)}>{children}</div>;
}
```

---

## Dark mode

If dark mode is required, use Tailwind's `dark:` variant. The theme store drives a class on `<html>`:

```ts
// src/store/theme.store.ts applies dark class to <html> element
document.documentElement.classList.toggle('dark', theme === 'dark');
```

```tsx
<p className="text-gray-900 dark:text-gray-100">Content</p>
```

---

## Responsive design

Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) with a mobile-first approach:

```tsx
// Mobile-first: base styles are mobile, larger screens override
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
```

---

## What styling must NOT do

- **Never write `.css` files** for component styles. Global resets and `@font-face` declarations in `src/index.css` are the only exception.
- **Never use inline `style` props** for anything expressible as a Tailwind class.
- **Never use CSS transitions for structural UI movement** such as drawers, modals, route transitions, or list reordering. Use the animation contract.
- **Never define skeleton shimmer gradients or keyframes inside components.** Use the centralized skeleton utility.
- **Never hardcode hex colors or pixel values** in className strings. Use design tokens.
- **Never branch on a prop with a ternary to build class strings.** Define the variant in `cva`.
- **Never import Tailwind utility classes from JavaScript variables.** Tailwind's purge scanner cannot detect dynamic class names — use complete class strings.
- **Never use arbitrary values** without a comment explaining why a token does not work here.

---

## §14 — Monorepo app Tailwind source configuration (`@source`)

### Tailwind v4 + `@tailwindcss/vite` behavior

This project uses Tailwind v4 with the `@tailwindcss/vite` plugin (no `tailwind.config.ts`). The plugin scans files through Vite's transform pipeline — but **transitive workspace packages are not reliably detected** without explicit `@source` declarations.

Root cause: when a monorepo package (e.g., `@beyo/task-creation`) imports another package (e.g., `@beyo/working-sections`), Tailwind may not scan the transitive dependency's files because of node_modules boundary handling, even for symlinked workspace packages. The symptom is broken layout on first load or in fresh builds — components render but dimensions are wrong, images appear full-page, containers lose their size constraints.

### Rule: every UI package must be explicitly sourced

Every `@beyo/*` package that contains `className=` usages **must** be listed as an explicit `@source` directive in the app's `src/index.css`. Do not rely on automatic detection for workspace packages.

### Current authoritative list

| Package | `className` usages | Source directive |
|---|---|---|
| `@beyo/ui` | yes | `@source "../../../../packages/ui/src"` |
| `@beyo/tasks` | yes | `@source "../../../../packages/tasks/src"` |
| `@beyo/auth` | yes | `@source "../../../../packages/auth/src"` |
| `@beyo/cases` | yes | `@source "../../../../packages/cases/src"` |
| `@beyo/images` | yes | `@source "../../../../packages/images/src"` |
| `@beyo/notifications` | yes | `@source "../../../../packages/notifications/src"` |
| `@beyo/task-creation` | yes | `@source "../../../../packages/task-creation/src"` |
| `@beyo/task-notes` | yes | `@source "../../../../packages/task-notes/src"` |
| `@beyo/task-working-sections` | yes | `@source "../../../../packages/task-working-sections/src"` |
| `@beyo/working-sections` | yes | `@source "../../../../packages/working-sections/src"` |
| `@beyo/scanner` | yes | `@source "../../../../packages/scanner/src"` |
| `@beyo/items` | yes | `@source "../../../../packages/items/src"` |
| `@beyo/item-categories` | yes | `@source "../../../../packages/item-categories/src"` |
| `@beyo/upholstery` | yes | `@source "../../../../packages/upholstery/src"` |
| `@beyo/item-issues` | yes | `@source "../../../../packages/item-issues/src"` |
| `@beyo/customers` | yes | `@source "../../../../packages/customers/src"` |
| `@beyo/phone-input` | yes | `@source "../../../../packages/phone-input/src"` |
| `@beyo/pwa` | yes | `@source "../../../../packages/pwa/src"` |
| `@beyo/clock-kiosk` | yes | `@source "../../../../packages/clock-kiosk/src"` |
| `@beyo/worker-shifts` | no | omit — 0 className usages |
| `@beyo/permissions` | no | omit — 0 className usages |
| `@beyo/realtime` | no | omit — 0 className usages |

### Path depth rule

All apps in this monorepo live at `apps/<app-group>/<app-name>/src/index.css` — three directory levels under `apps/`. The `@source` path is always `../../../../packages/<pkg>/src` (four levels up from `src/`).

### Template `src/index.css` for a new app

```css
@import "tailwindcss";
@import "@beyo/styles";
@source "../../../../packages/ui/src";
@source "../../../../packages/tasks/src";
@source "../../../../packages/auth/src";
@source "../../../../packages/cases/src";
@source "../../../../packages/images/src";
@source "../../../../packages/notifications/src";
@source "../../../../packages/task-creation/src";
@source "../../../../packages/task-notes/src";
@source "../../../../packages/task-working-sections/src";
@source "../../../../packages/working-sections/src";
@source "../../../../packages/scanner/src";
@source "../../../../packages/items/src";
@source "../../../../packages/item-categories/src";
@source "../../../../packages/upholstery/src";
@source "../../../../packages/item-issues/src";
@source "../../../../packages/customers/src";
@source "../../../../packages/phone-input/src";
@source "../../../../packages/pwa/src";
```

### When you add a new `@beyo/*` package

1. Run `grep -r "className=" packages/<pkg>/src | wc -l` to confirm className usages.
2. If nonzero: add `@source "../../../../packages/<pkg>/src"` to **every app's** `src/index.css` and update the table above.
3. If zero: omit — no entry needed.
