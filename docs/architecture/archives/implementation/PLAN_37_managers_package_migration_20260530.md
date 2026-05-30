# PLAN_37_managers_package_migration_20260530

## Metadata

- Plan ID: `PLAN_37_managers_package_migration_20260530`
- Status: `archived`
- Owner agent: `copilot`
- Created at (UTC): `2026-05-30T00:00:00Z`
- Last updated at (UTC): `2026-05-30T10:06:11Z`
- Related issue/ticket: `user-brief-2026-05-30`
- Intention plan: `user-defined directly — no separate intention file`

---

## Goal and intent

- **Goal:** Migrate the managers app (`apps/managers-app/ManagerBeyo-app-managers`) to import `@beyo/styles`, `@beyo/api-client`, `@beyo/auth`, `@beyo/cases`, and `@beyo/images` from the shared workspace packages instead of using its own local feature copies.
- **Business/user intent:** The packages have been validated in the workers app. The managers app — the original source of the extracted code — must now consume the same packages to keep a single source of truth and eliminate maintained duplicates.
- **Non-goals:**
  - Migrating `@beyo/tasks`, `@beyo/upholstery`, `@beyo/hooks`, or `@beyo/item-categories` (separate future plan).
  - Modifying any package source file.
  - Deleting the original local feature files. They are **moved to `package_migration_backup/`** as a safety backup, not destroyed.
  - Running E2E tests (out of scope for this plan).

---

## Scope

- **In scope:**
  - `apps/managers-app/ManagerBeyo-app-managers/package.json` — add 6 package dependencies
  - `npm install` from `frontend/` root
  - `src/index.css` — migrate to `@beyo/styles`
  - `src/lib/api-client.ts`, `src/lib/auth-token.ts`, `src/lib/env.ts` — convert to proxy re-exports
  - 4 files importing `@/features/auth` — redirect to `@beyo/auth`
  - `src/features/cases/surfaces.ts` — rewrite as lean app-level registration
  - `src/app/surface-registry.ts` — update cases and images imports
  - 5 pages in `src/pages/cases/` — redirect deep feature imports to `@beyo/cases`
  - 2 app-specific components (`CaseTaskInfoCard`, `CaseTaskInfoSheetContent`) — move to `src/components/cases/`, refactor `CaseTaskInfoSheetContent` to be self-contained
  - New Step 22: wire `renderLinkedTaskCard` at the conversation opener call site
  - 5 files importing `@/features/images` in non-image features — redirect to `@beyo/images`
  - Back up `src/features/auth/`, `src/features/cases/` (full original), `src/features/images/`, and the 3 `lib/` files to `package_migration_backup/managers-app/`
  - `npm run typecheck` and `npm run build` pass with zero errors

- **Out of scope:**
  - Modifying any file under `packages/`
  - Modifying any file under `apps/workers-app/`
  - Any E2E or Playwright specs
  - Feature behaviour changes

- **Assumptions:**
  - The workspace symlinks for the packages in scope already exist under `frontend/node_modules/@beyo/` (they were installed for the workers app). If not, `npm install` will create them.
  - All package peer dependencies that the managers app already satisfies (react, zod, framer-motion, etc.) are listed in the existing `package.json` and do not require version changes.
  - The `package_migration_backup/` directory does not need to be a git-tracked folder — it is a local safety net only.

---

## Clarifications required

*(none blocking — all information confirmed from source files)*

---

## Acceptance criteria

1. `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers` exits with zero TypeScript errors.
2. `npm run build` in `apps/managers-app/ManagerBeyo-app-managers` exits with zero errors.
3. No file in `src/` imports from `@/features/auth`, `@/features/cases` (except the lean `surfaces.ts`), or `@/features/images`.
4. `src/features/auth/` folder is absent from `src/`.
5. `src/features/images/` folder is absent from `src/`.
6. `src/features/cases/` contains only `surfaces.ts` (lean app registration).
7. `package_migration_backup/managers-app/` contains the original copies of the moved feature folders and lib files.
8. `src/lib/api-client.ts`, `src/lib/auth-token.ts`, `src/lib/env.ts` are thin re-export proxies pointing to `@beyo/api-client`.
9. `src/utils/lazy-with-preload.ts` is deleted — all surface files import `lazyWithPreload` from `@beyo/ui`.

---

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: primary contract — defines the source-package philosophy, `peerDependencies` rules, `@source` directives, migration cycle (§9 Step 5–6), surface registration ownership (§13), and package catalogue (§7).

### Local extensions loaded

*(none — this plan does not involve writing new feature code)*

### File read intent — pattern vs. relational

All reads in this plan are **relational** (understanding what exists), not pattern reads:
- Reading `features/cases/surfaces.ts` — to know which surfaces to keep and which lazy loaders to replicate.
- Reading `pages/cases/*.tsx` — to identify exact import paths that need updating.
- Reading `features/images/surfaces.ts` — to confirm it is fully self-contained in the package.
- Reading `packages/cases/src/surface-ids.ts` — to verify available surface ID constants.
- Reading `packages/images/src/index.ts` — to verify exported symbols.

### Skill selection

- Primary skill: N/A — this is a mechanical migration, not a feature build.
- Excluded alternatives: all feature-build skills — this plan only moves imports and backs up files.

---

## Implementation plan

Execute steps **in order**. Do not reorder phases. Do not skip the backup steps.

---

### Phase 0 — Add packages and install

**Step 1 — Update `apps/managers-app/ManagerBeyo-app-managers/package.json`**

Add the following entries to the `"dependencies"` object:

```json
"@beyo/styles": "*",
"@beyo/api-client": "*",
"@beyo/auth": "*",
"@beyo/cases": "*",
"@beyo/hooks": "*",
"@beyo/images": "*"
```

Rationale for `@beyo/hooks`: it is a `peerDependency` of both `@beyo/cases` and `@beyo/images`. Without it the workspace peer resolution will warn and the packages may fail to resolve their hook imports.

**Step 2 — Run npm install**

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

Verify that `node_modules/@beyo/styles`, `@beyo/api-client`, `@beyo/auth`, `@beyo/cases`, `@beyo/hooks`, and `@beyo/images` are each symlinks pointing into `packages/`.

---

### Phase 1 — @beyo/styles: migrate index.css

**Step 3 — Rewrite `apps/managers-app/ManagerBeyo-app-managers/src/index.css`**

Apply these changes **to the existing file** (do not create a new one):

1. After `@import "tailwindcss";` (line 1), insert:
   ```css
   @import "@beyo/styles";
   ```

2. After the two existing `@source` lines, add three more:
   ```css
   @source "../../../../packages/auth/src";
   @source "../../../../packages/cases/src";
   @source "../../../../packages/images/src";
   ```

3. Delete the entire `@theme { … }` block (the 11 design-token variables from `--color-background` to `--color-info-pill-border`). These are now provided by `@beyo/styles`.

4. Delete the global reset rules that `@beyo/styles` now provides:
   - The `*, *::before, *::after { box-sizing: border-box; }` block
   - The `html, body, #root { height: 100%; overflow: hidden; }` block
   - The `html, body { overscroll-behavior: none; }` block
   - The `body { margin: 0; background: …; color: …; font-family: …; }` block

5. From the `:root { … }` block, delete the four safe-area inset variables (`--safe-top`, `--safe-bottom`, `--safe-left`, `--safe-right`). They are now in `@beyo/styles`. **Keep** `--case-composer-color-accent: #d85f1d;`.

6. **Keep unchanged** (do not delete):
   - `.test-colors { … }` helper class
   - The `:root { --case-composer-color-accent: … }` entry (after removing safe-area vars)
   - All `@keyframes` blocks: `camera-flash`, `image-edit-shake`, `case-composer-inline-shake`, `case-composer-inline-pulse`
   - All animation utility classes: `.animate-camera-flash`, `.animate-image-edit-shake`, `.case-message-animation-shake`, `.case-message-animation-pulse`

The final file header should read:

```css
@import "tailwindcss";
@import "@beyo/styles";
@source "../../../../packages/ui/src";
@source "../../../../packages/tasks/src";
@source "../../../../packages/auth/src";
@source "../../../../packages/cases/src";
@source "../../../../packages/images/src";
```

---

### Phase 2 — @beyo/api-client: convert lib files to re-export proxies

**Step 4 — Back up the three lib source files**

Create the backup directory and copy before modifying:

```
package_migration_backup/managers-app/lib/api-client.ts   ← copy of src/lib/api-client.ts
package_migration_backup/managers-app/lib/auth-token.ts   ← copy of src/lib/auth-token.ts
package_migration_backup/managers-app/lib/env.ts          ← copy of src/lib/env.ts
```

(`package_migration_backup/` is at the monorepo root: `frontend/package_migration_backup/`)

**Step 5 — Overwrite each lib file with a proxy re-export**

`src/lib/api-client.ts` — full new content:
```ts
export { apiClient, ApiRequestError } from '@beyo/api-client';
```

`src/lib/auth-token.ts` — full new content:
```ts
export {
  getAccessToken,
  setAccessToken,
  decodeTokenClaims,
  refreshAccessToken,
  initSession,
} from '@beyo/api-client';
```

`src/lib/env.ts` — full new content:
```ts
export { env } from '@beyo/api-client';
```

**Why proxy files instead of global search-and-replace:** the `tasks`, `items`, `customers`, and other local features (which are not in this migration's scope) import from `@/lib/api-client`. Proxy re-exports let them continue working without touching dozens of unrelated files.

---

### Phase 3 — @beyo/auth: redirect 4 import sites then backup

**Step 6 — Update `src/app/router.tsx`**

Change line 4:
```ts
// Before
import { GuestRoute, ProtectedRoute } from '@/features/auth';
// After
import { GuestRoute, ProtectedRoute } from '@beyo/auth';
```

**Step 7 — Update `src/app/RootRoute.tsx`**

Change line 2:
```ts
// Before
import { AuthProvider } from '@/features/auth';
// After
import { AuthProvider } from '@beyo/auth';
```

**Step 8 — Update `src/features/settings/controllers/use-settings-view.controller.ts`**

Change the `useSignOutMutation` import:
```ts
// Before
import { useSignOutMutation } from '@/features/auth';
// After
import { useSignOutMutation } from '@beyo/auth';
```

**Step 9 — Update `src/pages/auth/SignInPage.tsx`**

Change:
```ts
// Before
import { SignInForm } from "@/features/auth";
// After
import { SignInForm } from '@beyo/auth';
```

**Step 10 — Back up then delete `src/features/auth/`**

```
package_migration_backup/managers-app/features/auth/   ← copy of entire src/features/auth/
```

Then delete `src/features/auth/` from `src/`.

---

### Phase 4 — @beyo/cases: preserve app-specific components, rewrite surfaces, redirect pages

> **Prerequisite:** Plan 38 (`PLAN_38_case_task_info_to_cases_package_20260530`) must be completed and verified before executing this phase. Plan 38 adds the `renderTaskCard` render slot to `@beyo/cases` — it updates `CaseConversationSurfaceProps`, `CaseTaskInfoSheetSurfaceProps`, `CaseConversationRouteEntry`, `CaseConversationProvider`, and `useCaseConversationController`. Steps 12 and 13 below remain correct — `CaseTaskInfoCard` and `CaseTaskInfoSheetContent` stay as app-local components. Steps 18, 20, and 22 in this phase require Plan 38's new types to be available in `@beyo/cases`.

#### Step 11 — Back up the full original `src/features/cases/`

Copy the entire folder **before** making any changes:

```
package_migration_backup/managers-app/features/cases/   ← copy of entire src/features/cases/
```

#### Step 12 — Create `src/components/cases/CaseTaskInfoCard.tsx`

This component is **not** exported by `@beyo/cases` — it is app-specific (references `@/features/tasks` internals). Copy it from `src/features/cases/components/CaseTaskInfoCard.tsx` to `src/components/cases/CaseTaskInfoCard.tsx` and apply **one import change**:

```ts
// Before
import { IMAGE_VIEWER_SURFACE_ID } from "@/features/images/surfaces";
// After
import { IMAGE_VIEWER_SURFACE_ID } from "@beyo/images";
```

All other imports in the file remain unchanged (they reference `@/features/tasks`, `@/components/primitives`, `@/hooks/use-surface` — none of which are being migrated in this plan).

#### Step 13 — Create `src/components/cases/CaseTaskInfoSheetContent.tsx`

This component is also not exported by `@beyo/cases`. Copy it from `src/features/cases/components/CaseTaskInfoSheetContent.tsx` to `src/components/cases/CaseTaskInfoSheetContent.tsx` and apply the following changes:

**Import change:**
```ts
// Before
import { CaseTaskInfoCard } from "@/features/cases/components/CaseTaskInfoCard";
// After
import { CaseTaskInfoCard } from "@/components/cases/CaseTaskInfoCard";
```

**Refactor to self-contained (required for render slot wiring in step 22):**

The component currently receives `taskDetail`, `isPending`, `isError`, and `onRetry` as props from the page. After this step, `CaseTaskInfoSheetPage.tsx` no longer fetches task data — the component must do its own fetching. Make the following changes to the copied file:

1. Add import: `import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';`
2. Remove `taskDetail`, `isPending`, `isError`, and `onRetry` from the component's props interface — `taskId: string` is the only required prop.
3. Inside the component, replace the four removed props with internal state:
   ```ts
   const taskQuery = useGetTaskQuery(taskId);
   const taskDetail = taskQuery.data;
   const isPending = taskQuery.isPending;
   const isError = taskQuery.isError;
   const onRetry = taskQuery.refetch;
   ```

The component's render logic is otherwise unchanged.

#### Step 14 — Rewrite `src/features/cases/surfaces.ts`

Replace the entire file content with the lean app-level surface registration below. Import IDs and types from `@beyo/cases`; import `lazyWithPreload` and `SurfaceRegistrations` from `@beyo/ui`:

```ts
import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  type CaseConversationSurfaceProps,
} from "@beyo/cases";

import { buildCaseConversationRoute } from "@/lib/routes";

function loadCaseConversationSlidePage() {
  return import("@/pages/cases/CaseConversationSlidePage").then((module) => ({
    default: module.CaseConversationSlidePage,
  }));
}

function loadCaseTaskInfoSheetPage() {
  return import("@/pages/cases/CaseTaskInfoSheetPage").then((module) => ({
    default: module.CaseTaskInfoSheetPage,
  }));
}

function loadCaseMessageActionsSheetPage() {
  return import("@/pages/cases/CaseMessageActionsSheetPage").then((module) => ({
    default: module.CaseMessageActionsSheetPage,
  }));
}

const caseConversationSlide = lazyWithPreload(loadCaseConversationSlidePage);
const caseTaskInfoSheet = lazyWithPreload(loadCaseTaskInfoSheetPage);
const caseMessageActionsSheet = lazyWithPreload(loadCaseMessageActionsSheetPage);

export const caseSurfaces: SurfaceRegistrations = {
  [CASE_CONVERSATION_SURFACE_ID]: {
    surface: "slide",
    path: (props) =>
      buildCaseConversationRoute(
        (props as CaseConversationSurfaceProps).caseClientId,
      ),
    component: caseConversationSlide.Component,
  },
  [CASE_TASK_INFO_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseTaskInfoSheet.Component,
  },
  [CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseMessageActionsSheet.Component,
  },
};
```

**Note on `lazyWithPreload` import source:** the managers app currently imports from `@/utils/lazy-with-preload`. After this change it comes from `@beyo/ui`. The `@/utils/lazy-with-preload.ts` file is NOT deleted by this plan — it may still be used by `features/tasks/surfaces.ts`, `features/working-sections/surfaces.ts`, etc. Only `features/cases/surfaces.ts` changes its import source.

#### Step 15 — Delete all files in `src/features/cases/` except `surfaces.ts`

After completing steps 11–14, the `src/features/cases/` folder should contain **only** the lean `surfaces.ts` written in step 14. Delete everything else:
- `src/features/cases/actions/`
- `src/features/cases/api/`
- `src/features/cases/components/`
- `src/features/cases/config.ts`
- `src/features/cases/controllers/`
- `src/features/cases/index.ts`
- `src/features/cases/lib/`
- `src/features/cases/message-content.ts`
- `src/features/cases/providers/`
- `src/features/cases/route-entry.tsx`
- `src/features/cases/types.ts`

#### Step 16 — Update `src/app/surface-registry.ts` (cases import)

Change line 2:
```ts
// Before
import { caseSurfaces } from '@/features/cases';
// After
import { caseSurfaces } from '@/features/cases/surfaces';
```

*(The `imageSurfaces` import on line 3 will be updated in Phase 5.)*

#### Step 17 — Update `src/pages/cases/CasesPage.tsx`

Change the lazy import inside the file:
```tsx
// Before
const CasesRouteEntry = lazy(() =>
  import('@/features/cases/route-entry').then((module) => ({
    default: module.CasesRouteEntry,
  })),
);

// After
const CasesRouteEntry = lazy(() =>
  import('@beyo/cases').then((module) => ({
    default: module.CasesRouteEntry,
  })),
);
```

#### Step 18 — Update `src/pages/cases/CaseConversationSlidePage.tsx`

Rewrite the file completely. The two import changes migrate to `@beyo/cases`; the render also forwards `surfaceOpeners` from surface props to the route entry (required by Plan 38's render slot):

```tsx
import { useParams } from 'react-router-dom';

import { CaseConversationRouteEntry } from '@beyo/cases';
import type { CaseConversationSurfaceProps } from '@beyo/cases';
import { useSurfaceProps } from '@/hooks/use-surface-props';

export function CaseConversationSlidePage(): React.JSX.Element {
  const params = useParams<{ caseId: string }>();
  const surfaceProps = useSurfaceProps<CaseConversationSurfaceProps>();
  const caseClientId = (params.caseId ?? surfaceProps.caseClientId) as
    | CaseConversationSurfaceProps['caseClientId']
    | undefined;

  if (!caseClientId) {
    return <div className="bg-background p-6 text-sm text-muted-foreground">Case id is missing.</div>;
  }

  return (
    <CaseConversationRouteEntry
      caseClientId={caseClientId}
      surfaceOpeners={surfaceProps.surfaceOpeners}
    />
  );
}
```

#### Step 19 — Update `src/pages/cases/CaseConversationPage.tsx`

Change the lazy import inside the file:
```tsx
// Before
const CaseConversationRouteHydrator = lazy(() =>
  import('@/features/cases/components/CaseConversationRouteHydrator').then((module) => ({
    default: module.CaseConversationRouteHydrator,
  })),
);

// After
const CaseConversationRouteHydrator = lazy(() =>
  import('@beyo/cases').then((module) => ({
    default: module.CaseConversationRouteHydrator,
  })),
);
```

#### Step 20 — Rewrite `src/pages/cases/CaseTaskInfoSheetPage.tsx`

The page no longer imports `CaseTaskInfoSheetContent` or fetches task data. It reads `renderTaskCard` from surface props (injected by the conversation opener in step 22) and calls it with `taskId`. Write the full file:

```tsx
import { useEffect } from 'react';

import type { CaseTaskInfoSheetSurfaceProps } from '@beyo/cases';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

export function CaseTaskInfoSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, renderTaskCard } = useSurfaceProps<CaseTaskInfoSheetSurfaceProps>();

  useEffect(() => {
    header?.setTitle('Task info');
    header?.setActions(null);
  }, [header]);

  if (!taskId) {
    return (
      <div
        className="bg-background p-4 text-sm text-muted-foreground"
        data-testid="case-task-info-sheet"
      >
        Task id is missing.
      </div>
    );
  }

  return (
    <div className="bg-background" data-testid="case-task-info-sheet">
      {renderTaskCard ? renderTaskCard(taskId) : null}
    </div>
  );
}
```

#### Step 21 — Update `src/pages/cases/CaseMessageActionsSheetPage.tsx`

Three import changes:

```ts
// Before
import { dispatchCaseMessageEditRequest } from '@/features/cases/lib/case-message-edit-events';
import {
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  type CaseMessageActionsSheetSurfaceProps,
} from '@/features/cases/surfaces';

// After
import { dispatchCaseMessageEditRequest } from '@beyo/cases';
import {
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  type CaseMessageActionsSheetSurfaceProps,
} from '@beyo/cases';
```

*(These can be merged into a single `import { … } from '@beyo/cases'` statement.)*

#### Step 22 — Wire `renderLinkedTaskCard` at the conversation opener

The `CASE_CONVERSATION_SURFACE_ID` is opened somewhere in the managers app. Find the exact call site:

```bash
grep -r 'CASE_CONVERSATION_SURFACE_ID' apps/managers-app/ManagerBeyo-app-managers/src --include="*.ts" --include="*.tsx" | grep 'surface.open'
```

In the file(s) that call `surface.open(CASE_CONVERSATION_SURFACE_ID, ...)`, add `surfaceOpeners` to the props object and import `CaseTaskInfoSheetContent` from `@/components/cases/CaseTaskInfoSheetContent`:

```ts
// Before:
surface.open(CASE_CONVERSATION_SURFACE_ID, {
  caseClientId,
});

// After:
surface.open(CASE_CONVERSATION_SURFACE_ID, {
  caseClientId,
  surfaceOpeners: {
    renderLinkedTaskCard: (taskId: string) => <CaseTaskInfoSheetContent taskId={taskId} />,
  },
});
```

Add to the imports at the top of that file:
```ts
import { CaseTaskInfoSheetContent } from '@/components/cases/CaseTaskInfoSheetContent';
```

**Note:** `CaseTaskInfoSheetContent` (refactored in step 13) is now self-contained — it calls `useGetTaskQuery(taskId)` internally and renders `CaseTaskInfoCard`. The render function passed here is called by the package's `useCaseConversationController.openInfo()` when the user taps the info button in the conversation.

---

### Phase 5 — @beyo/images: update surface-registry and consumer files then backup

**Step 23 — Update `src/app/surface-registry.ts` (images import)**

Change:
```ts
// Before
import { imageSurfaces } from '@/features/images';
// After
import { imageSurfaces } from '@beyo/images';
```

The `imageSurfaces` export in `@beyo/images` is fully self-contained (it lazy-loads the package's own pages). No app-level surface file is needed for images. The import in `surface-registry.ts` is the only images-related change in that file.

**Step 24 — Update `src/features/tasks/components/detail/TaskImagesSection.tsx`**

```ts
// Before
import { EntityImagesProvider, ImagePreviewGrid } from "@/features/images";
// After
import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
```

**Step 25 — Update `src/features/task-creation/components/InternalFormContent.tsx`**

```ts
// Before
import { EntityImagesProvider, ImagePreviewGrid } from "@/features/images";
// After
import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
```

**Step 26 — Update `src/features/task-creation/components/ReturnFormContent.tsx`**

```ts
// Before
import { EntityImagesProvider, ImagePreviewGrid } from "@/features/images";
// After
import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
```

**Step 27 — Update `src/features/task-creation/components/PreOrderFormContent.tsx`**

```ts
// Before
import { EntityImagesProvider, ImagePreviewGrid } from "@/features/images";
// After
import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
```

**Step 28 — Update `src/features/testing_forms/components/TestingFormsContent.tsx`**

```ts
// Before
import { EntityImagesProvider, ImagePreviewGrid } from "@/features/images";
// After
import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
```

**Step 29 — Back up then delete `src/features/images/`**

Copy before deleting:
```
package_migration_backup/managers-app/features/images/   ← copy of entire src/features/images/
```

Then delete `src/features/images/` from `src/`.

---

### Phase 6 — Consolidate `lazyWithPreload` to `@beyo/ui`

These four local surface files still import `lazyWithPreload` from the managers app's own `@/utils/lazy-with-preload`. Since `@beyo/ui` is already a dependency and is the canonical source (the workers app has no local copy at all), update each file and then delete the local util.

**Step 30 — Update `src/features/tasks/surfaces.ts`**

```ts
// Before
import { lazyWithPreload } from "@/utils/lazy-with-preload";
// After
import { lazyWithPreload } from "@beyo/ui";
```

**Step 31 — Update `src/features/upholstery/surfaces.ts`**

```ts
// Before
import { lazyWithPreload } from '@/utils/lazy-with-preload';
// After
import { lazyWithPreload } from '@beyo/ui';
```

**Step 32 — Update `src/features/working-sections/surfaces.ts`**

```ts
// Before
import { lazyWithPreload } from '@/utils/lazy-with-preload';
// After
import { lazyWithPreload } from '@beyo/ui';
```

**Step 33 — Update `src/features/phone-input/surfaces.ts`**

```ts
// Before
import { lazyWithPreload } from '@/utils/lazy-with-preload';
// After
import { lazyWithPreload } from '@beyo/ui';
```

**Step 34 — Delete `src/utils/lazy-with-preload.ts`**

After steps 30–33 there are zero remaining imports of this file. Delete it.

Verify before deleting:
```bash
grep -r "lazy-with-preload" apps/managers-app/ManagerBeyo-app-managers/src --include="*.ts" --include="*.tsx"
```
Expected: no output. If any result appears, update that file first.

---

### Phase 7 — Validation

**Step 35 — TypeScript type-check**

```bash
cd apps/managers-app/ManagerBeyo-app-managers
npm run typecheck
```

Expected result: exits 0, zero errors. If errors appear, they will be import resolution errors — cross-reference them with the import change table below.

**Step 36 — Production build**

```bash
npm run build
```

Expected result: exits 0. The Vite build will traverse `@beyo/*` package source through the workspace symlinks and compile them as part of the app bundle.

---

## Import change reference table

| File | Old import path | New import path |
|---|---|---|
| `src/app/router.tsx` | `@/features/auth` | `@beyo/auth` |
| `src/app/RootRoute.tsx` | `@/features/auth` | `@beyo/auth` |
| `src/features/settings/controllers/use-settings-view.controller.ts` | `@/features/auth` | `@beyo/auth` |
| `src/pages/auth/SignInPage.tsx` | `@/features/auth` | `@beyo/auth` |
| `src/app/surface-registry.ts` (cases) | `@/features/cases` | `@/features/cases/surfaces` |
| `src/app/surface-registry.ts` (images) | `@/features/images` | `@beyo/images` |
| `src/features/cases/surfaces.ts` (IDs) | local definitions | `@beyo/cases` |
| `src/features/cases/surfaces.ts` (lazy-preload) | `@/utils/lazy-with-preload` | `@beyo/ui` |
| `src/features/cases/surfaces.ts` (SurfaceRegistrations type) | `@/providers/SurfaceProvider` | `@beyo/ui` |
| `src/pages/cases/CasesPage.tsx` | `@/features/cases/route-entry` | `@beyo/cases` |
| `src/pages/cases/CaseConversationSlidePage.tsx` (component) | `@/features/cases/components/CaseConversationRouteEntry` | `@beyo/cases` |
| `src/pages/cases/CaseConversationSlidePage.tsx` (type) | `@/features/cases/surfaces` | `@beyo/cases` |
| `src/pages/cases/CaseConversationPage.tsx` | `@/features/cases/components/CaseConversationRouteHydrator` | `@beyo/cases` |
| `src/pages/cases/CaseTaskInfoSheetPage.tsx` (type) | `@/features/cases/surfaces` | `@beyo/cases` |
| `src/pages/cases/CaseMessageActionsSheetPage.tsx` (event) | `@/features/cases/lib/case-message-edit-events` | `@beyo/cases` |
| `src/pages/cases/CaseMessageActionsSheetPage.tsx` (IDs+types) | `@/features/cases/surfaces` | `@beyo/cases` |
| `src/components/cases/CaseTaskInfoCard.tsx` | `@/features/images/surfaces` (IMAGE_VIEWER_SURFACE_ID) | `@beyo/images` |
| `src/components/cases/CaseTaskInfoSheetContent.tsx` | `@/features/cases/components/CaseTaskInfoCard` | `@/components/cases/CaseTaskInfoCard` |
| `src/features/tasks/components/detail/TaskImagesSection.tsx` | `@/features/images` | `@beyo/images` |
| `src/features/task-creation/components/InternalFormContent.tsx` | `@/features/images` | `@beyo/images` |
| `src/features/task-creation/components/ReturnFormContent.tsx` | `@/features/images` | `@beyo/images` |
| `src/features/task-creation/components/PreOrderFormContent.tsx` | `@/features/images` | `@beyo/images` |
| `src/features/testing_forms/components/TestingFormsContent.tsx` | `@/features/images` | `@beyo/images` |
| `src/features/tasks/surfaces.ts` | `@/utils/lazy-with-preload` | `@beyo/ui` |
| `src/features/upholstery/surfaces.ts` | `@/utils/lazy-with-preload` | `@beyo/ui` |
| `src/features/working-sections/surfaces.ts` | `@/utils/lazy-with-preload` | `@beyo/ui` |
| `src/features/phone-input/surfaces.ts` | `@/utils/lazy-with-preload` | `@beyo/ui` |

**Notes on Phase 4 render slot changes (not simple import swaps):**
- `CaseConversationSlidePage.tsx`: also passes `surfaceOpeners={surfaceProps.surfaceOpeners}` to `CaseConversationRouteEntry` — no new import but a prop addition.
- `CaseTaskInfoSheetPage.tsx`: entire page rewritten — no longer imports or renders `CaseTaskInfoSheetContent`; reads `renderTaskCard` from surface props.
- Conversation opener (step 22): new import of `CaseTaskInfoSheetContent` from `@/components/cases/CaseTaskInfoSheetContent`; passes `renderLinkedTaskCard` in surface props.

---

## Backup directory layout

After all backup steps are complete:

```
frontend/
  package_migration_backup/
    managers-app/
      lib/
        api-client.ts     ← original content (before proxy)
        auth-token.ts     ← original content (before proxy)
        env.ts            ← original content (before proxy)
      features/
        auth/             ← original src/features/auth/ (full tree)
        cases/            ← original src/features/cases/ (full tree, pre-lean)
        images/           ← original src/features/images/ (full tree)
```

---

## Risks and mitigations

- **Risk:** `@beyo/cases` peer dependency on `@beyo/hooks` causes resolution errors if `@beyo/hooks` is not in the managers app's `package.json`.
  **Mitigation:** Step 1 explicitly adds `@beyo/hooks: "*"`.

- **Risk:** Phase 6 updates 4 surface files to use `@beyo/ui` for `lazyWithPreload`. If any other file imports `@/utils/lazy-with-preload` that was not found by the initial grep, deleting it in step 34 will cause a TypeScript error.
  **Mitigation:** Step 34 includes an explicit `grep` verification before deletion. If output appears, update that file before deleting.

- **Risk:** `CaseTaskInfoCard.tsx` imports `GetTaskResult` and task-detail lib from `@/features/tasks` — these are NOT being migrated. If `features/tasks/` is moved in a future plan, this file will need updating.
  **Mitigation:** Out of scope for this plan. Noted here for the next migration plan.

- **Risk:** `CaseTaskInfoSheetPage.tsx` renders `{renderTaskCard ? renderTaskCard(taskId) : null}`. If the conversation opener (step 22) is missed or the `surfaceOpeners` is not wired, the sheet opens but renders blank.
  **Mitigation:** The blank render is a visible failure during development. Step 22 covers all call sites using the grep command.

- **Risk:** Deleting `src/features/cases/components/` removes test files (`CaseMessageBubble.test.tsx`, `CaseMessageImageGrid.test.tsx`).
  **Mitigation:** They are preserved in `package_migration_backup/managers-app/features/cases/components/`. They can be restored or re-homed if needed.

- **Risk:** The `@theme` block removal from `index.css` and reliance on `@import "@beyo/styles"` requires Vite to correctly resolve the CSS package export. Vite uses the `exports` field in `@beyo/styles/package.json` (`"." → "./src/index.css"`).
  **Mitigation:** This is the same mechanism that works in the workers app. If it fails, verify `node_modules/@beyo/styles` is a symlink.

---

## Validation plan

- `npm run typecheck` (in `apps/managers-app/ManagerBeyo-app-managers`): zero TypeScript errors
- `npm run build` (in `apps/managers-app/ManagerBeyo-app-managers`): zero Vite build errors
- Visual smoke test (optional, not required by this plan): open the managers app in dev mode and verify sign-in, cases list, case conversation, and task creation with images all render correctly.

---

## Review log

*(to be filled by reviewer)*

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user (David)`
