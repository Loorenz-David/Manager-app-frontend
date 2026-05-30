> Extends: 30_dynamic_loading.md

# 30 — Dynamic Loading — ManagerBeyo App Extension (both apps)

## `lazyWithPreload` utility location

The utility lives in `packages/ui/src/lib/lazy-with-preload.ts` and is exported from `@beyo/ui`.

```ts
import { lazyWithPreload } from "@beyo/ui";
```

Every surface registration in both apps **must** use `lazyWithPreload`. Bare `React.lazy()` is not permitted for surface components.

---

## `usePreloadSurface` hook

The app-local hook for firing bundle preloads on component mount lives at `src/hooks/use-preload-surface.ts` in each app.

```ts
import { usePreloadSurface } from "@/hooks/use-preload-surface";
```

Signature:

```ts
function usePreloadSurface(preload: () => Promise<unknown>): void;
```

It fires the preload once after the component mounts (via `useEffect`) and stabilises the function reference with a `ref` to prevent `exhaustive-deps` ESLint errors.

**Bundle preload only.** For data prefetch alongside bundle preload, use `usePrefetchOnCondition` from `@beyo/ui` instead — see the Data prefetch pattern section below.

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

## Surface registration pattern (both apps)

```ts
// features/<domain>/surfaces.ts
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { lazyWithPreload } from "@beyo/ui";

function loadDomainPickerPage() {
  return import("@/features/<domain>/pages/DomainPickerPage").then((m) => ({
    default: m.DomainPickerPage,
  }));
}

const domainPicker = lazyWithPreload(loadDomainPickerPage);

export const preloadDomainPickerSurface = domainPicker.preload;

export const domainSurfaces: SurfaceRegistrations = {
  "domain-picker": {
    surface: "sheet",
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

---

## Data prefetch pattern (`prefetchXxx`)

For every surface that loads data on mount, the feature's `surfaces.ts` (or a companion
`prefetch.ts`) must export a `prefetchXxxData(queryClient, params?)` function alongside the
`preloadXxx` bundle preload export.

### Naming convention

| Bundle preload                        | Data prefetch                                             |
| ------------------------------------- | --------------------------------------------------------- |
| `preloadCaseConversationSlideSurface` | `prefetchCasesData(queryClient, caseIds)`                 |
| `preloadTaskDetailSlideSurface`       | `prefetchWorkingSectionStepsData(queryClient, sectionId)` |

### Where to put it

- If the data fetch function is already in the feature's `api/` layer, the prefetch function
  is a thin wrapper that calls `queryClient.prefetchQuery` with the existing key and fn.
- Place the wrapper in `features/<domain>/api/prefetch-<domain>.ts` or inline in `surfaces.ts`
  when it is short.
- Export from `features/<domain>/index.ts` when callers outside the feature need it.

### `usePrefetchOnCondition`

Imported from `@beyo/ui`. Fires once per mount when `condition` becomes true. Pair with both
a bundle preload and a data prefetch:

```tsx
import { usePrefetchOnCondition } from "@beyo/ui";

usePrefetchOnCondition(unreadCaseIds.length > 0, () =>
  Promise.all([
    preloadCaseConversationSlideSurface(),
    prefetchCasesData(queryClient, unreadCaseIds),
  ]),
);
```

**Important:** The `prefetch` callback is kept current via a "latest ref" pattern inside the
hook — it is always the closure from the most recent render when the effect fires. This means
you can safely close over reactive variables (`unreadCaseIds`, `activeSections`, etc.) in the
callback even when those variables are `undefined` or empty on the first render. The effect
only fires once condition becomes true, by which point the latest closure captures the correct
values.

Do **not** use `usePreloadSurface` for this pattern — it does not update its ref and is only
safe for module-level constant preload functions.
```

### `staleTime` for prefetched queries

Match `staleTime` to the query hook that owns the key. If the query hook uses
`staleTime: 30_000`, the prefetch call must also use `staleTime: 30_000`. Mismatched
`staleTime` causes an immediate refetch when the component mounts and reads the cache.

### `hasRun` behaviour and session semantics

`usePrefetchOnCondition` fires once per component lifecycle. It does **not** re-prefetch
if data is refreshed and new items qualify (e.g. new unread cases arrive after the initial
prefetch). This is intentional for session-based signals. For live-updated signals
(e.g. unread counts changing while the user is active), combine with the real-time
query invalidation layer — the surface data will be warm for the initial open and
refreshed via the query cache thereafter.
