# PLAN_shared_packages_scaffold_20260528

## Metadata

- Plan ID: `PLAN_shared_packages_scaffold_20260528`
- Status: `archived`
- Owner agent: `copilot`
- Created at (UTC): `2026-05-28T00:00:00Z`
- Last updated at (UTC): `2026-05-28T07:24:15Z`
- Related issue/ticket: N/A
- Intention plan: N/A

## Goal and intent

- Goal: Create the 6 shared package scaffolds — `@beyo/styles`, `@beyo/lib`, `@beyo/api-client`, `@beyo/ui`, `@beyo/hooks`, `@beyo/auth` — under `frontend/packages/`, populated with source files copied from the managers app, with all `@/` imports resolved to relative paths or `@beyo/*` cross-package imports.
- Business/user intent: Enable the workers app to consume shared foundations without duplicating code. The managers app is the source of truth for the initial copy.
- Non-goals:
  - Do NOT wire packages into the workers app (that is the next plan)
  - Do NOT modify any file inside `apps/managers-app/`
  - Do NOT add `build` scripts to any package
  - Do NOT copy `.test.tsx` or `.test.ts` files to packages

## Scope

- In scope:
  - `frontend/package.json` workspace configuration
  - `frontend/packages/` directory with 6 sub-packages
  - Each package populated with source files and correct imports
  - Required API refactors to remove app-specific hard-coding
- Out of scope:
  - Modifying managers app source files
  - Creating workers app files
  - Configuring vitest per package
  - Publishing to npm
- Assumptions:
  - npm 10+ available
  - All `npm install` commands run from `frontend/` root only, never from inside a sub-package

## Clarifications required

(none — all decisions are resolved below)

## Acceptance criteria

1. `frontend/packages/` contains 6 sub-directories
2. `frontend/package.json` has `"workspaces"` array
3. After `npm install` from `frontend/`, `node_modules/@beyo/` contains 6 symlinks pointing into `packages/`
4. `npx tsc --project packages/lib/tsconfig.json --noEmit` exits 0
5. `npx tsc --project packages/api-client/tsconfig.json --noEmit` exits 0
6. `npx tsc --project packages/ui/tsconfig.json --noEmit` exits 0
7. `npx tsc --project packages/hooks/tsconfig.json --noEmit` exits 0
8. `npx tsc --project packages/auth/tsconfig.json --noEmit` exits 0
9. `grep -r "@/" packages/` returns zero results

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: primary contract — package structure, dependency rules, source-package philosophy, migration cycle

### File read intent — pattern vs. relational

Before reading any file outside this plan's scope apply the test from the contract guide. All patterns for package structure, tsconfig, and peerDependencies are already defined in `architecture/35_shared_packages.md`. Do not re-read managers app files to understand patterns — read them only to verify exact field names, import paths, and export names when a step says to do so.

### Skill selection

N/A — pure file creation task

## Implementation plan

Execute phases in order. Do not start a phase until the previous one is complete.

---

### PHASE 0 — Update root `frontend/package.json`

File: `frontend/package.json`

Current content:
```json
{
  "dependencies": {
    "ulid": "^3.0.2"
  }
}
```

Replace the entire file with:
```json
{
  "private": true,
  "workspaces": [
    "apps/managers-app/*",
    "apps/workers-app/*",
    "apps/selleres-app/*",
    "packages/*"
  ],
  "dependencies": {
    "ulid": "^3.0.2"
  }
}
```

---

### PHASE 1 — `@beyo/styles`

#### 1.1 Create `frontend/packages/styles/package.json`

```json
{
  "name": "@beyo/styles",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.css"
  }
}
```

Note: No `tsconfig.json` — this package has no TypeScript source.

#### 1.2 Create `frontend/packages/styles/src/index.css`

This file contains only the shared design tokens and safe-area variables. It does NOT contain `@import "tailwindcss"` (each app owns that), and it does NOT contain the app-specific animations from the managers app (`camera-flash`, `image-edit-shake`, `case-composer-*`).

```css
@theme {
  --color-background: #f4f4f4;
  --color-foreground: #303030;
  --color-card: #ffffff;
  --color-muted: #d0d3d9;
  --color-muted-foreground: #6e7785;
  --color-muted-intense: #6e778599;
  --color-primary: #303030;
  --color-border: #d0d3d9;
  --color-light-container: #fafafa;
  --color-soft-container: #f8f9fa;
  --color-light-border: #f5f5f5;
  --color-between-border: #dedede;
  --color-icon: #8e8e8e;
  --color-destructive: #c0392b;
  --color-info-pill: #e8e8e8;
  --color-info-pill-border: #d8d8d8;
}

:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  overflow: hidden;
}

html,
body {
  overscroll-behavior: none;
}

body {
  margin: 0;
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: Inter, system-ui, sans-serif;
}
```

---

### PHASE 2 — `@beyo/lib`

#### 2.1 Create `frontend/packages/lib/package.json`

```json
{
  "name": "@beyo/lib",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "clsx": ">=2.0.0",
    "libphonenumber-js": ">=1.0.0",
    "react": ">=19.0.0",
    "sonner": ">=2.0.0",
    "tailwind-merge": ">=3.0.0",
    "ulid": ">=3.0.0",
    "zod": ">=4.0.0"
  }
}
```

#### 2.2 Create `frontend/packages/lib/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
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

#### 2.3 Copy files verbatim — no import changes needed

These files have zero `@/` imports. Copy them exactly.

| Source in managers app | Destination in package |
|---|---|
| `src/lib/utils.ts` | `packages/lib/src/utils.ts` |
| `src/lib/animation.ts` | `packages/lib/src/animation.ts` |
| `src/lib/notify.ts` | `packages/lib/src/notify.ts` |
| `src/lib/client-id.ts` | `packages/lib/src/client-id.ts` |
| `src/lib/date/resolve-range-selection.ts` | `packages/lib/src/date/resolve-range-selection.ts` |
| `src/lib/number/clamp-number.ts` | `packages/lib/src/number/clamp-number.ts` |
| `src/lib/number/format-number-display.ts` | `packages/lib/src/number/format-number-display.ts` |
| `src/lib/number/sanitize-number-input.ts` | `packages/lib/src/number/sanitize-number-input.ts` |
| `src/lib/number/step-number.ts` | `packages/lib/src/number/step-number.ts` |
| `src/lib/number/parse-number-draft.ts` | `packages/lib/src/number/parse-number-draft.ts` |
| `src/lib/phone/metadata.ts` | `packages/lib/src/phone/metadata.ts` |
| `src/lib/phone/flag.ts` | `packages/lib/src/phone/flag.ts` |
| `src/types/api.ts` | `packages/lib/src/types/api.ts` |
| `src/types/common.ts` | `packages/lib/src/types/common.ts` |
| `src/types/staged-form.ts` | `packages/lib/src/types/staged-form.ts` |
| `src/types/phone.ts` | `packages/lib/src/types/phone.ts` |
| `src/utils/lazy-with-preload.ts` | `packages/lib/src/lazy-with-preload.ts` |

#### 2.4 Copy phone files — each has one `@/types/phone` import to fix

For each file below: copy from source, then apply the single stated change.

**`packages/lib/src/phone/countries.ts`**
Source: `src/lib/phone/countries.ts`
Change: `import type { CountryIso2, PhoneCountry } from '@/types/phone';`
→ `import type { CountryIso2, PhoneCountry } from '../types/phone';`

**`packages/lib/src/phone/format-phone-display.ts`**
Source: `src/lib/phone/format-phone-display.ts`
Change: `import type { CountryIso2 } from '@/types/phone';`
→ `import type { CountryIso2 } from '../types/phone';`

**`packages/lib/src/phone/normalize-phone.ts`**
Source: `src/lib/phone/normalize-phone.ts`
Change: `import type { CountryIso2, PhoneInputResolution } from '@/types/phone';`
→ `import type { CountryIso2, PhoneInputResolution } from '../types/phone';`

**`packages/lib/src/phone/parse-e164.ts`**
Source: `src/lib/phone/parse-e164.ts`
Change: `import type { CountryIso2, PhoneInputResolution } from '@/types/phone';`
→ `import type { CountryIso2, PhoneInputResolution } from '../types/phone';`

**`packages/lib/src/phone/storage.ts`**
Source: `src/lib/phone/storage.ts`
Change: `import type { CountryIso2 } from '@/types/phone';`
→ `import type { CountryIso2 } from '../types/phone';`

**`packages/lib/src/phone/phone-input-state.ts`**
Source: `src/lib/phone/phone-input-state.ts`
Change: `import type { CountryIso2, ManagedPhoneInputChangeMeta, PhoneInputResolution } from '@/types/phone';`
→ `import type { CountryIso2, ManagedPhoneInputChangeMeta, PhoneInputResolution } from '../types/phone';`

#### 2.5 Create `packages/lib/src/index.ts`

```ts
export { cn } from './utils';

export { durations, easings, transitions, tabVariants } from './animation';

export { notify } from './notify';

export { lazyWithPreload } from './lazy-with-preload';

export {
  CLIENT_ID_PREFIXES,
  CLIENT_ID_REGEX,
  ClientIdSchema,
  generateClientId,
} from './client-id';
export type { ClientIdEntity, ClientIdPrefix } from './client-id';

export { ApiEnvelopeSchema, ApiErrorSchema } from './types/api';
export type { ApiResponse } from './types/api';

export {
  DATE_ONLY_REGEX,
  DateOnlySchema,
  AddressSchema,
  DecimalStringSchema,
} from './types/common';
export type {
  Branded,
  UserId,
  TaskId,
  TaskStepId,
  TaskNoteId,
  ItemId,
  ItemImageId,
  ItemIssueId,
  ItemUpholsteryId,
  CustomerId,
  CaseId,
  CaseConversationId,
  CaseConversationMessageId,
  CaseParticipantId,
  CaseLinkId,
  WorkingSectionId,
  UpholsteryId,
  UpholsteryInventoryId,
  UpholsteryRequirementId,
  WorkspaceId,
  DateOnly,
  Address,
  DecimalString,
} from './types/common';

export type {
  CountryIso2,
  PhoneCountry,
  PhoneInputResolution,
  ManagedPhoneInputChangeMeta,
} from './types/phone';

export type { StepStatus, StepConfig, StepStatusMap } from './types/staged-form';

export { resolveRangeSelection } from './date/resolve-range-selection';
export type { RangeSelectionResolution } from './date/resolve-range-selection';

export { clampNumber } from './number/clamp-number';
export { formatNumberDisplay } from './number/format-number-display';
export { parseNumberDraft } from './number/parse-number-draft';
export type { ParsedNumberDraft } from './number/parse-number-draft';
export { sanitizeNumberInput } from './number/sanitize-number-input';
export { stepNumber } from './number/step-number';

export { DEFAULT_PHONE_COUNTRY_ISO2 } from './phone/countries';
export { getCountryFlagEmoji } from './phone/flag';
export { formatPhoneDisplay, sanitizePhoneDraft } from './phone/format-phone-display';
export { normalizePhoneDraft } from './phone/normalize-phone';
export { parseE164Value } from './phone/parse-e164';
export { resolveInitialPhoneState, resolvePhoneChange } from './phone/phone-input-state';
export {
  readLastPhoneCountryIso2,
  writeLastPhoneCountryIso2,
  LAST_PHONE_COUNTRY_STORAGE_KEY,
} from './phone/storage';
```

---

### PHASE 3 — `@beyo/api-client`

#### 3.1 Create `frontend/packages/api-client/package.json`

```json
{
  "name": "@beyo/api-client",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/lib": "*",
    "zod": ">=4.0.0"
  }
}
```

#### 3.2 Create `frontend/packages/api-client/tsconfig.json`

Same content as Phase 2.2.

#### 3.3 Create `packages/api-client/src/env.ts`

Copy from `src/lib/env.ts`. No changes.

#### 3.4 Create `packages/api-client/src/auth-token.ts`

Copy from `src/lib/auth-token.ts`.
Change: `import { env } from '@/lib/env';`
→ `import { env } from './env';`

#### 3.5 Create `packages/api-client/src/api-client.ts`

Copy from `src/lib/api-client.ts`. Apply 3 changes:

1. `import { env } from "@/lib/env";` → `import { env } from './env';`
2. `import { getAccessToken, refreshAccessToken, setAccessToken } from "@/lib/auth-token";` → `import { getAccessToken, refreshAccessToken, setAccessToken } from './auth-token';`
3. `import { ApiErrorSchema } from "@/types/api";` → `import { ApiErrorSchema } from '@beyo/lib';`

#### 3.6 Create `packages/api-client/src/index.ts`

```ts
export { apiClient, ApiRequestError } from './api-client';
export {
  getAccessToken,
  setAccessToken,
  decodeTokenClaims,
  refreshAccessToken,
  initSession,
} from './auth-token';
export { env } from './env';
```

---

### PHASE 4 — `@beyo/ui`

#### 4.1 Create `frontend/packages/ui/package.json`

```json
{
  "name": "@beyo/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/lib": "*",
    "class-variance-authority": ">=0.7.0",
    "framer-motion": ">=12.0.0",
    "react": ">=19.0.0",
    "react-dom": ">=19.0.0",
    "react-day-picker": ">=10.0.0",
    "react-router-dom": ">=7.0.0",
    "react-textarea-autosize": ">=8.0.0",
    "vaul": ">=1.0.0",
    "zustand": ">=5.0.0"
  }
}
```

#### 4.2 Create `frontend/packages/ui/tsconfig.json`

Same content as Phase 2.2.

#### 4.3 Create `packages/ui/src/providers/SurfaceProvider.tsx`

Copy from `src/providers/SurfaceProvider.tsx`. Apply these 8 changes:

**Change 1** — remove entirely the import line:
```ts
import { surfaceRegistry } from "@/app/surface-registry";
```

**Change 2** — `import { BottomSheetSurface } from "@/components/surfaces/BottomSheetSurface";`
→ `import { BottomSheetSurface } from '../components/surfaces/BottomSheetSurface';`

**Change 3** — `import { ModalSurface } from "@/components/surfaces/ModalSurface";`
→ `import { ModalSurface } from '../components/surfaces/ModalSurface';`

**Change 4** — `import { SlidePageSurface } from "@/components/surfaces/SlidePageSurface";`
→ `import { SlidePageSurface } from '../components/surfaces/SlidePageSurface';`

**Change 5** — `import { SurfaceSkeleton } from "@/components/ui/SurfaceSkeleton";`
→ `import { SurfaceSkeleton } from '../components/ui/SurfaceSkeleton';`

**Change 6** — `import { transitions } from "@/lib/animation";`
→ `import { transitions } from '@beyo/lib';`

**Change 7** — update the `SurfaceProviderProps` type:

Before:
```ts
type SurfaceProviderProps = {
  children: ReactNode;
};
```
After:
```ts
type SurfaceProviderProps = {
  children: ReactNode;
  registry: SurfaceRegistrations;
};
```

**Change 8** — update the `SurfaceProvider` function to accept and use the `registry` prop:

Before:
```ts
export function SurfaceProvider({
  children,
}: SurfaceProviderProps): React.JSX.Element {
  const navigate = useNavigate();
  const init = useSurfaceStore((state) => state.init);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    init(surfaceRegistry, navigate);
  }, []);
```
After:
```ts
export function SurfaceProvider({
  children,
  registry,
}: SurfaceProviderProps): React.JSX.Element {
  const navigate = useNavigate();
  const init = useSurfaceStore((state) => state.init);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    init(registry, navigate);
  }, []);
```

#### 4.4 Create surface components

**`packages/ui/src/components/surfaces/BottomSheetSurface.tsx`**
Source: `src/components/surfaces/BottomSheetSurface.tsx`. 3 changes:

1. `import { transitions } from "@/lib/animation";` → `import { transitions } from '@beyo/lib';`
2. `import { cn } from "@/lib/utils";` → `import { cn } from '@beyo/lib';`
3. `import { SurfaceHeaderContext } from "@/providers/SurfaceProvider";` → `import { SurfaceHeaderContext } from '../../providers/SurfaceProvider';`

**`packages/ui/src/components/surfaces/ModalSurface.tsx`**
Source: `src/components/surfaces/ModalSurface.tsx`. 2 changes:

1. `import { transitions } from '@/lib/animation';` → `import { transitions } from '@beyo/lib';`
2. `import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';` → `import { SurfaceHeaderContext } from '../../providers/SurfaceProvider';`

**`packages/ui/src/components/surfaces/SlidePageSurface.tsx`**
Source: `src/components/surfaces/SlidePageSurface.tsx`. 2 changes:

1. `import { transitions } from "@/lib/animation";` → `import { transitions } from '@beyo/lib';`
2. `import { SurfaceHeaderContext } from "@/providers/SurfaceProvider";` → `import { SurfaceHeaderContext } from '../../providers/SurfaceProvider';`

#### 4.5 Create UI utility components

**`packages/ui/src/components/ui/PageSkeleton.tsx`**
Source: `src/components/ui/PageSkeleton.tsx`. No `@/` imports — copy exactly.

**`packages/ui/src/components/ui/RouteErrorBoundary.tsx`**
Source: `src/components/ui/RouteErrorBoundary.tsx`. No `@/` imports — copy exactly.

**`packages/ui/src/components/ui/SurfaceSkeleton.tsx`**
Source: `src/components/ui/SurfaceSkeleton.tsx`. 1 change:
`import type { SurfaceType } from '@/providers/SurfaceProvider';`
→ `import type { SurfaceType } from '../../providers/SurfaceProvider';`

**`packages/ui/src/lib/lazy-route.tsx`**
Source: `src/lib/lazy-route.tsx`. 2 changes:

1. `import { PageSkeleton } from '@/components/ui/PageSkeleton';` → `import { PageSkeleton } from '../components/ui/PageSkeleton';`
2. `import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';` → `import { RouteErrorBoundary } from '../components/ui/RouteErrorBoundary';`

#### 4.6 Copy primitives

**General import-replacement rules for ALL primitive files:**

Apply these rules to every `@/` import found in any copied primitive file. There are no exceptions — if a `@/` import remains after applying these rules, it is a bug.

| `@/` import pattern | Replace with |
|---|---|
| `from '@/lib/utils'` | `from '@beyo/lib'` |
| `from "@/lib/utils"` | `from '@beyo/lib'` |
| `from '@/lib/animation'` | `from '@beyo/lib'` |
| `from "@/lib/animation"` | `from '@beyo/lib'` |
| `from '@/lib/number/clamp-number'` | `from '@beyo/lib'` |
| `from '@/lib/number/format-number-display'` | `from '@beyo/lib'` |
| `from '@/lib/number/parse-number-draft'` | `from '@beyo/lib'` |
| `from '@/lib/number/sanitize-number-input'` | `from '@beyo/lib'` |
| `from '@/lib/number/step-number'` | `from '@beyo/lib'` |
| `from '@/lib/phone/...'` (any sub-path) | `from '@beyo/lib'` |
| `from '@/types/phone'` | `from '@beyo/lib'` |
| `from '@/types/staged-form'` | `from '@beyo/lib'` |
| `from '@/types/common'` | `from '@beyo/lib'` |
| `from '@/components/primitives/scroll-visibility'` | `from '../scroll-visibility'` |
| `from '@/components/primitives/scroll-visibility/ScrollVisibilityContext'` | `from '../scroll-visibility/ScrollVisibilityContext'` |

When multiple imports from the same `@beyo/lib` source are consolidated, merge them into a single `import { a, b, c } from '@beyo/lib'` statement. Do not leave duplicate `from '@beyo/lib'` import statements.

**Files to copy for each primitive sub-directory** (copy the entire directory, preserving all files and sub-structure, then apply the import rules above):

- `box-picker/` — all 5 files
- `box-slide-picker/` — all 5 files
- `confirm-action-button/` — all 2 files
- `dashed-info-group/` — all 2 files
- `dashed-info-section/` — all 2 files
- `form-field-container/` — all 3 files
- `horizontal-scroll-area/` — all 2 files
- `image-placeholder/` — all 2 files
- `input/` — all 2 files
- `number-input/` — 5 files: `NumberInput.tsx`, `NumberStepperButton.tsx`, `number-input.variants.ts`, `types.ts`, `index.ts` — **skip `NumberInput.test.tsx`**
- `phone-input/` — all 5 files
- `scroll-visibility/` — all 6 files
- `search-bar/` — 5 files: `SearchBar.tsx`, `search-bar.types.ts`, `search-bar.variants.ts`, `index.ts` — **skip `SearchBar.test.tsx`**
- `shared/` — all 6 files
- `staged-form/` — all 7 files
- `state-pill/` — all 2 files
- `switch/` — all 2 files
- `textarea/` — all 2 files
- `working-section-shortcut-bar/` — all 2 files
- `date/` — 5 files only: `DateFieldTrigger.tsx`, `DateRangeFieldTrigger.tsx`, `DayCalendar.tsx`, `date-utils.ts`, `index.ts` — **DO NOT copy `surfaces.ts`** — it references managers-app calendar pages and is app-specific

**Additional instruction for `date/index.ts`:** After copying, open the file and check if it contains a re-export line that references `'./surfaces'`. If it does, remove that line. If it does not, leave the file as copied.

**Additional instruction for `number-input/NumberInput.tsx`:** After applying the general rules, this file will have multiple separate `from '@beyo/lib'` import statements (one per original `@/lib/number/*` import). Merge all `@beyo/lib` imports in this file into a single combined import statement:
```ts
import { clampNumber, formatNumberDisplay, parseNumberDraft, sanitizeNumberInput, stepNumber, cn } from '@beyo/lib';
```

#### 4.7 Create `packages/ui/src/index.ts`

```ts
export {
  SurfaceProvider,
  SurfacePropsContext,
  SurfaceHeaderContext,
  useSurfaceStore,
} from './providers/SurfaceProvider';
export type {
  SurfaceType,
  SurfaceRegistration,
  SurfaceRegistrations,
  SurfaceHeaderValue,
} from './providers/SurfaceProvider';

export { BottomSheetSurface } from './components/surfaces/BottomSheetSurface';
export { ModalSurface } from './components/surfaces/ModalSurface';
export { SlidePageSurface } from './components/surfaces/SlidePageSurface';

export { PageSkeleton } from './components/ui/PageSkeleton';
export { SurfaceSkeleton } from './components/ui/SurfaceSkeleton';
export { RouteErrorBoundary } from './components/ui/RouteErrorBoundary';

export { lazyRoute } from './lib/lazy-route';

export * from './components/primitives/box-picker';
export * from './components/primitives/box-slide-picker';
export * from './components/primitives/confirm-action-button';
export * from './components/primitives/dashed-info-group';
export * from './components/primitives/dashed-info-section';
export * from './components/primitives/date';
export * from './components/primitives/form-field-container';
export * from './components/primitives/horizontal-scroll-area';
export * from './components/primitives/image-placeholder';
export * from './components/primitives/input';
export * from './components/primitives/number-input';
export * from './components/primitives/phone-input';
export * from './components/primitives/scroll-visibility';
export * from './components/primitives/search-bar';
export * from './components/primitives/shared';
export * from './components/primitives/staged-form';
export * from './components/primitives/state-pill';
export * from './components/primitives/switch';
export * from './components/primitives/textarea';
export * from './components/primitives/working-section-shortcut-bar';
```

---

### PHASE 5 — `@beyo/hooks`

#### 5.1 Create `frontend/packages/hooks/package.json`

```json
{
  "name": "@beyo/hooks",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/lib": "*",
    "@beyo/ui": "*",
    "react": ">=19.0.0"
  }
}
```

#### 5.2 Create `frontend/packages/hooks/tsconfig.json`

Same content as Phase 2.2.

#### 5.3 Copy hook files

**`packages/hooks/src/use-preload-surface.ts`**
Source: `src/hooks/use-preload-surface.ts`. No `@/` imports — copy exactly.

**`packages/hooks/src/use-staged-form.ts`**
Source: `src/hooks/use-staged-form.ts`. 1 change:
`import type { StepConfig, StepStatus, StepStatusMap } from '@/types/staged-form';`
→ `import type { StepConfig, StepStatus, StepStatusMap } from '@beyo/lib';`

**`packages/hooks/src/use-surface.ts`**
Source: `src/hooks/use-surface.ts`. 1 change:
`import { useSurfaceStore } from "@/providers/SurfaceProvider";`
→ `import { useSurfaceStore } from '@beyo/ui';`

**`packages/hooks/src/use-surface-props.ts`**
Source: `src/hooks/use-surface-props.ts`. 1 change:
`import { SurfacePropsContext } from '@/providers/SurfaceProvider';`
→ `import { SurfacePropsContext } from '@beyo/ui';`

**`packages/hooks/src/use-surface-header.ts`**
Source: `src/hooks/use-surface-header.ts`. 1 change:
`import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';`
→ `import { SurfaceHeaderContext } from '@beyo/ui';`

**`packages/hooks/src/BreakpointProvider.tsx`**
Source: `src/providers/BreakpointProvider.tsx`. No `@/` imports — copy exactly.

#### 5.4 Create `packages/hooks/src/index.ts`

```ts
export { usePreloadSurface } from './use-preload-surface';
export { useStagedForm } from './use-staged-form';
export type { StagedFormConfig, StagedFormReturn } from './use-staged-form';
export { useSurface } from './use-surface';
export { useSurfaceHeader } from './use-surface-header';
export { useSurfaceProps } from './use-surface-props';
export { BreakpointProvider, BreakpointContext, useBreakpoint } from './BreakpointProvider';
```

---

### PHASE 6 — `@beyo/auth`

#### 6.1 Create `frontend/packages/auth/package.json`

```json
{
  "name": "@beyo/auth",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/api-client": "*",
    "@beyo/lib": "*",
    "@beyo/ui": "*",
    "@hookform/resolvers": ">=5.0.0",
    "@tanstack/react-query": ">=5.0.0",
    "react": ">=19.0.0",
    "react-dom": ">=19.0.0",
    "react-hook-form": ">=7.0.0",
    "react-router-dom": ">=7.0.0",
    "zod": ">=4.0.0",
    "zustand": ">=5.0.0"
  }
}
```

#### 6.2 Create `frontend/packages/auth/tsconfig.json`

Same content as Phase 2.2.

#### 6.3 Create `packages/auth/src/types.ts`

Source: `src/features/auth/types.ts`. No `@/` imports — copy exactly.

#### 6.4 Create `packages/auth/src/store/auth.store.ts`

Source: `src/store/auth.store.ts`. 1 change:
`import type { UserId, WorkspaceId } from '@/types/common';`
→ `import type { UserId, WorkspaceId } from '@beyo/lib';`

#### 6.5 Create `packages/auth/src/api/use-sign-in.ts`

Source: `src/features/auth/api/use-sign-in.ts`. Apply these changes:

**Changes 1-5 — import path fixes:**

1. `import { setAccessToken } from '@/lib/auth-token';` → `import { setAccessToken } from '@beyo/api-client';`
2. `import { apiClient } from '@/lib/api-client';` → `import { apiClient } from '@beyo/api-client';`
3. `import { useAuthStore } from '@/store/auth.store';` → `import { useAuthStore } from '../store/auth.store';`
4. `import { ApiEnvelopeSchema } from '@/types/api';` → `import { ApiEnvelopeSchema } from '@beyo/lib';`
5. `import type { UserId, WorkspaceId } from '@/types/common';` → `import type { UserId, WorkspaceId } from '@beyo/lib';`

**Change 6 — add `appScope` to `SignInCredentials` type:**

Before:
```ts
type SignInCredentials = {
  email: string;
  password: string;
};
```
After:
```ts
type SignInCredentials = {
  email: string;
  password: string;
  appScope: string;
};
```

**Change 7 — update `signIn` function to use `appScope` instead of hardcoded `'admin'`:**

Before:
```ts
async function signIn(credentials: SignInCredentials) {
  const result = await apiClient.post('/api/v1/auth/sign-in', SignInResponseSchema, {
    ...credentials,
    app_scope: 'admin',
  });
```
After:
```ts
async function signIn(credentials: SignInCredentials) {
  const { appScope, ...rest } = credentials;
  const result = await apiClient.post('/api/v1/auth/sign-in', SignInResponseSchema, {
    ...rest,
    app_scope: appScope,
  });
```

`useSignInMutation` export stays unchanged — `export function useSignInMutation() { return useMutation({ mutationFn: signIn }); }`.

#### 6.6 Create `packages/auth/src/api/use-sign-out.ts`

Source: `src/features/auth/api/use-sign-out.ts`. Apply these changes:

**Change 1 — remove 3 import lines entirely:**
```ts
import { useIssueCategoryConfigSelectionStore } from '@/features/items/store/issue-category-config-selection.store';
import { useItemCategorySelectionStore } from '@/features/items/store/item-category-selection.store';
import { useWorkingSectionSelectionStore } from '@/features/working-sections/store/working-section-selection.store';
```
Delete all 3 lines. Do not replace them with anything.

**Changes 2-5 — import path fixes:**

2. `import { setAccessToken } from '@/lib/auth-token';` → `import { setAccessToken } from '@beyo/api-client';`
3. `import { apiClient } from '@/lib/api-client';` → `import { apiClient } from '@beyo/api-client';`
4. `import { useAuthStore } from '@/store/auth.store';` → `import { useAuthStore } from '../store/auth.store';`
5. `import { ApiEnvelopeSchema } from '@/types/api';` → `import { ApiEnvelopeSchema } from '@beyo/lib';`

**Change 6 — add `onSignedOut` callback and remove app-specific store clears:**

Before:
```ts
export function useSignOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.clear();
      useWorkingSectionSelectionStore.getState().clear();
      useItemCategorySelectionStore.getState().clear();
      useIssueCategoryConfigSelectionStore.getState().clear();
    },
  });
}
```
After:
```ts
type SignOutOptions = {
  onSignedOut?: () => void;
};

export function useSignOutMutation(options?: SignOutOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.clear();
      options?.onSignedOut?.();
    },
  });
}
```

#### 6.7 Create `packages/auth/src/hooks/use-sign-in-form.ts`

Source: `src/features/auth/hooks/use-sign-in-form.ts`. 1 change:
`import { SignInFormSchema, type SignInFormInput } from '@/features/auth/types';`
→ `import { SignInFormSchema, type SignInFormInput } from '../types';`

#### 6.8 Create `packages/auth/src/hooks/use-auth.ts`

Source: `src/features/auth/hooks/use-auth.ts`. 2 changes:

1. `import { useSignOutMutation } from '@/features/auth/api/use-sign-out';` → `import { useSignOutMutation } from '../api/use-sign-out';`
2. `import { selectIsAuthenticated, selectUser, selectWorkspaceId, useAuthStore } from '@/store/auth.store';` → `import { selectIsAuthenticated, selectUser, selectWorkspaceId, useAuthStore } from '../store/auth.store';`

#### 6.9 Create `packages/auth/src/components/SignInForm.tsx`

Source: `src/features/auth/components/SignInForm.tsx`. Apply these changes:

**Changes 1-5 — import path fixes:**

1. `import { TextInput } from '@/components/primitives/input';` → `import { TextInput } from '@beyo/ui';`
2. `import { useSignInMutation } from '@/features/auth/api/use-sign-in';` → `import { useSignInMutation } from '../api/use-sign-in';`
3. `import { useSignInForm } from '@/features/auth/hooks/use-sign-in-form';` → `import { useSignInForm } from '../hooks/use-sign-in-form';`
4. `import { ApiRequestError } from '@/lib/api-client';` → `import { ApiRequestError } from '@beyo/api-client';`
5. `import type { SignInFormInput } from '@/features/auth/types';` → `import type { SignInFormInput } from '../types';`

**Change 6 — add `appScope` prop:**

Before:
```ts
type SignInFormProps = {
  onSuccess: () => void;
};

export function SignInForm({ onSuccess }: SignInFormProps): React.JSX.Element {
  const form = useSignInForm();
  const { mutateAsync: signIn, isPending } = useSignInMutation();
```
After:
```ts
type SignInFormProps = {
  onSuccess: () => void;
  appScope: string;
};

export function SignInForm({ onSuccess, appScope }: SignInFormProps): React.JSX.Element {
  const form = useSignInForm();
  const { mutateAsync: signIn, isPending } = useSignInMutation();
```

**Change 7 — pass `appScope` in the submit handler:**

Find the line inside `onSubmit`:
```ts
await signIn(values);
```
Replace with:
```ts
await signIn({ ...values, appScope });
```

#### 6.10 Create `packages/auth/src/components/AuthProvider.tsx`

Source: `src/features/auth/components/AuthProvider.tsx`. Apply these changes:

**Change 1 — remove this import line entirely:**
```ts
import { ROUTES } from '@/lib/routes';
```

**Changes 2-7 — import path fixes:**

2. `import { PageSkeleton } from '@/components/ui/PageSkeleton';` → `import { PageSkeleton } from '@beyo/ui';`
3. `import { decodeTokenClaims, initSession } from '@/lib/auth-token';` → `import { decodeTokenClaims, initSession } from '@beyo/api-client';`
4. `import { apiClient } from '@/lib/api-client';` → `import { apiClient } from '@beyo/api-client';`
5. `import { useAuthStore } from '@/store/auth.store';` → `import { useAuthStore } from '../store/auth.store';`
6. `import { ApiEnvelopeSchema } from '@/types/api';` → `import { ApiEnvelopeSchema } from '@beyo/lib';`
7. `import type { UserId, WorkspaceId } from '@/types/common';` → `import type { UserId, WorkspaceId } from '@beyo/lib';`

**Change 8 — add `signInRoute` prop:**

Before:
```ts
type AuthProviderProps = {
  children: ReactNode;
};
```
After:
```ts
type AuthProviderProps = {
  children: ReactNode;
  signInRoute: string;
};
```

**Change 9 — destructure `signInRoute` in function signature:**

Before: `export function AuthProvider({ children }: AuthProviderProps)`
After: `export function AuthProvider({ children, signInRoute }: AuthProviderProps)`

**Change 10 — replace hardcoded route with prop:**

Before: `navigate(ROUTES.signIn, { replace: true });`
After: `navigate(signInRoute, { replace: true });`

#### 6.11 Create `packages/auth/src/components/ProtectedRoute.tsx`

Source: `src/features/auth/components/ProtectedRoute.tsx`. Apply these changes:

**Change 1 — remove this import line entirely:**
```ts
import { ROUTES } from '@/lib/routes';
```

**Change 2 — import path fix:**
`import { selectIsAuthenticated, useAuthStore } from '@/store/auth.store';`
→ `import { selectIsAuthenticated, useAuthStore } from '../store/auth.store';`

**Change 3 — add `signInPath` prop and use it:**

Before:
```ts
export function ProtectedRoute(): React.JSX.Element {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate replace to={ROUTES.signIn} />;
}
```
After:
```ts
type ProtectedRouteProps = {
  signInPath: string;
};

export function ProtectedRoute({ signInPath }: ProtectedRouteProps): React.JSX.Element {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate replace to={signInPath} />;
}
```

#### 6.12 Create `packages/auth/src/components/GuestRoute.tsx`

Source: `src/features/auth/components/GuestRoute.tsx`. Apply these changes:

**Change 1 — remove this import line entirely:**
```ts
import { ROUTES } from '@/lib/routes';
```

**Change 2 — import path fix:**
`import { selectIsAuthenticated, useAuthStore } from '@/store/auth.store';`
→ `import { selectIsAuthenticated, useAuthStore } from '../store/auth.store';`

**Change 3 — add `homePath` prop and use it:**

Before:
```ts
export function GuestRoute(): React.JSX.Element {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate replace to={ROUTES.home} />;
  }

  return <Outlet />;
}
```
After:
```ts
type GuestRouteProps = {
  homePath: string;
};

export function GuestRoute({ homePath }: GuestRouteProps): React.JSX.Element {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate replace to={homePath} />;
  }

  return <Outlet />;
}
```

#### 6.13 Create `packages/auth/src/index.ts`

```ts
export { AuthProvider } from './components/AuthProvider';
export { GuestRoute } from './components/GuestRoute';
export { ProtectedRoute } from './components/ProtectedRoute';
export { SignInForm } from './components/SignInForm';
export { useAuth } from './hooks/use-auth';
export { useSignInMutation } from './api/use-sign-in';
export { useSignOutMutation } from './api/use-sign-out';
export {
  useAuthStore,
  selectUser,
  selectWorkspaceId,
  selectIsAuthenticated,
} from './store/auth.store';
export { SignInFormSchema } from './types';
export type { SignInFormInput } from './types';
```

---

### PHASE 7 — npm install

Run from `frontend/` root:
```bash
npm install
```

Then verify workspace links exist:
```bash
ls -la node_modules/@beyo/
```

Expected: 6 entries — `api-client`, `auth`, `hooks`, `lib`, `styles`, `ui` — each a symlink pointing to `../../packages/<name>`.

If any symlink is missing: delete `node_modules/` and `package-lock.json` from `frontend/`, then re-run `npm install`.

---

### PHASE 8 — Typecheck each package

Run all 5 commands from the `frontend/` root:

```bash
npx tsc --project packages/lib/tsconfig.json --noEmit
npx tsc --project packages/api-client/tsconfig.json --noEmit
npx tsc --project packages/ui/tsconfig.json --noEmit
npx tsc --project packages/hooks/tsconfig.json --noEmit
npx tsc --project packages/auth/tsconfig.json --noEmit
```

Fix all errors before moving to the next package. Most errors will be one of:
- A remaining `@/` import that was missed — apply the replacement rules from Phase 4.6
- An export missing from `@beyo/lib/src/index.ts` — add the export
- A type mismatch from one of the API refactors — verify the before/after code above matches exactly

---

### PHASE 9 — Final scan

Run these checks. All must return zero results:

```bash
grep -r "@/" packages/
grep -r "workspace:" packages/
```

Also verify manually:
- `packages/styles/src/index.css` does NOT contain `@import "tailwindcss"`
- No `package.json` in `packages/` has a `"build"` script
- No `*.test.ts` or `*.test.tsx` files exist anywhere under `packages/`
- `packages/ui/src/components/primitives/date/surfaces.ts` does NOT exist

---

## Risks and mitigations

- Risk: A primitive file has a `@/` import not covered by the table in Phase 4.6.
  Mitigation: Phase 9 grep catches it. Apply the general rule from Phase 4.6.

- Risk: `@beyo/lib/src/index.ts` is missing an export that `@beyo/ui` or `@beyo/auth` needs.
  Mitigation: Phase 8 TypeScript errors surface this. Add the missing export.

- Risk: `date/index.ts` re-exports from `surfaces.ts`, causing a reference to managers-app calendar pages.
  Mitigation: Phase 4.6 explicitly instructs to check this. Phase 9 grep catches remaining `@/` if missed.

- Risk: Merging multiple `@beyo/lib` imports in `NumberInput.tsx` (Phase 4.6) causes a name collision if two source files export the same symbol.
  Mitigation: `@beyo/lib` has no name collisions by design. If a TypeScript error about duplicate exports appears in Phase 8, check `@beyo/lib/src/index.ts` for a conflict and resolve by aliasing.

## Validation plan

- Phase 7: `ls node_modules/@beyo/` shows 6 entries
- Phase 8: zero TypeScript errors across all 5 packages
- Phase 9: `grep -r "@/" packages/` returns zero lines; `grep -r "workspace:" packages/` returns zero lines

## Review log

_(empty)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: human reviewer
