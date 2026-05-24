> Extends: 30_dynamic_loading.md

# 30 — Dynamic Loading — ManagerBeyo Managers App Extension

## `lazyWithPreload` utility location

The utility is at `src/utils/lazy-with-preload.ts`. Import path: `@/utils/lazy-with-preload`.

Every surface registration in this app **must** use `lazyWithPreload`. Bare `React.lazy()` is not permitted for surface components.

---

## `usePreloadSurface` hook

The app-specific hook for firing preloads on component mount lives at `src/hooks/use-preload-surface.ts`.

```ts
import { usePreloadSurface } from '@/hooks/use-preload-surface';
```

Signature:

```ts
function usePreloadSurface(preload: () => Promise<unknown>): void
```

It fires the preload once after the component mounts (via `useEffect`) and stabilises the function reference with a `ref` to prevent `exhaustive-deps` ESLint errors.

---

## Where to call `usePreloadSurface`

### Field components

A field component that always opens a surface on interaction should call `usePreloadSurface` for that surface inside the field:

```tsx
export function TaskReadyByDateField() {
  usePreloadSurface(preloadCalendarSinglePickerSurface);
  // ...
}
```

### Form containers with multi-step layouts

`StagedForm` only renders the **active step's children** — non-active steps are unmounted. This means field-level `usePreloadSurface` calls only fire when the step containing the field becomes active.

To start preloading immediately when the form mounts (before the user reaches the relevant step), hoist `usePreloadSurface` calls to the **form container level** for every surface reachable from any step:

```tsx
export function ReturnFormContent() {
  // Hoisted: fire on form mount, not on step activation
  usePreloadSurface(preloadCalendarSinglePickerSurface);
  usePreloadSurface(preloadCalendarRangePickerSurface);
  usePreloadSurface(preloadItemCategoryPickerSurface);
  usePreloadSurface(preloadPhoneCountryPickerSurface);
  // ...
}
```

**Rule:** Any form that uses `StagedForm` must hoist `usePreloadSurface` for all calendar, picker, and sheet surfaces that appear on any step.

---

## Surface registration pattern (this app)

```ts
// features/<domain>/surfaces.ts
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';
import { lazyWithPreload } from '@/utils/lazy-with-preload';

function loadDomainPickerPage() {
  return import('@/features/<domain>/pages/DomainPickerPage').then((m) => ({
    default: m.DomainPickerPage,
  }));
}

const domainPicker = lazyWithPreload(loadDomainPickerPage);

export const preloadDomainPickerSurface = domainPicker.preload;

export const domainSurfaces: SurfaceRegistrations = {
  'domain-picker': {
    surface: 'sheet',
    component: domainPicker.Component,
  },
};
```

Export `preloadDomainPickerSurface` from `features/<domain>/index.ts` when fields or form containers outside the feature need it.

---

## Playwright verification

The absence of a skeleton on surface open is testable and should be tested for every surface that has a `usePreloadSurface` hoist.

Pattern:

1. Install a `MutationObserver` on `document.body` before triggering the open.
2. Open the surface.
3. Assert the surface content is visible.
4. Assert the observer never detected `[data-testid="surface-skeleton"]`.

Use `page.waitForResponse` with the Vite dev-server module URL to confirm the preload has resolved before clicking, making the test deterministic. See `tests/playwright/features/surfaces/surface-preload.spec.ts` for the reference implementation.
