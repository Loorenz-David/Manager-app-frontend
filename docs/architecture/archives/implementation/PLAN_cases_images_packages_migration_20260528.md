# PLAN_cases_images_packages_migration_20260528

## Metadata

- Plan ID: `PLAN_cases_images_packages_migration_20260528`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-05-28T00:00:00Z`
- Last updated at (UTC): `2026-05-28T10:00:49Z`
- Related issue/ticket: —
- Intention plan: —

---

## Goal and intent

- **Goal:** Create `@beyo/images` and `@beyo/cases` shared packages from the managers app feature code, then wire both packages into the workers app so workers can use the full cases and images features.
- **Business/user intent:** Both apps share a common case management and image workflow. The package pattern ensures both apps stay in sync and workers app can deliver the cases feature without duplicating code.
- **Non-goals:** Migrating the managers app to consume these packages (that is a separate plan). Workers-app task detail integration is out of scope — the controller will show fallback labels and task info sheet is deferred.

---

## Scope

- **In scope:**
  - Create `packages/images/` with all files from `features/images/` (including pages)
  - Create `packages/cases/` with all files from `features/cases/` except app-specific files listed in §DO NOT TOUCH
  - Parameterize the case conversation controller to remove app-specific imports
  - Add `@beyo/images` and `@beyo/cases` to workers app
  - Install missing npm deps in workers app
  - Implement workers app case pages using the packages
  - Register image + case surfaces in workers app surface registry
- **Out of scope:**
  - Managers app consuming the packages (separate plan)
  - Task detail integration in workers app (workers task feature does not exist yet)
  - `CaseTaskInfoSheetPage` for workers (deferred — requires workers task feature)
- **Assumptions:**
  - `@beyo/lib`, `@beyo/api-client`, `@beyo/auth`, `@beyo/ui`, `@beyo/hooks` are already scaffolded and working
  - Workers app builds and type-checks clean before this plan starts
  - All `npm install` commands run from `frontend/` root, never from inside a package or app

---

## Clarifications required

None — all ambiguities resolved in research phase.

---

## Acceptance criteria

1. `@beyo/images` package exists at `packages/images/` with valid `package.json`, `tsconfig.json`, and `src/index.ts` barrel.
2. `@beyo/cases` package exists at `packages/cases/` with valid `package.json`, `tsconfig.json`, and `src/index.ts` barrel.
3. Workers app `npm run build` exits 0 — no build errors.
4. Workers app `npm run typecheck` exits 0 — zero TypeScript errors.
5. Workers app `/cases` route renders the cases list using `CasesView` from `@beyo/cases`.
6. Workers app navigating into a case opens the `CaseConversationSlideView` with the composer.
7. Workers app image viewer surface opens when tapping a message image.

---

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: governs package.json template, peerDependencies rules, @source directive requirement, TypeScript config

### File read intent — pattern vs. relational

Permitted (relational reads):

- Reading managers app feature files to see exact current imports
- Reading workers app existing pages/router/providers to understand what already exists

---

## DO NOT TOUCH — workers app files that must not be modified

These files were scaffolded by a previous plan. Copilot must not change them:

- `apps/workers-app/ManagerBeyo-app-workers/src/app/App.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/AppShell.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/RootRoute.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/TabOutlet.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/SurfaceRouteFrame.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/router.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/main.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/features/auth/`
- `apps/workers-app/ManagerBeyo-app-workers/playwright.config.ts`

---

## Critical path order

The steps MUST be executed in this order. Later steps depend on earlier ones.

```
Phase 1  →  Create @beyo/images package
Phase 2  →  Create @beyo/cases package
Phase 3  →  Add packages + missing deps to workers app package.json
Phase 4  →  npm install from frontend/
Phase 5  →  Update workers app index.css @source directives
Phase 6  →  Update workers app lib/routes.ts
Phase 7  →  Create workers app features/cases/surfaces.ts
Phase 8  →  Implement workers app case pages
Phase 9  →  Update workers app surface registry
Phase 10 →  Validate
```

---

## Import mapping reference (memorise these — apply consistently)

When copying any file from `features/images/` or `features/cases/` into a package, every `@/` import must be replaced as follows.

### For ALL package files (images + cases)

| Old `@/` import                                                                | Replace with       |
| ------------------------------------------------------------------------------ | ------------------ |
| `@/lib/api-client` → `apiClient`, `ApiRequestError`                            | `@beyo/api-client` |
| `@/types/api` → `ApiEnvelopeSchema`                                            | `@beyo/lib`        |
| `@/lib/utils` → `cn`                                                           | `@beyo/lib`        |
| `@/lib/client-id` → `generateClientId`, `ClientIdSchema`, `CLIENT_ID_REGEX`    | `@beyo/lib`        |
| `@/lib/notify` → `notify`                                                      | `@beyo/lib`        |
| `@/types/common` → `CaseId`, `UserId`, etc.                                    | `@beyo/lib`        |
| `@/store/auth.store` → `selectUser`, `useAuthStore`                            | `@beyo/auth`       |
| `@/hooks/use-surface` → `useSurface`                                           | `@beyo/hooks`      |
| `@/hooks/use-surface-header` → `useSurfaceHeader`                              | `@beyo/hooks`      |
| `@/hooks/use-surface-props` → `useSurfaceProps`                                | `@beyo/hooks`      |
| `@/providers/SurfaceProvider` → `SurfaceRegistrations`, `useSurfaceStore`      | `@beyo/ui`         |
| `@/components/primitives` → any primitive component                            | `@beyo/ui`         |
| `@/components/primitives/scroll-visibility` → `ScrollVisibilityProvider`, etc. | `@beyo/ui`         |
| `@/components/ui/...` → `PageSkeleton`, `RouteErrorBoundary`, etc.             | `@beyo/ui`         |

### For `@beyo/cases` package files only

| Old `@/` import                                                                       | Replace with                                   |
| ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `@/features/images/types` → `ImageAnnotationSchema`, `ImageViewModel`                 | `@beyo/images`                                 |
| `@/features/images/providers/EntityImagesProvider`                                    | `@beyo/images`                                 |
| `@/features/images/components/ImageAddPictureButton`                                  | `@beyo/images`                                 |
| `@/features/images/components/ImageAnnotationSvgLayer`                                | `@beyo/images`                                 |
| `@/features/images/components/ImageUploadOverlay`                                     | `@beyo/images` (not exported — see note below) |
| `@/features/images/surfaces` → `IMAGE_VIEWER_SURFACE_ID`, `preloadImageCameraSurface` | `@beyo/images`                                 |
| `@/features/images/actions/use-delete-image`                                          | `@beyo/images`                                 |
| `@/features/images/api/use-image`                                                     | `@beyo/images`                                 |
| `@/features/images/...` (any other path)                                              | `@beyo/images`                                 |
| `../surfaces` (relative to old cases location) → `CASE_CONVERSATION_SURFACE_ID`, etc. | `../surface-ids` (within cases package)        |

### Imports that are REMOVED (not mapped)

These imports only appear in app-specific files that are NOT moved to the package:

- `@/features/tasks/...` — tasks-feature imports are in `CaseTaskInfoCard`, `CaseTaskInfoSheetContent`, and `use-case-conversation.controller.ts`. For the controller, task code is stripped (see Phase 2 §controller).
- `@/lib/routes` → only used in `surfaces.ts` (stays in app) and `use-case-conversation.controller.ts` (replaced with hardcoded `/cases` path, see Phase 2 §controller).
- `@/utils/lazy-with-preload` → only used in `surfaces.ts` (stays in app, imports `lazyWithPreload` from `@beyo/ui`).
- `@/features/images/test-utils` → only in test files (not copied to packages).

---

## Phase 1: Create `@beyo/images` package

### 1.1 Create directory structure

Create the following new directories (no files yet):

```
packages/images/
packages/images/src/
packages/images/src/actions/
packages/images/src/api/
packages/images/src/components/
packages/images/src/controllers/
packages/images/src/hooks/
packages/images/src/lib/
packages/images/src/pages/
packages/images/src/providers/
packages/images/src/store/
```

### 1.2 Create `packages/images/package.json`

```json
{
  "name": "@beyo/images",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/api-client": "*",
    "@beyo/hooks": "*",
    "@beyo/lib": "*",
    "@beyo/ui": "*",
    "@dnd-kit/core": ">=6.0.0",
    "@dnd-kit/sortable": ">=10.0.0",
    "@dnd-kit/utilities": ">=3.0.0",
    "@tanstack/react-query": ">=5.0.0",
    "konva": ">=10.0.0",
    "react": ">=19.0.0",
    "react-dom": ">=19.0.0",
    "react-konva": ">=19.0.0",
    "zod": ">=4.0.0",
    "zustand": ">=5.0.0"
  }
}
```

### 1.3 Create `packages/images/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "types": ["node", "vite/client"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true
  },
  "include": ["src"]
}
```

### 1.4 Copy source files to `packages/images/src/`

Copy every `.ts` and `.tsx` file from `apps/managers-app/ManagerBeyo-app-managers/src/features/images/` to `packages/images/src/`, preserving the subdirectory structure.

**DO NOT copy:**

- `*.test.ts` and `*.test.tsx` files (stay in managers app)
- `test-utils.tsx`

The following directories and files map exactly:

```
features/images/index.ts               → packages/images/src/index.ts
features/images/types.ts               → packages/images/src/types.ts
features/images/surfaces.ts            → packages/images/src/surfaces.ts
features/images/preload.ts             → packages/images/src/preload.ts
features/images/actions/*.ts           → packages/images/src/actions/*.ts
features/images/api/*.ts               → packages/images/src/api/*.ts
features/images/components/*.tsx       → packages/images/src/components/*.tsx
features/images/controllers/*.ts       → packages/images/src/controllers/*.ts
features/images/hooks/*.ts             → packages/images/src/hooks/*.ts
features/images/lib/*.ts               → packages/images/src/lib/*.ts
features/images/pages/*.tsx            → packages/images/src/pages/*.tsx
features/images/providers/*.tsx        → packages/images/src/providers/*.tsx
features/images/store/*.ts             → packages/images/src/store/*.ts
```

### 1.5 Apply import replacements in `packages/images/src/`

After copying, apply these replacements to every file in `packages/images/src/`. Use the import mapping table from the reference section above.

**`surfaces.ts` specifically:**

Old:

```typescript
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
```

New:

```typescript
import type { SurfaceRegistrations } from "@beyo/ui";
```

Also in `surfaces.ts`, the dynamic page imports MUST use relative paths (they already point to `./pages/...` structure since pages are inside the feature directory). Change:

```typescript
return import('@/features/images/pages/ImageCameraPage')...
```

to:

```typescript
return import('./pages/ImageCameraPage')...
```

Apply this to ALL seven page imports in `surfaces.ts`.

**Pages files (`packages/images/src/pages/*.tsx`) specifically:**

Each page file imports from `@/providers/SurfaceProvider` (for `useSurfaceStore`), `@/hooks/...`, `@/components/...`, etc. Apply the full import mapping table. Pages are allowed to import from their own package (using relative paths like `../surfaces`, `../types`, `../components/...`).

**`controllers/use-entity-images.controller.ts` specifically:**

This file likely imports `useSurface` from `@/hooks/use-surface` and surface IDs from `../surfaces` (relative — stays as-is since it's within the package).

### 1.6 Create `packages/images/src/index.ts`

The barrel must re-export everything that the `@beyo/cases` package and consuming apps need:

```typescript
// Surface IDs and registrations
export {
  IMAGE_CAMERA_SURFACE_ID,
  IMAGE_VIEWER_SURFACE_ID,
  IMAGE_METADATA_SURFACE_ID,
  IMAGE_EDITOR_SURFACE_ID,
  IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID,
  IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID,
  IMAGE_ANNOTATION_ACTIONS_SURFACE_ID,
  imageSurfaces,
  preloadImageCameraSurface,
  preloadImageViewerSurface,
} from "./surfaces";
export type {
  ImageAnnotationToolPickerSurfaceProps,
  ImageEditorDiscardChangesSurfaceProps,
  ImageAnnotationActionsSurfaceProps,
} from "./surfaces";

// Types
export {
  IMAGE_STORAGE_PROVIDER,
  IMAGE_SOURCE_TYPE,
  IMAGE_SOURCE_REFERENCE,
  IMAGE_EVENT_TYPE,
  IMAGE_EVENT_STATE,
  IMAGE_EVENT_LAST_ERROR,
  IMAGE_ANNOTATION_TYPE,
  IMAGE_LINK_ENTITY_TYPE,
  ImageAnnotationSchema,
  toImageAnnotationViewModel,
  toImageViewModel,
  buildImageAnnotationPayload,
} from "./types";
export type {
  ImageAnnotationType,
  ImageLinkEntityType,
  ImageUploadState,
  ImageViewModel,
  ImageAnnotationViewModel,
  AnnotatedCanvasItem,
  ImageAnnotationTool,
} from "./types";

// Provider
export {
  EntityImagesProvider,
  useEntityImagesContext,
} from "./providers/EntityImagesProvider";
export type { EntityImagesController } from "./controllers/use-entity-images.controller";

// Components
export { ImagePreviewGrid } from "./components/ImagePreviewGrid";
export { ImageAddPictureButton } from "./components/ImageAddPictureButton";
export { ImageSortableGrid } from "./components/ImageSortableGrid";
export { ImageAnnotationSvgLayer } from "./components/ImageAnnotationSvgLayer";
export { ImageUploadOverlay } from "./components/ImageUploadOverlay";

// API hooks
export { useEntityImagesQuery } from "./api/use-entity-images";
export { useImageQuery } from "./api/use-image";

// Action hooks
export { useDeleteImage } from "./actions/use-delete-image";

// Preload (re-export from preload.ts)
export {
  preloadImageCameraSurface as preloadImageCamera,
  preloadImageViewerSurface as preloadImageViewer,
} from "./preload";
```

**Note:** Export exactly the names that `@beyo/cases` source files import. Check the cases import mapping table above for the exact names needed. If a name is imported in cases but missing here, add it.

---

## Phase 2: Create `@beyo/cases` package

### 2.1 Create directory structure

```
packages/cases/
packages/cases/src/
packages/cases/src/actions/
packages/cases/src/api/
packages/cases/src/components/
packages/cases/src/components/composer/
packages/cases/src/controllers/
packages/cases/src/lib/
packages/cases/src/providers/
```

### 2.2 Create `packages/cases/package.json`

```json
{
  "name": "@beyo/cases",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/api-client": "*",
    "@beyo/auth": "*",
    "@beyo/hooks": "*",
    "@beyo/images": "*",
    "@beyo/lib": "*",
    "@beyo/ui": "*",
    "@lexical/react": ">=0.44.0",
    "@lexical/selection": ">=0.44.0",
    "@lexical/utils": ">=0.44.0",
    "@tanstack/react-query": ">=5.0.0",
    "framer-motion": ">=12.0.0",
    "lexical": ">=0.44.0",
    "react": ">=19.0.0",
    "react-dom": ">=19.0.0",
    "react-textarea-autosize": ">=8.0.0",
    "react-virtuoso": ">=4.0.0",
    "zod": ">=4.0.0"
  }
}
```

### 2.3 Create `packages/cases/tsconfig.json`

Same template as `packages/images/tsconfig.json` (identical content).

### 2.4 Create `packages/cases/src/surface-ids.ts` (NEW FILE — does not exist in managers app)

This file exports the surface IDs and surface prop types. The full surface registrations (with lazy page imports) live in each app's `features/cases/surfaces.ts`.

```typescript
import type { CaseId } from "@beyo/lib";

export const CASE_CONVERSATION_SURFACE_ID = "case-conversation-slide";
export const CASE_TASK_INFO_SHEET_SURFACE_ID = "case-task-info-sheet";
export const CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID =
  "case-message-actions-sheet";

export type CaseConversationSurfaceProps = {
  caseClientId: CaseId;
};

export type CaseTaskInfoSheetSurfaceProps = {
  caseClientId: CaseId;
  taskId: string;
};

export type CaseMessageActionsSheetSurfaceProps = {
  caseClientId: string;
  messageClientId: string;
  messageSeq: number;
  messageText: string;
  canEdit: boolean;
  canDelete: boolean;
  onRequestDelete?: () => Promise<void>;
};
```

### 2.5 Copy source files to `packages/cases/src/`

Copy files from `apps/managers-app/ManagerBeyo-app-managers/src/features/cases/` to `packages/cases/src/`, with these exceptions:

**DO NOT copy these files (they stay in each app):**

- `surfaces.ts` — will be recreated in each app
- `components/CaseTaskInfoCard.tsx` — requires tasks feature
- `components/CaseTaskInfoSheetContent.tsx` — requires tasks feature

**DO NOT copy test files:**

- `*.test.ts`, `*.test.tsx`
- `lib/message-content-adapter.test.ts`

**Copy everything else:**

```
features/cases/index.ts                              → packages/cases/src/index.ts  (REPLACE content — see §2.8)
features/cases/types.ts                              → packages/cases/src/types.ts
features/cases/config.ts                             → packages/cases/src/config.ts
features/cases/message-content.ts                   → packages/cases/src/message-content.ts
features/cases/route-entry.tsx                       → packages/cases/src/route-entry.tsx
features/cases/api/case-keys.ts                      → packages/cases/src/api/case-keys.ts
features/cases/api/add-participants.ts               → packages/cases/src/api/add-participants.ts
features/cases/api/create-case.ts                    → packages/cases/src/api/create-case.ts
features/cases/api/delete-message.ts                 → packages/cases/src/api/delete-message.ts
features/cases/api/edit-message.ts                   → packages/cases/src/api/edit-message.ts
features/cases/api/get-case.ts                       → packages/cases/src/api/get-case.ts
features/cases/api/get-unread-counts.ts              → packages/cases/src/api/get-unread-counts.ts
features/cases/api/link-entity.ts                    → packages/cases/src/api/link-entity.ts
features/cases/api/list-case-links.ts                → packages/cases/src/api/list-case-links.ts
features/cases/api/list-case-participants.ts         → packages/cases/src/api/list-case-participants.ts
features/cases/api/list-cases.ts                     → packages/cases/src/api/list-cases.ts
features/cases/api/list-messages.ts                  → packages/cases/src/api/list-messages.ts
features/cases/api/mark-read.ts                      → packages/cases/src/api/mark-read.ts
features/cases/api/send-message.ts                   → packages/cases/src/api/send-message.ts
features/cases/api/update-case-state.ts              → packages/cases/src/api/update-case-state.ts
features/cases/api/use-case-conversation-messages.ts → packages/cases/src/api/use-case-conversation-messages.ts
features/cases/api/use-case-links.ts                 → packages/cases/src/api/use-case-links.ts
features/cases/api/use-case-participants.ts          → packages/cases/src/api/use-case-participants.ts
features/cases/api/use-get-case.ts                   → packages/cases/src/api/use-get-case.ts
features/cases/api/use-list-cases.ts                 → packages/cases/src/api/use-list-cases.ts
features/cases/api/use-unread-counts.ts              → packages/cases/src/api/use-unread-counts.ts
features/cases/actions/use-delete-case-message.ts    → packages/cases/src/actions/use-delete-case-message.ts
features/cases/actions/use-edit-case-message.ts      → packages/cases/src/actions/use-edit-case-message.ts
features/cases/actions/use-mark-case-read.ts         → packages/cases/src/actions/use-mark-case-read.ts
features/cases/actions/use-send-case-message.ts      → packages/cases/src/actions/use-send-case-message.ts
features/cases/actions/use-update-case-state.ts      → packages/cases/src/actions/use-update-case-state.ts
features/cases/lib/case-lexical-serialization.ts     → packages/cases/src/lib/case-lexical-serialization.ts
features/cases/lib/case-message-edit-events.ts       → packages/cases/src/lib/case-message-edit-events.ts
features/cases/lib/message-content-adapter.ts        → packages/cases/src/lib/message-content-adapter.ts
features/cases/lib/typing-indicator-flags.ts         → packages/cases/src/lib/typing-indicator-flags.ts
features/cases/providers/CasesViewProvider.tsx       → packages/cases/src/providers/CasesViewProvider.tsx
features/cases/providers/CaseConversationProvider.tsx → packages/cases/src/providers/CaseConversationProvider.tsx  (MODIFY — see §2.7)
features/cases/controllers/use-cases-view.controller.ts          → packages/cases/src/controllers/use-cases-view.controller.ts
features/cases/controllers/use-case-conversation-messages.controller.ts → packages/cases/src/controllers/use-case-conversation-messages.controller.ts
features/cases/controllers/use-case-conversation.controller.ts   → packages/cases/src/controllers/use-case-conversation.controller.ts  (MODIFY — see §2.6)
features/cases/components/CaseCard.tsx               → packages/cases/src/components/CaseCard.tsx
features/cases/components/CasesSectionGroup.tsx      → packages/cases/src/components/CasesSectionGroup.tsx
features/cases/components/CasesView.tsx              → packages/cases/src/components/CasesView.tsx
features/cases/components/CaseConversationContextBanner.tsx → packages/cases/src/components/CaseConversationContextBanner.tsx
features/cases/components/CaseConversationHeader.tsx → packages/cases/src/components/CaseConversationHeader.tsx
features/cases/components/CaseConversationRouteEntry.tsx → packages/cases/src/components/CaseConversationRouteEntry.tsx
features/cases/components/CaseConversationRouteHydrator.tsx → packages/cases/src/components/CaseConversationRouteHydrator.tsx  (MODIFY — see §2.9)
features/cases/components/CaseConversationSlideView.tsx → packages/cases/src/components/CaseConversationSlideView.tsx
features/cases/components/CaseMessageBubble.tsx      → packages/cases/src/components/CaseMessageBubble.tsx
features/cases/components/CaseMessageBubbleContent.tsx → packages/cases/src/components/CaseMessageBubbleContent.tsx
features/cases/components/CaseMessageDateSeparator.tsx → packages/cases/src/components/CaseMessageDateSeparator.tsx
features/cases/components/CaseMessageImageGrid.tsx   → packages/cases/src/components/CaseMessageImageGrid.tsx
features/cases/components/CaseMessageList.tsx        → packages/cases/src/components/CaseMessageList.tsx
features/cases/components/CaseMessageRow.tsx         → packages/cases/src/components/CaseMessageRow.tsx
features/cases/components/composer/blur-active-composer-element.ts → packages/cases/src/components/composer/blur-active-composer-element.ts
features/cases/components/composer/CaseBasicComposer.tsx    → packages/cases/src/components/composer/CaseBasicComposer.tsx
features/cases/components/composer/CaseColorPalette.tsx     → packages/cases/src/components/composer/CaseColorPalette.tsx
features/cases/components/composer/CaseComposerAttachmentStrip.tsx → packages/cases/src/components/composer/CaseComposerAttachmentStrip.tsx
features/cases/components/composer/CaseComposerDraftImagesProvider.tsx → packages/cases/src/components/composer/CaseComposerDraftImagesProvider.tsx
features/cases/components/composer/CaseComposerEditor.tsx   → packages/cases/src/components/composer/CaseComposerEditor.tsx
features/cases/components/composer/CaseComposerInlineCameraButton.tsx → packages/cases/src/components/composer/CaseComposerInlineCameraButton.tsx
features/cases/components/composer/CaseComposerToolbar.tsx  → packages/cases/src/components/composer/CaseComposerToolbar.tsx
features/cases/components/composer/CaseRichComposer.tsx     → packages/cases/src/components/composer/CaseRichComposer.tsx
```

### 2.6 Modify `packages/cases/src/controllers/use-case-conversation.controller.ts`

After copying, apply these exact changes:

**REMOVE these imports (do not replace — delete entirely):**

```typescript
import { useGetTaskQuery } from "@/features/tasks/api/use-get-task-query";
import {
  RETURN_SOURCE_LABEL,
  TASK_TYPE_LABEL,
} from "@/features/tasks/lib/task-detail";
import { ROUTES } from "@/lib/routes";
```

**REPLACE these imports:**

```typescript
// Old:
import { selectUser, useAuthStore } from "@/store/auth.store";
// New:
import { selectUser, useAuthStore } from "@beyo/auth";

// Old:
import type { ApiRequestError } from "@/lib/api-client";
// New:
import type { ApiRequestError } from "@beyo/api-client";

// Old:
import { generateClientId } from "@/lib/client-id";
// New:
import { generateClientId } from "@beyo/lib";

// Old:
import type { CaseId, UserId } from "@/types/common";
// New:
import type { CaseId, UserId } from "@beyo/lib";

// Old:
import { useSurface } from "@/hooks/use-surface";
// New:
import { useSurface } from "@beyo/hooks";

// Old:
import { ... } from "../surfaces";
// (imports: CASE_CONVERSATION_SURFACE_ID, CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID, CASE_TASK_INFO_SHEET_SURFACE_ID)
// New:
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
} from "../surface-ids";
```

**REMOVE the two helper functions that use TASK_TYPE_LABEL / RETURN_SOURCE_LABEL:**

```typescript
// DELETE this entire function:
function getTaskTypeLabel(taskType: string | null | undefined): string | null {
  ...
}

// DELETE this entire function:
function getReturnSourceLabel(returnSource: string | null | undefined): string | null {
  ...
}
```

**MODIFY the `CaseConversationController` type:**

Remove `taskDetail` field entirely (task info card components in apps fetch their own task data).

Change `isPendingTask` if present — remove it.

The type should NOT contain `taskDetail: ReturnType<typeof useGetTaskQuery>["data"]`. Keep `taskClientId: string | null`.

**MODIFY the `useCaseConversationController` function body:**

Remove the `useGetTaskQuery` call:

```typescript
// REMOVE this line:
const taskQuery = useGetTaskQuery(taskClientId);
```

Replace `primaryLabel` derivation — remove the first two lines that reference `taskQuery.data`:

```typescript
// OLD:
const primaryLabel =
  taskQuery.data?.item?.article_number ??
  taskQuery.data?.item?.sku ??
  cachedCaseSnapshot?.task?.item?.article_number ??
  cachedCaseSnapshot?.task?.item?.sku ??
  (caseDetailTypeName || undefined) ??
  (cachedCaseTypeName || undefined) ??
  "Case";

// NEW:
const primaryLabel =
  cachedCaseSnapshot?.task?.item?.article_number ??
  cachedCaseSnapshot?.task?.item?.sku ??
  (caseDetailTypeName || undefined) ??
  (cachedCaseTypeName || undefined) ??
  "Case";
```

Replace `subtitleSegments` — remove all references to `taskQuery.data` and the label helper functions:

```typescript
// OLD:
const subtitleSegments = [
  taskQuery.data?.task.task_type
    ? getTaskTypeLabel(taskQuery.data.task.task_type)
    : getTaskTypeLabel(cachedCaseSnapshot?.task?.task_type),
  taskQuery.data?.task.return_source
    ? getReturnSourceLabel(taskQuery.data.task.return_source)
    : getReturnSourceLabel(cachedCaseSnapshot?.task?.return_source),
].filter((value): value is string => Boolean(value));
const subtitle = subtitleSegments.join(" • ") || "Case conversation";

// NEW:
const subtitle =
  caseDetailTypeName || cachedCaseTypeName || "Case conversation";
```

Replace `canOpenInfo` and remove `isTaskContextPending`:

```typescript
// OLD:
const isTaskContextAvailable = Boolean(taskClientId) && !taskQuery.isError;
const isTaskContextPending =
  Boolean(taskClientId) &&
  !taskQuery.data &&
  (linksQuery.isPending || taskQuery.isPending);

// NEW:
const isTaskContextAvailable = Boolean(taskClientId);
// (remove isTaskContextPending entirely)
```

Update `closeConversation` — replace `ROUTES.cases` with the hardcoded string `'/cases'`:

```typescript
// OLD:
if (location.pathname.startsWith(`${ROUTES.cases}/`)) {
  navigate(ROUTES.cases, {
// NEW:
if (location.pathname.startsWith('/cases/')) {
  navigate('/cases', {
```

Update the return statement — remove `taskDetail` and `isPendingTask`:

```typescript
// Remove these lines from the return object:
taskDetail: taskQuery.data,
isPendingTask: isTaskContextPending,
```

Update `refetch` — remove the task refetch:

```typescript
// OLD:
const refetch = async () => {
  await Promise.allSettled([
    caseQuery.refetch(),
    participantsQuery.refetch(),
    linksQuery.refetch(),
    taskClientId ? taskQuery.refetch() : Promise.resolve(null),
  ]);
};

// NEW:
const refetch = async () => {
  await Promise.allSettled([
    caseQuery.refetch(),
    participantsQuery.refetch(),
    linksQuery.refetch(),
  ]);
};
```

### 2.7 Modify `packages/cases/src/providers/CaseConversationProvider.tsx`

After copying, apply the standard import replacements. Specifically:

- `@/types/common` → `@beyo/lib`
- `../controllers/use-case-conversation.controller` → stays relative (internal)
- `../surfaces` → `../surface-ids` for any surface ID imports

The provider itself does not need structural changes.

### 2.8 Apply import replacements to ALL copied cases files

For every file in `packages/cases/src/`, apply the import mapping table from the reference section.

Special cases:

**`packages/cases/src/controllers/use-cases-view.controller.ts`:**

- `@/hooks/use-surface` → `@beyo/hooks`
- `@/types/common` → `@beyo/lib`
- `../surfaces` → `../surface-ids` (only imports `CASE_CONVERSATION_SURFACE_ID`)

**`packages/cases/src/controllers/use-case-conversation-messages.controller.ts`:**

- `@/store/auth.store` → `@beyo/auth`
- `@/types/common` → `@beyo/lib`

**`packages/cases/src/components/CaseComposerDraftImagesProvider.tsx`:**

- `@/features/images/providers/EntityImagesProvider` → `@beyo/images`
- `@/types/common` → `@beyo/lib`

**`packages/cases/src/components/CaseMessageImageGrid.tsx`:**

- `@/lib/utils` → `@beyo/lib`
- `@/hooks/use-surface` → `@beyo/hooks`
- `@/features/images/surfaces` → `@beyo/images` (for `IMAGE_VIEWER_SURFACE_ID`, `preloadImageCameraSurface`)
- `@/features/images/actions/use-delete-image` → `@beyo/images`
- `@/features/images/api/use-image` → `@beyo/images`
- `@/features/images/components/ImageAnnotationSvgLayer` → `@beyo/images`
- `@/features/images/components/ImageAddPictureButton` → `@beyo/images`
- `@/features/images/components/ImageUploadOverlay` → `@beyo/images`
- `@/features/images/types` → `@beyo/images`
- `@/types/common` → `@beyo/lib`

**`packages/cases/src/components/CaseConversationContextBanner.tsx`:**

- `@/components/primitives` → `@beyo/ui` (ImagePlaceholder)
- `@/components/primitives/scroll-visibility` → `@beyo/ui` (ScrollVisibilityProvider, useScrollVisibilityContext)
- `@/lib/utils` → `@beyo/lib`

**`packages/cases/src/components/CasesView.tsx`:**

- `@/components/primitives` → `@beyo/ui` (SearchBar)

**`packages/cases/src/components/composer/CaseComposerEditor.tsx`:**

- `@/lib/utils` → `@beyo/lib`

**`packages/cases/src/types.ts`:**

- `@/lib/client-id` → `@beyo/lib`
- `@/types/common` → `@beyo/lib`
- `@/features/images/types` → `@beyo/images`

**`packages/cases/src/api/*.ts` (all API files):**

- `@/lib/api-client` → `@beyo/api-client`
- `@/types/api` → `@beyo/lib` (ApiEnvelopeSchema lives in @beyo/lib)
- `@/types/common` → `@beyo/lib`

**`packages/cases/src/actions/*.ts` (all action files):**

- `@/lib/api-client` → `@beyo/api-client`
- `@/store/auth.store` → `@beyo/auth`
- `@/types/common` → `@beyo/lib`

### 2.9 Modify `packages/cases/src/components/CaseConversationRouteHydrator.tsx`

This component imports from `../surfaces` for `CASE_CONVERSATION_SURFACE_ID`. Change it to import from `../surface-ids`.

Also replace:

- `@/providers/SurfaceProvider` → `@beyo/ui`
- `@/types/common` → `@beyo/lib`
- `../surfaces` → `../surface-ids`

### 2.10 Create `packages/cases/src/index.ts`

```typescript
// Route entries (used by app pages)
export { CasesRouteEntry } from "./route-entry";
export { CaseConversationRouteEntry } from "./components/CaseConversationRouteEntry";
export { CaseConversationRouteHydrator } from "./components/CaseConversationRouteHydrator";

// Providers and context
export {
  CasesViewProvider,
  useCasesViewContext,
} from "./providers/CasesViewProvider";
export {
  CaseConversationProvider,
  useCaseConversationContext,
  useCaseConversationMessagesContext,
} from "./providers/CaseConversationProvider";

// Surface IDs and surface prop types (apps use these to build their surfaces.ts)
export {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
} from "./surface-ids";
export type {
  CaseConversationSurfaceProps,
  CaseTaskInfoSheetSurfaceProps,
  CaseMessageActionsSheetSurfaceProps,
} from "./surface-ids";

// Types
export {
  CASE_STATE,
  CASE_LINK_ENTITY_TYPE,
  CASE_LINK_ROLE,
  MESSAGE_CONTENT_BLOCK_TYPE,
  getCaseTypeImageUrl,
  getCaseTypeName,
  toCaseListCardViewModel,
} from "./types";
export type {
  CaseListCardViewModel,
  CaseDetailRaw,
  CaseDetailBase,
  CaseConversationMessageRaw,
  CaseLink,
  CaseParticipant,
  SendMessageInput,
  CaseListCardRaw,
  CaseUserSnapshot,
  CaseTaskSnapshot,
} from "./types";

// Message content
export type { CaseMessageContent, CaseInlinePart } from "./message-content";

// Library utilities
export {
  fromBackendMessageContent,
  toBackendMessageContent,
  toBackendPlainText,
} from "./lib/message-content-adapter";
export {
  dispatchCaseMessageEditRequest,
  CASE_MESSAGE_EDIT_REQUEST_EVENT,
} from "./lib/case-message-edit-events";

// API query hooks
export {
  useCaseConversationMessagesQuery,
  CASE_CONVERSATION_MESSAGES_PAGE_SIZE,
} from "./api/use-case-conversation-messages";
export { useGetCaseQuery } from "./api/use-get-case";
export { useCaseLinksQuery } from "./api/use-case-links";
export { useCaseParticipantsQuery } from "./api/use-case-participants";
export { useListCasesQuery } from "./api/use-list-cases";

// Action hooks
export { useDeleteCaseMessage } from "./actions/use-delete-case-message";
export { useEditCaseMessage } from "./actions/use-edit-case-message";
export { useMarkCaseRead } from "./actions/use-mark-case-read";
export { useSendCaseMessage } from "./actions/use-send-case-message";
export { useUpdateCaseState } from "./actions/use-update-case-state";

// Controller types (for app-level task info pages that need to cast)
export type { CaseConversationController } from "./controllers/use-case-conversation.controller";
export type { CasesViewController } from "./controllers/use-cases-view.controller";
export type {
  CaseConversationMessagesController,
  CaseMessageRenderItem,
} from "./controllers/use-case-conversation-messages.controller";
```

---

## Phase 3: Update workers app `package.json`

File: `apps/workers-app/ManagerBeyo-app-workers/package.json`

**Add to `"dependencies"`** (these packages are missing from workers app but required by the feature packages):

```json
"@beyo/cases": "*",
"@beyo/images": "*",
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2",
"@lexical/react": "^0.44.0",
"@lexical/selection": "^0.44.0",
"@lexical/utils": "^0.44.0",
"konva": "^10.3.0",
"lexical": "^0.44.0",
"react-konva": "^19.2.4",
"react-virtuoso": "^4.18.7"
```

Keep all existing dependencies unchanged. Only add the new ones.

---

## Phase 4: Run `npm install`

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

After installing, verify:

```bash
ls node_modules/@beyo/images  # must be a symlink pointing to ../../packages/images
ls node_modules/@beyo/cases   # must be a symlink pointing to ../../packages/cases
```

If either is not a symlink, re-run `npm install` from the `frontend/` root.

---

## Phase 5: Update workers app `src/index.css`

File: `apps/workers-app/ManagerBeyo-app-workers/src/index.css`

Current content:

```css
@import "tailwindcss";
@import "@beyo/styles";
@source "../../../../packages/ui/src";
@source "../../../../packages/auth/src";
```

New content (add two more `@source` lines — images and cases packages contain Tailwind class names):

```css
@import "tailwindcss";
@import "@beyo/styles";
@source "../../../../packages/ui/src";
@source "../../../../packages/auth/src";
@source "../../../../packages/images/src";
@source "../../../../packages/cases/src";
```

---

## Phase 6: Update workers app `src/lib/routes.ts`

File: `apps/workers-app/ManagerBeyo-app-workers/src/lib/routes.ts`

Current content:

```typescript
export const ROUTES = {
  signIn: '/sign-in',
  home: '/',
  tasks: '/tasks',
  cases: '/cases',
  caseConversation: '/cases/:caseId',
  stats: '/stats',
  settings: '/settings',
} as const;

export type TabPath = ...
export const TAB_ORDER = ...
```

Add `buildCaseConversationRoute` function. Insert after the `ROUTES` constant:

```typescript
export function buildCaseConversationRoute(caseId: string): string {
  return `${ROUTES.cases}/${caseId}`;
}
```

Do NOT change anything else in this file.

---

## Phase 7: Create workers app `src/features/cases/surfaces.ts`

Create the directory `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/` if it does not exist.

Create new file: `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts`

This file is the workers app's own surface registration for cases. It mirrors the managers app's `features/cases/surfaces.ts` but points to workers-app pages.

```typescript
import { lazy } from "react";

import { lazyWithPreload } from "@beyo/ui";
import type { SurfaceRegistrations } from "@beyo/ui";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  type CaseConversationSurfaceProps,
} from "@beyo/cases";
import { buildCaseConversationRoute } from "@/lib/routes";

function loadCaseConversationSlidePage() {
  return import("@/pages/cases/CaseConversationSlidePage").then((module) => ({
    default: module.CaseConversationSlidePage,
  }));
}

function loadCaseMessageActionsSheetPage() {
  return import("@/pages/cases/CaseMessageActionsSheetPage").then((module) => ({
    default: module.CaseMessageActionsSheetPage,
  }));
}

const caseConversationSlide = lazyWithPreload(loadCaseConversationSlidePage);
const caseMessageActionsSheet = lazyWithPreload(
  loadCaseMessageActionsSheetPage,
);

export const caseSurfaces: SurfaceRegistrations = {
  [CASE_CONVERSATION_SURFACE_ID]: {
    surface: "slide",
    path: (props) =>
      buildCaseConversationRoute(
        (props as CaseConversationSurfaceProps).caseClientId,
      ),
    component: caseConversationSlide.Component,
  },
  [CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseMessageActionsSheet.Component,
  },
};
```

**Note:** `CASE_TASK_INFO_SHEET_SURFACE_ID` is intentionally NOT registered here. Workers app does not have a task feature yet. The case conversation controller checks `Boolean(taskClientId)` to decide whether to show the info button — if the surface is not registered, the button will not appear.

---

## Phase 8: Implement workers app case pages

### 8.1 `src/pages/cases/CasesPage.tsx`

Replace the placeholder with a real implementation:

```typescript
import { lazy, Suspense } from 'react';

import { PageSkeleton } from '@/components/ui/PageSkeleton';

const CasesRouteEntry = lazy(() =>
  import('@beyo/cases').then((module) => ({
    default: module.CasesRouteEntry,
  })),
);

export function CasesPage(): React.JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CasesRouteEntry />
    </Suspense>
  );
}
```

### 8.2 `src/pages/cases/CaseConversationPage.tsx`

Replace the placeholder with a real implementation:

```typescript
import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';

import { PageSkeleton } from '@/components/ui/PageSkeleton';
import type { CaseId } from '@beyo/lib';

const CaseConversationRouteHydrator = lazy(() =>
  import('@beyo/cases').then((module) => ({
    default: module.CaseConversationRouteHydrator,
  })),
);

export function CaseConversationPage(): React.JSX.Element {
  const params = useParams<{ caseId: string }>();
  const caseClientId = params.caseId as CaseId | undefined;

  if (!caseClientId) {
    return (
      <div className="bg-background p-6 text-sm text-muted-foreground">
        Case id is missing.
      </div>
    );
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <CaseConversationRouteHydrator caseClientId={caseClientId} />
    </Suspense>
  );
}
```

### 8.3 Create `src/pages/cases/CaseConversationSlidePage.tsx`

This is the surface page (loaded by the surface system when `CASE_CONVERSATION_SURFACE_ID` is opened).

```typescript
import { useParams } from 'react-router-dom';

import {
  CaseConversationRouteEntry,
  type CaseConversationSurfaceProps,
} from '@beyo/cases';
import { useSurfaceProps } from '@beyo/hooks';
import type { CaseId } from '@beyo/lib';

export function CaseConversationSlidePage(): React.JSX.Element {
  const params = useParams<{ caseId: string }>();
  const surfaceProps = useSurfaceProps<CaseConversationSurfaceProps>();
  const caseClientId = (params.caseId ?? surfaceProps.caseClientId) as
    | CaseConversationSurfaceProps['caseClientId']
    | undefined;

  if (!caseClientId) {
    return (
      <div className="bg-background p-6 text-sm text-muted-foreground">
        Case id is missing.
      </div>
    );
  }

  return <CaseConversationRouteEntry caseClientId={caseClientId as CaseId} />;
}
```

### 8.4 Create `src/pages/cases/CaseMessageActionsSheetPage.tsx`

This is the surface page for the message actions sheet.

```typescript
import { useEffect, useState } from 'react';

import {
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  dispatchCaseMessageEditRequest,
  type CaseMessageActionsSheetSurfaceProps,
} from '@beyo/cases';
import { ConfirmActionButton } from '@beyo/ui';
import { useSurface, useSurfaceHeader, useSurfaceProps } from '@beyo/hooks';

export function CaseMessageActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const {
    canDelete = false,
    canEdit = false,
    messageClientId,
    messageSeq,
    messageText = '',
    onRequestDelete,
  } = useSurfaceProps<CaseMessageActionsSheetSurfaceProps>();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    header?.setTitle('Message');
    header?.setActions(null);
  }, [header]);

  const hasActions = canEdit || canDelete;

  return (
    <div
      className="flex flex-col gap-3 bg-background p-6"
      data-message-seq={typeof messageSeq === 'number' ? String(messageSeq) : undefined}
      data-testid="case-message-actions-sheet"
    >
      {!hasActions ? (
        <p className="text-sm text-muted-foreground">No actions are available for this message.</p>
      ) : null}

      {deleteError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {deleteError}
        </div>
      ) : null}

      {canEdit ? (
        <button
          className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
          data-testid="case-message-edit-button"
          onClick={(event) => {
            event.preventDefault();
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDeleteError(null);
            if (!messageClientId) {
              return;
            }

            dispatchCaseMessageEditRequest({
              messageClientId,
              messageSeq: typeof messageSeq === 'number' ? messageSeq : null,
              messageText,
            });
            surface.close(CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID);
          }}
          type="button"
        >
          Edit message
        </button>
      ) : null}

      {canDelete ? (
        <ConfirmActionButton
          className="w-full text-left"
          confirmLabel="Tap again to delete"
          data-testid="case-message-delete-button"
          label="Delete message"
          onConfirm={() => {
            setDeleteError(null);
            if (!onRequestDelete) {
              return;
            }

            void onRequestDelete().catch(() => {
              setDeleteError('Message could not be deleted.');
            });
          }}
        />
      ) : null}
    </div>
  );
}
```

---

## Phase 9: Update workers app surface registry

File: `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts`

Current content:

```typescript
import type { SurfaceRegistrations } from "@beyo/ui";

export const surfaceRegistry: SurfaceRegistrations = {};

export type SurfaceId = keyof typeof surfaceRegistry;
```

New content:

```typescript
import type { SurfaceRegistrations } from "@beyo/ui";
import { imageSurfaces } from "@beyo/images";
import { caseSurfaces } from "@/features/cases/surfaces";

export const surfaceRegistry: SurfaceRegistrations = {
  ...imageSurfaces,
  ...caseSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
```

---

## Phase 10: Validation

Run these commands from `frontend/`. All must exit with code 0.

```bash
# 1. Type-check the workers app
npm run typecheck --workspace=apps/workers-app/ManagerBeyo-app-workers

# 2. Build the workers app
npm run build --workspace=apps/workers-app/ManagerBeyo-app-workers

# 3. Verify no @/ alias references to the missing task/routes imports in packages
grep -r "@/features/tasks\|@/lib/routes\|@/store/auth.store" packages/cases/src/ packages/images/src/
# Expected: no output (zero matches)

# 4. Verify @beyo/images and @beyo/cases are workspace symlinks
ls -la node_modules/@beyo/images   # should show symlink -> ../../packages/images
ls -la node_modules/@beyo/cases    # should show symlink -> ../../packages/cases
```

If typecheck or build fail, diagnose errors and fix. Do NOT skip errors by adding `skipLibCheck: true` or `any` casts.

---

## Risks and mitigations

- **Risk:** `@beyo/images` surfaces file uses `prewarmCameraStream` from `./hooks/use-camera-stream`. If that hook imports anything from `@/`, the build will fail.
  **Mitigation:** Apply import mapping to all files in `packages/images/src/` including hooks/.

- **Risk:** `packages/cases/src/index.ts` barrel does not export a name that some worker app page imports.
  **Mitigation:** Add the missing export name to the barrel. The export list above covers all names currently referenced in the workers app pages defined in this plan.

- **Risk:** Workers app is missing a `@/components/ui/PageSkeleton` import in pages.
  **Mitigation:** The workers app already has `src/components/ui/PageSkeleton.tsx` (confirmed in the directory listing). Import resolves correctly via `@/` alias.

- **Risk:** `ConfirmActionButton` may not be exported from `@beyo/ui`.
  **Mitigation:** Check `packages/ui/src/index.ts` — it exports `* from './components/primitives/confirm-action-button'`. `ConfirmActionButton` is in that barrel. If not found, fall back to a simple double-tap button.

- **Risk:** TypeScript strict mode catches unused imports or parameters in copied files.
  **Mitigation:** Remove any unused imports revealed by `noUnusedLocals`. Do not suppress with `// @ts-ignore`.

---

## Validation plan

- `npm run typecheck --workspace=apps/workers-app/ManagerBeyo-app-workers`: zero errors
- `npm run build --workspace=apps/workers-app/ManagerBeyo-app-workers`: exits 0
- Grep for banned imports: `grep -r "@/features/tasks\|@/lib/routes\|@/store/auth.store" packages/` returns no output
- Manual: navigate to `/cases` in workers app — cases list renders
- Manual: tap a case card — conversation slide opens with composer

---

## Review log

- `2026-05-28` Claude: Initial plan authored

---

## Lifecycle transition

- Current state: `approved`
- Next state: `archived`
- Transition owner: David
