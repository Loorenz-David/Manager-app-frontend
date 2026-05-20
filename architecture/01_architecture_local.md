> Extends: 01_architecture.md

# 01 — Architecture — ManagerBeyo Managers App Extension

---

## `route-entry.tsx` — feature-owned route composition file

Each primary feature vertical may contain a `route-entry.tsx` file at the root of its feature folder. This file is the lazy-load entry point for that feature's primary route.

### Purpose

`route-entry.tsx` composes the feature's provider(s) and root view into a single component that the corresponding page file (`src/pages/<feature>/<Feature>Page.tsx`) lazily imports. It lets the feature own its own composition and Suspense boundary decisions without leaking that logic into `src/pages/`.

### Structure

```
src/features/<feature>/
  route-entry.tsx        ← lazy entry: Provider wrapping View
  components/
  controllers/
  providers/
  types.ts
  index.ts
```

### Rule: what is allowed in `route-entry.tsx`

`route-entry.tsx` may only:
- Import from within its own feature folder (`./components/`, `./providers/`)
- Compose a provider tree around a root view component

`route-entry.tsx` must NOT:
- Import from other features
- Import from `pages/`, `app/`, `store/`, `hooks/`, or `lib/`
- Contain any logic, hooks, or state of its own
- Be exported from the feature's `index.ts` (it is an internal entry point, not a public API)

### How it connects to `src/pages/`

```tsx
// src/pages/home/HomePage.tsx
import { lazy, Suspense } from 'react';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

const HomeRouteEntry = lazy(() =>
  import('@/features/home/route-entry').then((m) => ({ default: m.HomeRouteEntry })),
);

export function HomePage(): React.JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HomeRouteEntry />
    </Suspense>
  );
}
```

The page file in `src/pages/` is the thin route-level shell: it owns the `Suspense` boundary and the lazy import. The feature's `route-entry.tsx` owns the provider composition.

### Preloading

Feature chunks are preloaded via `src/lib/primary-tab-preload.ts`. Preload targets point directly to `@/features/<feature>/route-entry` (not the page file) to warm the actual feature chunk:

```ts
[ROUTES.home]: () => import('@/features/home/route-entry'),
```

### When to use this pattern

Only for **primary tab routes** — the five features mounted inside `AppShell` via `TabOutlet`. Surface content (registered in `surface-registry.ts`) uses `src/pages/test_feature/` wrappers directly, without a `route-entry.tsx`.
