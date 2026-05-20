# PLAN_test_feature_surface_interaction_20260519

## Metadata

- Plan ID: `PLAN_test_feature_surface_interaction_20260519`
- Status: `archived`
- Owner agent: `codex-gpt-5`
- Created at (UTC): `2026-05-19T00:00:00Z`
- Last updated at (UTC): `2026-05-19T17:59:47Z`
- Related issue/ticket: `—`
- Intention plan: `—`

---

## Goal and intent

- **Goal:** Add a `test_feature` vertical slice that exercises the full surface stacking system (sheet + slide, nested). Three pages: a root launcher, a bottom-sheet surface page, and a full-page slide surface page. Each surface page has a close button and a button to open the other surface from within, enabling nesting tests.
- **Business/user intent:** Verify that `BottomSheetSurface` (Vaul) and `SlidePageSurface` (Framer Motion) animate correctly when opened, closed, and stacked on top of each other.
- **Non-goals:** Auth integration, server state, TanStack Query, Zod validation, real domain data, Playwright tests.

---

## Scope

- **In scope:**
  - Extend `SurfaceHeaderValue` with a `requestClose` callback so surface content can trigger animated close without importing shell internals.
  - Update `BottomSheetSurface` and `SlidePageSurface` to provide `requestClose` in `SurfaceHeaderContext`.
  - Build `test_feature` following the full `01_architecture.md` folder structure: `controllers/`, `providers/`, `components/`, `surfaces.ts`, `index.ts`.
  - Register the two test surfaces in `surface-registry.ts`.
  - Replace the stub `HomePage` with the test feature launcher.

- **Out of scope:**
  - Any additional routes beyond `/` (the existing home route).
  - Unit or Playwright tests.
  - `SurfaceRouteFrame` / URI-enabled surfaces (no `path` on test surfaces).
  - Any shared UI component abstraction (raw Tailwind elements only).

- **Assumptions:**
  - The `SurfaceRenderer` null-guard bug was already fixed (always renders `AnimatePresence` portal). Do NOT reintroduce the early return.
  - The `ProtectedRoute` is permissive in DEV (`!import.meta.env.DEV` guard), so auth is not a blocker.
  - Tailwind v4 CSS variable utilities (`bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground`) are already registered in `src/index.css` via `@theme`.

---

## Clarifications required

*(None — all decisions are resolved in this plan.)*

---

## Acceptance criteria

1. Navigating to `/` renders a "Surface Test Lab" page with two buttons: **Open Bottom Sheet** and **Open Slide Page**.
2. Tapping **Open Bottom Sheet** opens a `BottomSheetSurface` with: a drag handle, a header row showing "Test Sheet" and an **✕** close button, a description paragraph, and an **Open Slide from Sheet** button.
3. The **✕** button closes the sheet with Vaul's spring exit animation (no instant disappearance).
4. Tapping **Open Slide Page** opens a `SlidePageSurface` that pushes in from the right with Framer Motion, shows "Test Slide" in the shell header, a **‹** back button (closes with slide-out animation), a description paragraph, and an **Open Sheet from Slide** button.
5. Opening a second surface from within the first surface stacks them correctly (both remain in the Zustand stack; the newer one renders at higher z-index).
6. Closing the top surface reveals the surface beneath it with no visual glitch.
7. `npm run typecheck` passes with zero errors.
8. `npm run build` produces a clean build.

---

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: folder structure, hard dependency rules, layer map, provider pattern
- `architecture/11_routing.md`: lazy route helper; surface content is NOT a route, but the lazy-import pattern applies
- `architecture/23_providers.md`: context/provider boundary; controller → provider → component chain
- `architecture/28_surfaces.md`: surface registry shape, `SurfaceRegistration` type, open/close contract
- `architecture/28_surfaces_local.md`: app-specific surface types (`slide`, `sheet`, `modal`); no `drawer`; Vaul 350ms close contract
- `architecture/31_animations.md`: Framer Motion exit animation rules; `AnimatePresence` must stay mounted

### Local extensions loaded

- `architecture/28_surfaces_local.md`: `SURFACE_SHELLS` map; `BottomSheetSurface` 350ms delayed close contract

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`.

Permitted relational reads:
- `src/providers/SurfaceProvider.tsx` — to see the exact `SurfaceHeaderValue` type and `SurfaceHeaderContext` declaration before adding `requestClose`
- `src/components/surfaces/BottomSheetSurface.tsx` — to see the exact context value object literal before adding `requestClose: handleClose`
- `src/components/surfaces/SlidePageSurface.tsx` — same as above for `requestClose: onClose`
- `src/app/surface-registry.ts` — to see the current empty registry before adding test surfaces
- `src/pages/HomePage.tsx` — to see the current stub before replacing it

Prohibited:
- Reading other feature folders to copy controller/provider shape → use `architecture/23_providers.md` instead
- Reading other surface components for the animation pattern → use `architecture/31_animations.md`

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`
- Trigger terms: `feature`, `surface`, `test`, `provider`, `controller`
- Excluded alternatives: none

---

## Implementation plan

### Part A — Extend `SurfaceHeaderContext` with `requestClose`

**Step 1 — Add `requestClose` to `SurfaceHeaderValue` type**

File: `src/providers/SurfaceProvider.tsx`

Change the exported type:
```ts
// BEFORE
export type SurfaceHeaderValue = {
  setTitle: (title: string) => void;
  setActions: (actions: ReactNode) => void;
};

// AFTER
export type SurfaceHeaderValue = {
  setTitle: (title: string) => void;
  setActions: (actions: ReactNode) => void;
  requestClose: () => void;
};
```

No other changes to this file.

---

**Step 2 — Provide `requestClose: handleClose` in `BottomSheetSurface`**

File: `src/components/surfaces/BottomSheetSurface.tsx`

Find the `SurfaceHeaderContext.Provider` value object and add `requestClose`:
```tsx
// BEFORE
<SurfaceHeaderContext.Provider value={{ setTitle, setActions }}>

// AFTER
<SurfaceHeaderContext.Provider value={{ setTitle, setActions, requestClose: handleClose }}>
```

`handleClose` already exists in this file (the 350ms Vaul delayed close). No new logic needed.

---

**Step 3 — Provide `requestClose: onClose` in `SlidePageSurface`**

File: `src/components/surfaces/SlidePageSurface.tsx`

```tsx
// BEFORE
<SurfaceHeaderContext.Provider value={{ setTitle, setActions }}>

// AFTER
<SurfaceHeaderContext.Provider value={{ setTitle, setActions, requestClose: onClose }}>
```

`onClose` is the prop passed from `SurfaceRenderer`. Calling it removes the slide from the Zustand stack, which causes `AnimatePresence` to fire the `exit={{ x: '100%' }}` animation on the `m.div`. This is the correct animated close path for slides.

---

### Part B — Build the `test_feature` vertical slice

Follow `architecture/01_architecture.md` folder structure exactly.

---

**Step 4 — Controller**

Create: `src/features/test_feature/controllers/use-test-surface.controller.ts`

```ts
import { useSurface } from '@/hooks/use-surface';

export type TestSurfaceController = {
  openSheet: () => void;
  openSlide: () => void;
};

export function useTestSurfaceController(): TestSurfaceController {
  const { open } = useSurface();
  return {
    openSheet: () => open('test-sheet'),
    openSlide: () => open('test-slide'),
  };
}
```

Rules:
- Controllers may import from `hooks/` (shared utility hooks). ✓
- The surface IDs `'test-sheet'` and `'test-slide'` match exactly what will be registered in `surfaces.ts` (Step 9).
- Do NOT include a `requestClose` here — see Step 7 for how surface content handles close.

---

**Step 5 — Provider**

Create: `src/features/test_feature/providers/TestSurfaceProvider.tsx`

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import {
  useTestSurfaceController,
  type TestSurfaceController,
} from '../controllers/use-test-surface.controller';

const TestSurfaceContext = createContext<TestSurfaceController | null>(null);

export function useTestSurfaceContext(): TestSurfaceController {
  const ctx = useContext(TestSurfaceContext);
  if (ctx === null) {
    throw new Error('useTestSurfaceContext must be used inside TestSurfaceProvider');
  }
  return ctx;
}

type Props = { children: ReactNode };

export function TestSurfaceProvider({ children }: Props): React.JSX.Element {
  const ctrl = useTestSurfaceController();
  return (
    <TestSurfaceContext.Provider value={ctrl}>
      {children}
    </TestSurfaceContext.Provider>
  );
}
```

---

**Step 6 — `TestLauncher` component (root page UI)**

Create: `src/features/test_feature/components/TestLauncher.tsx`

```tsx
import { useTestSurfaceContext } from '../providers/TestSurfaceProvider';

export function TestLauncher(): React.JSX.Element {
  const { openSheet, openSlide } = useTestSurfaceContext();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Surface Test Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test surface stacking: open, nest, and close sheet and slide surfaces.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          className="rounded-xl bg-foreground px-5 py-4 text-left text-background"
          onClick={openSheet}
          type="button"
        >
          <div className="font-semibold">Open Bottom Sheet</div>
          <div className="mt-0.5 text-xs opacity-60">sheet surface · Vaul drag-dismiss</div>
        </button>

        <button
          className="rounded-xl bg-foreground px-5 py-4 text-left text-background"
          onClick={openSlide}
          type="button"
        >
          <div className="font-semibold">Open Slide Page</div>
          <div className="mt-0.5 text-xs opacity-60">slide surface · Framer Motion push</div>
        </button>
      </div>
    </div>
  );
}
```

---

**Step 7 — `TestSheetContent` component**

Create: `src/features/test_feature/components/TestSheetContent.tsx`

This component renders inside `BottomSheetSurface`. It:
- Reads `useSurfaceHeader()` to get `requestClose` for the close button.
- Reads `useTestSurfaceContext()` to open the slide surface.
- Does NOT call `setTitle`/`setActions` — it renders its own header row at the top of the content area instead. This avoids the `useEffect` stale-closure risk with `setActions`.

```tsx
import { useTestSurfaceContext } from '../providers/TestSurfaceProvider';
import { useSurfaceHeader } from '@/hooks/use-surface-header';

export function TestSheetContent(): React.JSX.Element {
  const { openSlide } = useTestSurfaceContext();
  const header = useSurfaceHeader();

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Test Sheet</span>
        <button
          aria-label="Close sheet"
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-muted"
          onClick={() => header?.requestClose()}
          type="button"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">
          This is the <strong>bottom sheet</strong> surface. Dismiss by dragging down, tapping ✕,
          or opening another surface on top.
        </p>

        <button
          className="rounded-xl bg-foreground px-5 py-4 text-left text-background"
          onClick={openSlide}
          type="button"
        >
          <div className="font-semibold">Open Slide from Sheet</div>
          <div className="mt-0.5 text-xs opacity-60">Stacks a slide surface on top</div>
        </button>
      </div>
    </div>
  );
}
```

**Architecture note on `useSurfaceHeader()` in a feature component:**
Surface content components are a special case: they must communicate with their surrounding shell (provided by `BottomSheetSurface`/`SlidePageSurface` via `SurfaceHeaderContext`). Calling `useSurfaceHeader()` here reads from a React context injected by the shell — it is NOT a logic-layer import. This is an accepted pattern for surface content.

**Close animation guarantee:**
`header?.requestClose()` calls `handleClose()` inside `BottomSheetSurface`. `handleClose`:
1. Sets `isOpen = false` so Vaul begins its spring exit animation.
2. Waits 350ms.
3. Then calls `onClose()` which removes the surface from the Zustand stack.

This preserves the Vaul animation. Do NOT call `useSurface().close('test-sheet')` directly — that would remove the entry from the stack immediately, bypassing the Vaul animation and causing an instant disappearance.

---

**Step 8 — `TestSlideContent` component**

Create: `src/features/test_feature/components/TestSlideContent.tsx`

This component renders inside `SlidePageSurface`. The shell already provides a header bar with a **‹** back button (calls `onClose` → animated slide-out). This IS the close button. We use `useSurfaceHeader().setTitle()` to populate the title in that existing header.

```tsx
import { useEffect } from 'react';
import { useTestSurfaceContext } from '../providers/TestSurfaceProvider';
import { useSurfaceHeader } from '@/hooks/use-surface-header';

export function TestSlideContent(): React.JSX.Element {
  const { openSheet } = useTestSurfaceContext();
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle('Test Slide');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-sm text-muted-foreground">
        This is the <strong>slide page</strong> surface. Use the <strong>‹</strong> button in the
        header to close with a slide-out animation.
      </p>

      <button
        className="rounded-xl bg-foreground px-5 py-4 text-left text-background"
        onClick={openSheet}
        type="button"
      >
        <div className="font-semibold">Open Sheet from Slide</div>
        <div className="mt-0.5 text-xs opacity-60">Stacks a sheet surface on top</div>
      </button>
    </div>
  );
}
```

**Note on `useEffect` with `[]` deps:**
`header?.setTitle('Test Slide')` is called once on mount with a string constant. The lint suppression is intentional: `header` is from `SurfaceHeaderContext` which is provided by `SlidePageSurface`. It is stable for the surface's lifetime, so running the effect only on mount is correct. The `setTitle` setter is a `useState` dispatcher — always stable.

---

**Step 9 — `surfaces.ts`**

Create: `src/features/test_feature/surfaces.ts`

```ts
import { lazy } from 'react';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const testSurfaces: SurfaceRegistrations = {
  'test-sheet': {
    surface: 'sheet',
    component: lazy(() =>
      import('@/pages/test_feature/TestSheetPage').then((m) => ({
        default: m.TestSheetPage,
      })),
    ),
  },
  'test-slide': {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/test_feature/TestSlidePage').then((m) => ({
        default: m.TestSlidePage,
      })),
    ),
  },
};
```

Notes:
- No `path` property — these are state-only surfaces (no URI).
- The lazy import targets `src/pages/test_feature/` page files (created in Steps 11–12). These page files wrap the content component in `TestSurfaceProvider` so the provider is available when the lazy chunk loads.
- `SurfaceRenderer` already adds a `<Suspense fallback={<SurfaceSkeleton>}>` around each lazy surface component. The page file should NOT add another Suspense around its synchronous content.

---

**Step 10 — `index.ts` (public API)**

Create: `src/features/test_feature/index.ts`

```ts
export { TestSurfaceProvider } from './providers/TestSurfaceProvider';
export { TestLauncher } from './components/TestLauncher';
export { TestSheetContent } from './components/TestSheetContent';
export { TestSlideContent } from './components/TestSlideContent';
export { testSurfaces } from './surfaces';
```

---

### Part C — Thin page files in `src/pages/`

Per `01_architecture.md`, pages are thin components that own the provider + Suspense + ErrorBoundary. These two page files are the lazy entry points registered in `surfaces.ts`.

---

**Step 11 — `TestSheetPage`**

Create: `src/pages/test_feature/TestSheetPage.tsx`

```tsx
import { TestSurfaceProvider, TestSheetContent } from '@/features/test_feature';

export function TestSheetPage(): React.JSX.Element {
  return (
    <TestSurfaceProvider>
      <TestSheetContent />
    </TestSurfaceProvider>
  );
}
```

No Suspense needed here — `SurfaceRenderer` already wraps the lazy import in `<Suspense fallback={<SurfaceSkeleton>}>`.

---

**Step 12 — `TestSlidePage`**

Create: `src/pages/test_feature/TestSlidePage.tsx`

```tsx
import { TestSurfaceProvider, TestSlideContent } from '@/features/test_feature';

export function TestSlidePage(): React.JSX.Element {
  return (
    <TestSurfaceProvider>
      <TestSlideContent />
    </TestSurfaceProvider>
  );
}
```

---

### Part D — Wire into the app

---

**Step 13 — Register surfaces in `surface-registry.ts`**

File: `src/app/surface-registry.ts`

```ts
import { testSurfaces } from '@/features/test_feature';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
```

After this change, `SurfaceId = 'test-sheet' | 'test-slide'`. TypeScript will validate all `open()` call-sites if they are typed to use `SurfaceId`.

---

**Step 14 — Replace `HomePage` stub with test launcher**

File: `src/pages/HomePage.tsx`

```tsx
import { TestSurfaceProvider, TestLauncher } from '@/features/test_feature';

export function HomePage(): React.JSX.Element {
  return (
    <TestSurfaceProvider>
      <TestLauncher />
    </TestSurfaceProvider>
  );
}
```

The existing `router.tsx` already routes `/` → lazy `HomePage`. No router changes needed.

---

## File manifest

| Action | Path |
|--------|------|
| **MODIFY** | `src/providers/SurfaceProvider.tsx` |
| **MODIFY** | `src/components/surfaces/BottomSheetSurface.tsx` |
| **MODIFY** | `src/components/surfaces/SlidePageSurface.tsx` |
| **MODIFY** | `src/app/surface-registry.ts` |
| **MODIFY** | `src/pages/HomePage.tsx` |
| **CREATE** | `src/features/test_feature/controllers/use-test-surface.controller.ts` |
| **CREATE** | `src/features/test_feature/providers/TestSurfaceProvider.tsx` |
| **CREATE** | `src/features/test_feature/components/TestLauncher.tsx` |
| **CREATE** | `src/features/test_feature/components/TestSheetContent.tsx` |
| **CREATE** | `src/features/test_feature/components/TestSlideContent.tsx` |
| **CREATE** | `src/features/test_feature/surfaces.ts` |
| **CREATE** | `src/features/test_feature/index.ts` |
| **CREATE** | `src/pages/test_feature/TestSheetPage.tsx` |
| **CREATE** | `src/pages/test_feature/TestSlidePage.tsx` |

All paths are relative to `apps/managers-app/ManagerBeyo-app-managers/src/`.

---

## Risks and mitigations

- **Risk:** `SurfaceRenderer` early-return null guard was already fixed. If the fix is reverted or not present, Framer Motion exit animations on `SlidePageSurface` will not fire when the last slide closes.
  **Mitigation:** Before implementing Steps 1–3, verify that `SurfaceRenderer` in `SurfaceProvider.tsx` does NOT have `if (stateOverlays.length === 0) return null;`. The correct code always renders the portal with `AnimatePresence`. If the null guard is present, remove it first.

- **Risk:** Calling `useSurface().close('test-sheet')` directly from content bypasses Vaul's exit animation.
  **Mitigation:** `TestSheetContent` MUST close the sheet only via `header?.requestClose()` → `handleClose()` in `BottomSheetSurface`. This is enforced by the `requestClose` pattern added in Steps 1–3. Never call `close()`, `closeTop()`, or `closeAll()` on the sheet from content directly.

- **Risk:** `setActions` in a `useEffect` captures a stale `header` reference, resulting in a close button that calls an old `handleClose` instance.
  **Mitigation:** `TestSheetContent` does NOT use `setActions`. It renders its own header row directly in JSX. The close button reads `header?.requestClose()` inline (not from an effect closure), so it always calls the current context value. `TestSlideContent` only calls `setTitle` (string constant) — no stale-closure risk.

- **Risk:** `surfaces.ts` lazy imports target `@/pages/test_feature/TestSheetPage` which doesn't exist until Step 11 is complete. TypeScript will error if steps are run out of order.
  **Mitigation:** Complete all CREATE steps (4–12) before the MODIFY steps (13–14), or complete all steps in order.

- **Risk:** Opening the same surface twice (`'test-sheet'` already open → open again) moves it to the top of the stack rather than opening a second instance. This is intentional behavior per the `SurfaceProvider` store.
  **Mitigation:** No mitigation needed — this is the designed behavior. Document it as expected in the test lab copy if needed.

- **Risk:** `TestSurfaceProvider` re-renders whenever `SurfaceHeaderContext` changes (because `useTestSurfaceController` calls `useSurface()` which is stable via Zustand, but the effect only affects the `requestClose`-path which is NOT in the controller). Since `TestSurfaceProvider` does NOT call `useSurfaceHeader()`, this re-render chain does not occur. The controller only calls `useSurface()` (Zustand stable refs). ✓

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors. The `requestClose` addition to `SurfaceHeaderValue` will cause type errors in `BottomSheetSurface` and `SlidePageSurface` until Steps 2–3 are complete. Finish all steps before checking.
- `npm run build`: clean build, no warnings.
- `npm run test`: not run (no tests added in this plan).
- Manual smoke test (run `npm run dev`, open browser at `http://localhost:5173`):
  1. `/` shows "Surface Test Lab" with two buttons.
  2. "Open Bottom Sheet" → sheet slides up with Vaul animation, shows drag handle + "Test Sheet" header + ✕ + description + slide button.
  3. ✕ on sheet → sheet spring-exits downward (Vaul animation, NOT instant disappearance).
  4. "Open Slide Page" → slide pushes in from right (Framer Motion), shows "Test Slide" title + ‹ button + description + sheet button.
  5. ‹ on slide → slide exits to the right (Framer Motion exit animation).
  6. Open Sheet → from sheet open Slide → slide covers sheet → ‹ on slide → sheet is visible again.
  7. Open Slide → from slide open Sheet → sheet covers slide → ✕ on sheet → slide is visible again.

---

## Review log

- `2026-05-19` `codex-gpt-5`: Implemented the `test_feature` slice, updated the shared surface close contract, and validated the build with `npm run typecheck` and `npm run build`.

---

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `codex-gpt-5`
