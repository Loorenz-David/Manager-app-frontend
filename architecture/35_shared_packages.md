# Shared Packages — Migration Contract

This document is the authoritative contract for AI agents performing the task of moving a foundation module from `apps/managers-app/ManagerBeyo-app-managers/` into a shared package under `packages/`. Follow every section exactly.

---

## 1. Philosophy: Source Packages (no build step per package)

Packages expose **raw TypeScript source files** — there is no `tsc` build, no `dist/` output, and no per-package compilation step. Each consuming app's Vite compiler traverses and compiles package source as part of the app build. This is intentional.

**Why this matters:**
- Tailwind CSS v4 (via `@tailwindcss/vite`) auto-discovers class names from all files in Vite's module graph. Source packages are part of that graph automatically.
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

**No `paths` aliases inside packages.** Packages use relative imports only. The `@/` alias belongs to apps, not packages.

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

### Verify resolution works

After `npm install`, check that `node_modules/@beyo/<name>` is a symlink pointing to `packages/<name>`. If it is not a symlink, the workspace is not linked — re-run `npm install` from the root.

---

## 7. Package Catalogue and Peer Dependencies

### `@beyo/lib`
**Contents:** `date/`, `number/`, `phone/`, `utils.ts`, `animation.ts`, `notify.ts`, `client-id.ts`
**Peer dependencies:** `libphonenumber-js`, `sonner`
**No React dependency** — this package is pure TypeScript utilities. Keep it that way.

### `@beyo/api-client`
**Contents:** `api-client.ts`, `auth-token.ts`, `env.ts`
**Peer dependencies:** `zod`
**Note:** `auth-token.ts` lives here because `api-client.ts` calls `refreshAccessToken` and `getAccessToken` from it. They are tightly coupled. Do not split them.
**Note:** `env.ts` exposes `VITE_API_URL`. Keep it here — both apps need the same env key for the API URL.

### `@beyo/ui`
**Contents:** `components/primitives/`, `components/surfaces/`, `components/ui/`
**Peer dependencies:** `react`, `react-dom`, `framer-motion`, `vaul`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@use-gesture/react`, `embla-carousel-react`, `react-textarea-autosize`, `react-virtuoso`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
**Note:** Only include the peers that the package actually imports. Do not list every dep from the app.
**Tailwind note:** CSS class names in this package are picked up by Tailwind automatically because Vite includes source files in its module graph. No `@source` directive needed.

### `@beyo/hooks`
**Contents:** `hooks/` (surface hooks, use-staged-form, use-surface-*)
**Peer dependencies:** `react`, `@beyo/ui`

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
