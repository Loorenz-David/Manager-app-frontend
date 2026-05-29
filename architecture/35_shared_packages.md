# Shared Packages — Migration Contract

This document is the authoritative contract for AI agents performing the task of moving a foundation module from `apps/managers-app/ManagerBeyo-app-managers/` into a shared package under `packages/`. Follow every section exactly.

---

## 1. Philosophy: Source Packages (no build step per package)

Packages expose **raw TypeScript source files** — there is no `tsc` build, no `dist/` output, and no per-package compilation step. Each consuming app's Vite compiler traverses and compiles package source as part of the app build. This is intentional.

**Why this matters:**
- Tailwind CSS v4 (via `@tailwindcss/vite`) traverses Vite's module graph for class names, but it **excludes `node_modules`** from scanning — including workspace symlinks under `node_modules/@beyo/*`. Consuming apps must explicitly register each package source directory with an `@source` directive in their `index.css` (see §6).
- No watch-mode or build-pipeline complexity per package.
- TypeScript with `moduleResolution: "bundler"` resolves `.ts` and `.tsx` files directly from `package.json` `exports`.

**Rule:** Never add a `build` script that compiles a package to `dist/`. If you see one, remove it.

---

## 2. Monorepo Workspace Setup

### Root `package.json`

The root `frontend/package.json` must declare npm workspaces:

```json
{
  "workspaces": [
    "apps/managers-app/*",
    "apps/workers-app/*",
    "apps/selleres-app/*",
    "packages/*"
  ]
}
```

After updating, run `npm install` from `frontend/` to re-link workspaces.

### `packages/` folder structure

```
frontend/
  packages/
    lib/
    api-client/
    ui/
    hooks/
    auth/
    styles/
  apps/
    managers-app/
    workers-app/
```

---

## 3. Package `package.json` Template

Every package follows this template. Replace `<name>` and `<description>` accordingly.

```json
{
  "name": "@beyo/<name>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    // list ALL external libraries this package imports
  }
}
```

**Rules:**
- `"private": true` — these packages are never published to npm.
- `"exports"` points to `./src/index.ts` — the raw TypeScript entry point.
- No `"main"` field. No `"module"` field. `"exports"` is enough.
- No `"devDependencies"`. No `"dependencies"`. Only `"peerDependencies"`.

---

## 4. Dependency Classification

### peerDependencies — always use this for external libraries

Every external library a package imports must be listed as a `peerDependency`. The consuming app (managers, workers) owns and installs the actual version.

```json
"peerDependencies": {
  "react": ">=19.0.0",
  "zod": ">=4.0.0",
  "framer-motion": ">=12.0.0"
}
```

**Why peer, not regular dependency:** If `react` is in `dependencies`, npm may install a second copy. Two React instances break hooks silently. Peer dependencies are satisfied by the app's install — no duplication.

### Cross-package workspace dependencies

When a package depends on another `@beyo/*` package, declare it as a peer dependency using the `*` version:

```json
"peerDependencies": {
  "@beyo/api-client": "*"
}
```

npm workspaces resolves `"*"` to the local package symlink. Do not use `"workspace:*"` — that is pnpm syntax and does not work with npm.

### What never goes in a package's dependencies

- `tailwindcss` — Tailwind is a build-time Vite plugin at the app level, not a runtime dependency.
- `typescript` — compile-time tool, lives in the app's devDependencies.
- `vite`, `vitest`, `@types/*` — same reason.
- Application-specific config like `env.ts` imports — keep those in the package if truly shared, but see §7 for env handling.

---

## 5. TypeScript Configuration Per Package

Each package has a `tsconfig.json`:

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

The `"types": ["node", "vite/client"]` field is required to resolve `import.meta.env` (Vite's env object) and Node globals inside package source files. Without it, TypeScript cannot find `import.meta.env` and will error.

**No `paths` aliases inside packages.** Packages use relative imports only. The `@/` alias belongs to apps, not packages.

### App `tsconfig.app.json` — path alias (TypeScript 6)

Apps use `paths` to resolve the `@/` alias. With TypeScript 6 and `moduleResolution: "bundler"`, `paths` entries with relative values resolve relative to the `tsconfig.json` file — `baseUrl` is no longer needed and is deprecated. Do not add `baseUrl` or `ignoreDeprecations`:

```json
"paths": {
  "@/*": ["./src/*"]
}
```

### CSS imports from `@beyo/styles`

Import styles using the package's declared export path, not a direct internal file path:

```css
/* ✅ Correct — follows the exports field */
@import "@beyo/styles";

/* ❌ Wrong — bypasses the package contract */
@import "@beyo/styles/src/index.css";
```

Vite's CSS resolver follows the `exports` field in `package.json`. Since `@beyo/styles` declares `"exports": { ".": "./src/index.css" }`, the bare import resolves to the correct file through the public surface.

---

## 6. Consuming Apps — How to Reference Packages

### Step 1: Add the package to the app's `package.json`

```json
"dependencies": {
  "@beyo/api-client": "*"
}
```

Then run `npm install` from the `frontend/` root.

### Step 2: App's `tsconfig.app.json` — no changes needed

With `moduleResolution: "bundler"`, TypeScript follows the `"exports"` field in each package's `package.json` and resolves the TypeScript source directly. No `paths` mapping required.

### Step 3: App's `vite.config.ts` — no changes needed

Vite also uses the `"exports"` field via `resolve.conditions`. It will find `./src/index.ts` and compile it as part of the app bundle.

### Step 4: App's `src/index.css` — add `@source` directives

Tailwind CSS v4 excludes `node_modules` from scanning, including workspace symlinks. Any `@beyo/*` package that contains Tailwind class names (i.e., `.tsx`/`.ts` files with `className` strings or class name constants) must be explicitly registered.

Add one `@source` line per package, pointing to its `src/` directory relative to the app's `index.css`:

```css
@import "tailwindcss";
@import "@beyo/styles";
@source "../../../../packages/ui/src";
@source "../../../../packages/auth/src";
```

**Which packages need `@source`:**
- `@beyo/ui` — all UI components contain Tailwind class names
- `@beyo/auth` — `SignInForm` and other auth components contain Tailwind class names
- `@beyo/lib` — pure utility functions, no Tailwind class names, no `@source` needed
- `@beyo/api-client` — no Tailwind class names, no `@source` needed
- `@beyo/hooks` — no Tailwind class names, no `@source` needed
- `@beyo/styles` — is the CSS source itself; importing it is sufficient

**Rule:** When you add a new `@beyo/*` package to an app and that package contains any `.tsx` with `className` props or `.ts` with class name string constants, add a corresponding `@source` directive. Omitting it produces unstyled components with no error — it fails silently.

### Verify resolution works

After `npm install`, check that `node_modules/@beyo/<name>` is a symlink pointing to `packages/<name>`. If it is not a symlink, the workspace is not linked — re-run `npm install` from the root.

---

## 7. Package Catalogue and Peer Dependencies

### `@beyo/lib`
**Contents:** `date/`, `number/`, `phone/`, `types/`, `utils.ts`, `animation.ts`, `notify.ts`, `client-id.ts`
**Peer dependencies:** `clsx`, `libphonenumber-js`, `sonner`, `tailwind-merge`, `ulid`, `zod`
**No React dependency** — this package is pure TypeScript utilities. Keep it that way.
- `clsx` + `tailwind-merge` are required by `utils.ts` for the `cn()` helper.
- `ulid` is required by `client-id.ts`.
- `zod` is required by the `types/` schema definitions (`ApiEnvelopeSchema`, `ClientIdSchema`, etc.).
- `lazyWithPreload` is NOT in this package — it is a React utility and lives in `@beyo/ui/src/lib/`.

### `@beyo/api-client`
**Contents:** `api-client.ts`, `auth-token.ts`, `env.ts`
**Peer dependencies:** `@beyo/lib`, `zod`
**Note:** `auth-token.ts` lives here because `api-client.ts` calls `refreshAccessToken` and `getAccessToken` from it. They are tightly coupled. Do not split them.
**Note:** `env.ts` exposes `VITE_API_URL`. Keep it here — both apps need the same env key for the API URL.
**Note:** `@beyo/lib` is a peer dep because `api-client.ts` imports `ApiErrorSchema` from it.

### `@beyo/ui`
**Contents:** `components/primitives/`, `components/surfaces/`, `components/ui/`, `providers/SurfaceProvider.tsx`, `lib/lazy-route.tsx`, `lib/lazy-with-preload.ts`
**Peer dependencies:** `@beyo/lib`, `class-variance-authority`, `framer-motion`, `lucide-react`, `react`, `react-dom`, `react-day-picker`, `react-router-dom`, `react-textarea-autosize`, `vaul`, `zustand`
**Note:** Only include the peers that the package actually imports. Do not list every dep from the app.
**Note:** `lazyWithPreload` lives in `lib/lazy-with-preload.ts` here (not in `@beyo/lib`) because it wraps `React.lazy` and is inherently a React utility.
**Note:** `clsx` and `tailwind-merge` are NOT listed as peers here — they are accessed through the `cn()` helper exported from `@beyo/lib`.
**Tailwind note:** CSS class names in this package are NOT picked up automatically — Tailwind excludes `node_modules` (including workspace symlinks) from scanning. Consuming apps must add `@source "../../../../packages/ui/src"` to their `index.css`. See §6 Step 4.

### `@beyo/hooks`
**Contents:** `BreakpointProvider.tsx`, `use-preload-surface.ts`, `use-staged-form.ts`, `use-surface.ts`, `use-surface-header.ts`, `use-surface-props.ts`
**Peer dependencies:** `@beyo/lib`, `@beyo/ui`, `react`

### `@beyo/auth`
**Contents:** `features/auth/` — session initialization, guards, auth context
**Peer dependencies:** `react`, `react-router-dom`, `@beyo/api-client`
**Note:** The auth feature pages (login page UI) stay in each app — they are app-specific. Only the session logic, guards, and auth context move to this package.

### `@beyo/styles`
**Contents:** `styles/` — CSS design tokens and theme variables
**Peer dependencies:** none
**Note:** Apps import this package's CSS directly. In `index.css`, replace the local import with `@import "@beyo/styles/src/index.css"` (or however the CSS is structured).

---

## 8. Package Directory Structure

```
packages/<name>/
  src/
    index.ts          ← barrel — re-exports the public API
    ...               ← source files, same structure as in the app
  package.json
  tsconfig.json
```

The `src/index.ts` barrel exports **everything the consuming app needs**. Internal files that are not part of the public API are not re-exported.

---

## 9. The Migration Cycle

Each foundation is migrated in this exact sequence. Do not skip steps.

```
Step 1 — Identify
  Select one foundation from the managers app.
  Document which files will move and which peers they require.

Step 2 — Create the package
  Create packages/<name>/ with the correct package.json and tsconfig.json.
  Copy (do not delete yet) the source files into packages/<name>/src/.
  Remove all @/ alias imports — replace with relative imports.
  Write src/index.ts to re-export the public surface.

Step 3 — Wire into the workers app
  Add "@beyo/<name>": "*" to the workers app's package.json.
  Run npm install from frontend/.
  Import from "@beyo/<name>" in the workers app wherever needed.
  Confirm the workers app builds (npm run build) and type-checks (npm run typecheck) without errors.

Step 4 — Validate behavior in workers app
  Test the feature in the workers app as it will be used.
  Only once it works correctly do you proceed.

Step 5 — Migrate the managers app
  Replace the managers app's local copy of the files with imports from "@beyo/<name>".
  Add "@beyo/<name>": "*" to the managers app's package.json.
  Run npm install from frontend/.
  Delete the original source files from the managers app.
  Confirm the managers app builds and type-checks without errors.

Step 6 — Verify both apps
  Both apps must pass: npm run build && npm run typecheck.
  No @/ imports should reference the removed files.
```

**Never perform Step 5 before Step 4 is confirmed.** The workers app being the first consumer is the validation gate.

---

## 10. What Does NOT Belong in Packages

Do not move these into packages. They stay app-specific:

- Feature pages and feature components (cases, tasks, upholstery, etc.)
- App routing (`routes.ts`, `App.tsx`)
- App-level providers (unless the provider is truly shared logic like auth session)
- `app/` root files
- PWA configuration
- Testing utilities specific to one app (`src/test/`)

---

## 11. Naming and Export Conventions

- Package names: `@beyo/<name>` — lowercase, no underscores.
- Source folders: match the original folder name from the managers app where possible.
- Public exports: named exports only, no default exports from `index.ts`.
- Do not export internal helpers that are implementation details.

---

## 12. Running npm install

All `npm install` commands run from the `frontend/` root, not from inside a package or app. npm hoists dependencies and creates workspace symlinks from the root. Running `npm install` inside a sub-package bypasses workspace linking.

```bash
# Always from frontend/
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

---

## 13. Packages and App Surfaces

### The Rule

**Packages must never call `openSurface` directly.**

Surface registration lives in apps. A package component that calls `openSurface(SOME_ID, ...)` directly would import from `@beyo/ui`'s surface system and implicitly assume that surface is registered in the consuming app — a compile-time import with a runtime assumption. This is a package boundary violation.

Instead, packages declare what they need through a typed `XxxSurfaceOpeners` map, and apps inject concrete implementations via surface props.

---

### The Pattern — `surfaceOpeners` injection

#### 1. Package declares the openers map (in `surface-ids.ts`)

Every package that contains picker trigger fields defines a single grouped type for all the surface-opening callbacks it may need. All keys are optional — the package always handles `undefined` gracefully with `?.()`.

```ts
// packages/cases/src/surface-ids.ts

export const CASE_CREATION_SLIDE_SURFACE_ID = "case-creation-slide";
export const CASE_TYPE_PICKER_SHEET_SURFACE_ID = "case-type-picker-sheet";

export type CaseCreationSurfaceOpeners = {
  openCaseTypePicker?: (props: CaseTypePickerSheetSurfaceProps) => void;
  // add one optional key per new picker field
};

export type CaseCreationSlideSurfaceProps = {
  entityTypes?: string[];
  surfaceOpeners: CaseCreationSurfaceOpeners; // required at type level; default {} in provider
};

export type CaseTypePickerSheetSurfaceProps = {
  entityTypes?: string[];
  currentCaseTypeId?: string | null;
  onSelect: (selection: CaseTypeSelectedDisplay) => void;
};
```

#### 2. Package route entry reads openers from surface props

The `XxxRouteEntry` component (the package's self-contained entry point) reads `surfaceOpeners` from `useSurfaceProps<T>()` and passes it straight to the provider. It does not inspect or augment the map.

```tsx
// packages/cases/src/components/CaseCreationRouteEntry.tsx

const { entityTypes, surfaceOpeners } = useSurfaceProps<CaseCreationSlideSurfaceProps>();

return (
  <CaseCreationFormProvider entityTypes={entityTypes} surfaceOpeners={surfaceOpeners}>
    <CaseCreationFormContent />
  </CaseCreationFormProvider>
);
```

#### 3. Package provider holds and exposes openers via context

The provider stores `surfaceOpeners ?? {}` and exposes it through the feature context. This is the only way package components access the map — via context, never via props drilling.

```tsx
// packages/cases/src/providers/CaseCreationFormProvider.tsx

type CaseCreationFormContextValue = {
  caseClientId: CaseId;
  regenerateId: () => void;
  surfaceOpeners: CaseCreationSurfaceOpeners;
  // ...other context values
};

// Inside provider:
const value: CaseCreationFormContextValue = {
  ...
  surfaceOpeners: surfaceOpeners ?? {},
};
```

#### 4. Package trigger field calls openers via context

Trigger fields read `surfaceOpeners` from context and call the relevant opener with `?.()`. They never import `useSurface` or `openSurface`.

```tsx
// packages/cases/src/components/CaseTypePickerTriggerField.tsx

const { surfaceOpeners, selectedCaseType, setSelectedCaseType, entityTypes } =
  useCaseCreationFormContext();
const form = useFormContext<CaseCreationFormValues>();
const currentCaseTypeId = useWatch({ control: form.control, name: "case_type_id" });

function handlePress(): void {
  surfaceOpeners.openCaseTypePicker?.({
    entityTypes,
    currentCaseTypeId: currentCaseTypeId ?? null,
    onSelect: (selection) => {
      setSelectedCaseType(selection);
      form.setValue("case_type_id", selection.clientId, { shouldDirty: true });
      form.setValue("type_label", selection.name, { shouldDirty: true });
    },
  });
}
```

The `onSelect` closure is created inside the trigger field (where `form.setValue` and context setters are in scope), passed through the surface system as an opaque function, and called by the picker sheet upon selection.

#### 5. App controller provides implementations (the only place `openSurface` is called)

The app controller is the single location where surface IDs and `openSurface` are used for picker surfaces. It assembles the `surfaceOpeners` object and passes it when opening the parent surface.

```ts
// apps/workers-app/.../controllers/use-task-step-detail.controller.ts

import {
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  type CaseCreationSurfaceOpeners,
} from "@beyo/cases";

const handleOpenCaseCreation = useCallback(() => {
  const surfaceOpeners: CaseCreationSurfaceOpeners = {
    openCaseTypePicker: (props) =>
      openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props),
    // add openParticipantPicker here when introducing that field
  };
  openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
    entityTypes: ["task"],
    surfaceOpeners,
  });
}, [openSurface]);
```

---

### Ownership table

| Concern | Owned by |
|---|---|
| `XxxSurfaceOpeners` type | Package (`surface-ids.ts`) |
| Surface IDs (`CASE_TYPE_PICKER_SHEET_SURFACE_ID`) | Package (`surface-ids.ts`) |
| Surface registration (`useSurface`, `lazyWithPreload`) | App (`features/<domain>/surfaces.ts`) |
| `openSurface` calls for picker surfaces | App controller only |
| `surfaceOpeners` map assembly | App controller |
| Picker page component (`XxxPickerRouteEntry`) | Package (self-contained) |
| `useSurfaceProps` call inside picker page | Package |
| `onSelect` closure | Package trigger field |

---

### Adding a new picker field to an existing feature

When a new picker field is needed (e.g., participant picker), the change set is:

1. **Package `surface-ids.ts`** — add one optional key to `XxxSurfaceOpeners`: `openParticipantPicker?: (props: ParticipantPickerSheetSurfaceProps) => void;` and add the new props type.
2. **Package** — add the trigger field component, picker route entry, picker sheet content, query hook, and API function (parallel to the existing picker).
3. **App `surfaces.ts`** — register the new sheet surface with `lazyWithPreload`.
4. **App controller** — add `openParticipantPicker: (props) => openSurface(PARTICIPANT_PICKER_SHEET_SURFACE_ID, props)` to the existing `surfaceOpeners` object. No other controller changes needed.
5. **Package `index.ts`** — export new public types and the new `RouteEntry`.

The provider, route entry, and surface props type are **unchanged** — the optional key in `CaseCreationSurfaceOpeners` means the new opener is automatically available through context without any provider modifications.

---

### Anti-patterns — do not do these

```ts
// ❌ Package component calling openSurface directly
import { useSurface } from "@beyo/ui";
const { openSurface } = useSurface();
openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props); // violates package boundary

// ❌ Passing a surface ID into the package and calling openSurface with it
// The package still ends up importing and calling openSurface — same violation.

// ❌ Separate prop per opener (does not scale)
type CaseCreationSlideSurfaceProps = {
  openCaseTypePicker?: (props: ...) => void;
  openParticipantPicker?: (props: ...) => void; // grows without bound
  // → use surfaceOpeners map instead
};
```
