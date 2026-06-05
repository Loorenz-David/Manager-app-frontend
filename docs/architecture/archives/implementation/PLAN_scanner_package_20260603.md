# PLAN_scanner_package_20260603

## Metadata

- Plan ID: `PLAN_scanner_package_20260603`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-03T00:00:00Z`
- Last updated at (UTC): `2026-06-03T17:48:00Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- **Goal:** Move `scanner-core/` into a new `@beyo/scanner` workspace package and wire the managers app's `ItemIdentityField` scan buttons to open a full-screen scanner slide surface; scanned values are written directly to the active input (article number or SKU) and the scanner closes immediately.
- **Business/user intent:** Give every frontend app a single, shared QR scanner that can be consumed with minimal configuration. The managers app is the first consumer: the scan buttons in the task-creation forms (Internal, Pre-Order, Return) will open the scanner without any freeze-frame or confirmation step.
- **Non-goals:** Workers app integration (future). Barcode format expansion beyond QR. Lens-switching UI. Frozen-frame confirmation flow. Any scanner business logic beyond set-value-and-close.

---

## Scope

**In scope:**
- Creating `packages/scanner/` with `package.json`, `tsconfig.json`, all `scanner-core/` source files, and two new files: `ScannerSlideContent.tsx` and `ScannerSlideRouteEntry.tsx`.
- Adding `surface-ids.ts` to the package defining `SCANNER_SLIDE_SURFACE_ID`, `SCANNER_SESSION_ID`, and `ScannerSlideSurfaceProps`.
- Registering the scanner slide surface in the managers app (`items/surfaces.ts`).
- Wiring `useCameraPrewarm` for the scanner session in the three task-creation form components.
- Adding an `onOpenScanner` prop to `ItemIdentityField` so scan buttons invoke the opener.
- Wiring the surface opener in `InternalFormContent`, `PreOrderFormContent`, and `ReturnFormContent`.
- Adding `useCameraAppLifecycleFlow` at the app root (suspend/resume camera on tab hide/show).
- Running `npm install` from `frontend/` after registering the package.

**Out of scope:**
- Workers app integration.
- Lens picker UI inside the scanner slide.
- Any form of scan confirmation or frozen-frame display.
- Changes to `scanner-core/` internal decoding logic.

**Assumptions:**
- `@zxing/browser` and `@zxing/library` are not yet installed; they must be added to the managers app's `package.json` as direct dependencies.
- The slide surface system provides its own back/close gesture; no explicit close button is needed inside the scanner slide content.
- `framer-motion` is already installed in the managers app (`^12.39.0`); no version change needed.
- `@beyo/hooks` is already installed in the managers app (confirmed in `package.json`); no new dep needed there.

---

## Clarifications required

None — all unknowns resolved during research.

---

## Acceptance criteria

1. `packages/scanner/` exists with correct `package.json` and `tsconfig.json`; no `build` script, no `dist/`.
2. All scanner-core source files are present under `packages/scanner/src/`.
3. `npm install` from `frontend/` links `node_modules/@beyo/scanner` as a symlink to `packages/scanner`.
4. The three task-creation forms prewarm the scanner camera on mount via `useCameraPrewarm(SCANNER_SESSION_ID, 200)`.
5. Tapping the scan button in `ItemIdentityField` (either tab) opens the scanner slide surface.
6. A successful QR scan writes the decoded value to the currently-active identity input (`item.article_number` or `item.sku`) and closes the scanner slide.
7. Managers app `npm run build` and `npm run typecheck` pass with zero errors.
8. `useCameraAppLifecycleFlow` is mounted once at the app root so camera sessions suspend on tab hide.

---

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: package creation rules, peerDependencies only, no build step, `exports` points to raw TS source, `@source` directive for Tailwind, `surfaceOpeners` injection pattern (§13).

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types (`slide`, `sheet`, `modal`); scanner slide is type `slide`.
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path, `usePreloadSurface` pattern.

### File read intent — pattern vs. relational

Permitted reads (relational — existing behavior):
- `scanner-core/**` — understanding existing source to copy faithfully.
- `features/items/surfaces.ts` — existing surface registration pattern to extend.
- `features/items/components/fields/ItemIdentityField.tsx` — existing prop shape, tab state, button placement.
- `features/task-creation/components/InternalFormContent.tsx` — existing hook calls, form shape.
- `features/task-creation/components/PreOrderFormContent.tsx` — same.
- `features/task-creation/components/ReturnFormContent.tsx` — same.
- `app/providers.tsx` — where to mount `useCameraAppLifecycleFlow`.

Prohibited (pattern reads — contract covers these):
- Reading another package's `package.json` to understand the peer deps structure → `35_shared_packages.md §3`.
- Reading another slide page to understand route entry shape → `35_shared_packages.md §13`.

---

## Implementation plan

### Step 1 — Create `packages/scanner/package.json`

Create `packages/scanner/package.json`:

```json
{
  "name": "@beyo/scanner",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/hooks": "*",
    "@zxing/browser": ">=0.0.0",
    "@zxing/library": ">=0.0.0",
    "framer-motion": ">=12.0.0",
    "react": ">=19.0.0"
  }
}
```

---

### Step 2 — Create `packages/scanner/tsconfig.json`

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

---

### Step 3 — Copy scanner-core source files into `packages/scanner/src/`

Copy each file exactly, preserving all relative imports (they stay valid in the new location). No `@/` aliases to remove — `scanner-core/` already uses only relative imports.

Files to copy (source → destination):

| Source | Destination |
|---|---|
| `scanner-core/types.ts` | `packages/scanner/src/types.ts` |
| `scanner-core/domain/camera-session.manager.ts` | `packages/scanner/src/domain/camera-session.manager.ts` |
| `scanner-core/domain/scanner-camera-lens.ts` | `packages/scanner/src/domain/scanner-camera-lens.ts` |
| `scanner-core/domain/scanner-guide.ts` | `packages/scanner/src/domain/scanner-guide.ts` |
| `scanner-core/domain/zxing-loader.ts` | `packages/scanner/src/domain/zxing-loader.ts` |
| `scanner-core/flows/use-camera-app-lifecycle.ts` | `packages/scanner/src/flows/use-camera-app-lifecycle.ts` |
| `scanner-core/flows/use-camera-prewarm.ts` | `packages/scanner/src/flows/use-camera-prewarm.ts` |
| `scanner-core/flows/use-qr-scanner.ts` | `packages/scanner/src/flows/use-qr-scanner.ts` |
| `scanner-core/ui/ScannerGuideOverlay.tsx` | `packages/scanner/src/ui/ScannerGuideOverlay.tsx` |
| `scanner-core/ui/FrozenFrameCanvas.tsx` | `packages/scanner/src/ui/FrozenFrameCanvas.tsx` |

`FrozenFrameCanvas.tsx` is copied but **not exported** from `index.ts` — it is an internal file.

After copying, verify: no file contains `@/` imports. They should all be `../` or `./` relative paths. The structure already passes this check.

---

### Step 4 — Create `packages/scanner/src/surface-ids.ts`

```ts
export const SCANNER_SLIDE_SURFACE_ID = "scanner-slide";

export const SCANNER_SESSION_ID = "item-barcode-scanner";

export type ScannerSlideSurfaceProps = {
  sessionId: string;
  onScan: (value: string) => void;
};
```

`SCANNER_SESSION_ID` is the camera session key shared between:
- the prewarm calls in the creation forms (to warm the camera before the user taps scan)
- the scanner slide route entry (to attach the decode session to the same warm stream)

---

### Step 5 — Create `packages/scanner/src/ui/ScannerSlideContent.tsx`

This is the pure camera-view component. It takes `sessionId`, `isCameraReady`, and `cameraError` as props. It renders the camera region container (which the session manager uses to mount the video element), the guide overlay, and minimal status states.

```tsx
import { getCameraRegionId } from "../domain/camera-session.manager";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";

interface ScannerSlideContentProps {
  sessionId: string;
  isCameraReady: boolean;
  cameraError: string | null;
}

export function ScannerSlideContent({
  sessionId,
  isCameraReady,
  cameraError,
}: ScannerSlideContentProps): React.JSX.Element {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020617]">
      <div
        id={getCameraRegionId(sessionId)}
        className="absolute inset-0"
      />

      <ScannerGuideOverlay isFrozen={false} />

      {!isCameraReady && !cameraError ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <p className="text-sm text-white/60">Starting camera…</p>
        </div>
      ) : null}

      {cameraError ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-red-400">{cameraError}</p>
        </div>
      ) : null}
    </div>
  );
}
```

Important: `isFrozen` is always `false` — no freeze-frame step is needed.

---

### Step 6 — Create `packages/scanner/src/pages/ScannerSlideRouteEntry.tsx`

This is the self-contained slide entry point. It reads surface props via `useSurfaceProps` from `@beyo/hooks`, calls `useQrScanner`, and renders `ScannerSlideContent`. The `onScan` callback is fully owned by the caller — it handles both setting the form value and closing the surface. The package stays clean.

```tsx
import { useSurfaceProps } from "@beyo/hooks";
import { useQrScanner } from "../flows/use-qr-scanner";
import { ScannerSlideContent } from "../ui/ScannerSlideContent";
import type { ScannerSlideSurfaceProps } from "../surface-ids";

export function ScannerSlideRouteEntry(): React.JSX.Element {
  const { sessionId = "item-barcode-scanner", onScan } =
    useSurfaceProps<ScannerSlideSurfaceProps>();

  const { isCameraReady, cameraError } = useQrScanner({
    sessionId,
    onDecode: (value) => {
      onScan?.(value);
    },
  });

  return (
    <ScannerSlideContent
      sessionId={sessionId}
      isCameraReady={isCameraReady}
      cameraError={cameraError}
    />
  );
}
```

Notes:
- `onScan?.()` is called with optional chaining — `useSurfaceProps` returns `Partial<T>`, so the callback may be undefined if the surface was opened without props (defensive guard only).
- The `sessionId` fallback `"item-barcode-scanner"` matches `SCANNER_SESSION_ID` for safety.
- There is no `useSurface` call here. The app-side `onScan` closure is responsible for closing the surface — this keeps the package free of surface system imports beyond `useSurfaceProps`.

---

### Step 7 — Create `packages/scanner/src/index.ts`

```ts
export type { ScannerLens, ScannerFrozenFrame } from "./types";

export { getCameraRegionId } from "./domain/camera-session.manager";
export type { CameraSessionId } from "./domain/camera-session.manager";
export {
  prewarmCameraSession,
  attachDecodeSession,
  releaseAllCameraSessions,
  suspendAllCameraSessions,
  resumePrewarmedCameraSessions,
  CAMERA_IDLE_RELEASE_MS,
} from "./domain/camera-session.manager";
export {
  mapCameraDevicesToLenses,
  resolvePreferredLensId,
  getRememberedLensId,
  rememberLensId,
} from "./domain/scanner-camera-lens";
export {
  getScannerGuideRect,
  SCANNER_GUIDE_OFFSET_TOP_PX,
  SCANNER_GUIDE_VIEWPORT_SIZE_RATIO,
  SCANNER_GUIDE_MIN_SIZE_PX,
  SCANNER_GUIDE_MAX_SIZE_PX,
} from "./domain/scanner-guide";
export {
  useCameraPrewarm,
  CAMERA_IDLE_RELEASE_MS as PREWARM_IDLE_RELEASE_MS,
} from "./flows/use-camera-prewarm";
export { useCameraAppLifecycleFlow } from "./flows/use-camera-app-lifecycle";
export {
  useQrScanner,
  type UseQrScannerOptions,
  type UseQrScannerResult,
} from "./flows/use-qr-scanner";
export { ScannerGuideOverlay } from "./ui/ScannerGuideOverlay";
export { ScannerSlideContent } from "./ui/ScannerSlideContent";
export { ScannerSlideRouteEntry } from "./pages/ScannerSlideRouteEntry";
export {
  SCANNER_SLIDE_SURFACE_ID,
  SCANNER_SESSION_ID,
  type ScannerSlideSurfaceProps,
} from "./surface-ids";
```

`FrozenFrameCanvas` is intentionally omitted from the barrel — it is internal.

---

### Step 8 — Add `@beyo/scanner` to managers app `package.json`

In `apps/managers-app/ManagerBeyo-app-managers/package.json`, add to `"dependencies"`:

```json
"@beyo/scanner": "*",
"@zxing/browser": ">=0.0.0",
"@zxing/library": ">=0.0.0"
```

`@zxing/browser` and `@zxing/library` are peer dependencies of `@beyo/scanner`. The managers app must install them.

After editing, run from `frontend/`:
```bash
npm install
```

Verify `node_modules/@beyo/scanner` is a symlink pointing to `packages/scanner`.

---

### Step 9 — Add `@source` directive to `src/index.css`

In `apps/managers-app/ManagerBeyo-app-managers/src/index.css`, add after the existing `@source` lines:

```css
@source "../../../../packages/scanner/src";
```

`ScannerSlideContent.tsx` and `ScannerGuideOverlay.tsx` contain Tailwind class names. Without this directive, those classes will not appear in the generated CSS and the scanner overlay will be unstyled.

---

### Step 10 — Register the scanner slide surface in `features/items/surfaces.ts`

Add the scanner slide surface registration alongside the existing item-category-picker surface.

```ts
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { lazyWithPreload } from "@beyo/ui";
import { SCANNER_SLIDE_SURFACE_ID } from "@beyo/scanner";

function loadItemCategoryPickerSheetPage() {
  return import("@/features/items/pages/ItemCategoryPickerSheetPage").then(
    (module) => ({ default: module.ItemCategoryPickerSheetPage }),
  );
}

function loadScannerSlidePage() {
  return import("@beyo/scanner").then((module) => ({
    default: module.ScannerSlideRouteEntry,
  }));
}

const itemCategoryPicker = lazyWithPreload(loadItemCategoryPickerSheetPage);
const scannerSlide = lazyWithPreload(loadScannerSlidePage);

export const preloadItemCategoryPickerSurface = itemCategoryPicker.preload;
export const preloadScannerSlideSurface = scannerSlide.preload;

export const itemSurfaces: SurfaceRegistrations = {
  "item-category-picker": {
    surface: "sheet",
    component: itemCategoryPicker.Component,
  },
  [SCANNER_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: scannerSlide.Component,
  },
};
```

---

### Step 11 — Export `preloadScannerSlideSurface` from `features/items/index.ts`

Add to `apps/managers-app/ManagerBeyo-app-managers/src/features/items/index.ts`:

```ts
export { itemSurfaces, preloadItemCategoryPickerSurface, preloadScannerSlideSurface } from './surfaces';
```

Replace the existing `surfaces` export line with this updated line.

---

### Step 12 — Add `onOpenScanner` prop to `ItemIdentityField`

In `apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemIdentityField.tsx`:

Add an optional prop `onOpenScanner?: (tab: IdentityTab) => void` to the component signature. Each scan button's `onClick` handler calls `onOpenScanner?.(activeTab)`.

The `IdentityTab` type (`"article_number" | "sku"`) is already defined in the file. No new exports needed — the prop type is self-contained in the component signature.

Updated component signature:
```tsx
export function ItemIdentityField({
  onOpenScanner,
}: {
  onOpenScanner?: (tab: IdentityTab) => void;
}): React.JSX.Element {
```

Updated scan button onClick (for both article-number and SKU buttons — both share the same handler since `activeTab` already reflects which tab is shown):
```tsx
onClick={() => {
  onOpenScanner?.(activeTab);
}}
```

Replace both `console.log("opening scanner...")` and `console.log("opening scanner...")` calls with `onOpenScanner?.(activeTab)`.

---

### Step 13 — Wire scanner in `InternalFormContent.tsx`

In `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/InternalFormContent.tsx`:

1. Add imports:
```tsx
import { useSurface } from "@/hooks/use-surface";
import { useCameraPrewarm, SCANNER_SESSION_ID, SCANNER_SLIDE_SURFACE_ID } from "@beyo/scanner";
```

2. Inside the component body, add prewarm and surface hook calls:
```tsx
const surface = useSurface();
useCameraPrewarm(SCANNER_SESSION_ID, 200);
```

The `delayMs: 200` gives the slide animation time to start before the camera is requested — matches the pattern described in the scanner-core README's "prewarm during the lead-in transition" guidance.

3. Build the `onOpenScanner` handler and pass it to `ItemIdentityField`:
```tsx
function handleOpenScanner(tab: "article_number" | "sku"): void {
  surface.open(SCANNER_SLIDE_SURFACE_ID, {
    sessionId: SCANNER_SESSION_ID,
    onScan: (value: string) => {
      form.setValue(
        tab === "article_number" ? "item.article_number" : "item.sku",
        value,
        { shouldDirty: true },
      );
      surface.close(SCANNER_SLIDE_SURFACE_ID);
    },
  } satisfies import("@beyo/scanner").ScannerSlideSurfaceProps);
}
```

4. Pass to `ItemIdentityField` in the JSX:
```tsx
<ItemIdentityField onOpenScanner={handleOpenScanner} />
```

---

### Step 14 — Wire scanner in `PreOrderFormContent.tsx`

Same pattern as Step 13.

In `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/PreOrderFormContent.tsx`:

1. Add imports:
```tsx
import { useCameraPrewarm, SCANNER_SESSION_ID, SCANNER_SLIDE_SURFACE_ID } from "@beyo/scanner";
```
(`useSurface` is already imported from `@/hooks/use-surface`)

2. Add prewarm call after existing surface hooks:
```tsx
useCameraPrewarm(SCANNER_SESSION_ID, 200);
```

3. Build `handleOpenScanner` and pass to `ItemIdentityField` (same shape as Step 13).

---

### Step 15 — Wire scanner in `ReturnFormContent.tsx`

Same pattern as Step 14.

In `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/ReturnFormContent.tsx`:

1. Add imports (same as Step 14).
2. Add `useCameraPrewarm(SCANNER_SESSION_ID, 200)`.
3. Build `handleOpenScanner` and pass to `ItemIdentityField`.

---

### Step 16 — Add `useCameraAppLifecycleFlow` at app root

In `apps/managers-app/ManagerBeyo-app-managers/src/app/providers.tsx`:

1. Add import:
```tsx
import { useCameraAppLifecycleFlow } from "@beyo/scanner";
```

2. Create a small side-effect component just before or inside `AppProviders`:
```tsx
function CameraLifecycleHandler(): null {
  useCameraAppLifecycleFlow();
  return null;
}
```

3. Render it as a child inside `QueryClientProvider` (after React context is available):
```tsx
<QueryClientProvider client={queryClient}>
  <CameraLifecycleHandler />
  {children}
  <Toaster position="top-center" richColors />
</QueryClientProvider>
```

This ensures camera sessions are suspended when the app tab is backgrounded and resumed when it returns to focus.

---

### Step 17 — Validate

```bash
# From frontend/
npm run typecheck   # zero errors
npm run build       # both apps build cleanly
```

---

## Risks and mitigations

- **Risk:** `@zxing/browser` and `@zxing/library` are not in `node_modules` yet, causing build failure.
  **Mitigation:** Step 8 adds them to the managers app `package.json`; `npm install` at Step 8 resolves this before any import happens.

- **Risk:** `ScannerGuideOverlay.tsx` uses `motion` (not `m`) from framer-motion. The managers app uses `LazyMotion` with `domAnimation`. Mixing `motion.X` and `LazyMotion` causes framer-motion to load the full feature bundle for those components.
  **Mitigation:** This is an acceptable trade-off for a scanner overlay. No correctness issue — framer-motion handles both modes. Bundle split impact is minimal for a scanner surface.

- **Risk:** `useSurfaceProps` returns `Partial<T>`, so `onScan` may be undefined at the route entry.
  **Mitigation:** `onScan?.()` optional chaining in `ScannerSlideRouteEntry` guards against this. If `onScan` is not provided, the scanner will decode but do nothing — a safe no-op.

- **Risk:** Camera prewarm starts 200 ms after form mount, but the user could open the scanner immediately.
  **Mitigation:** `attachDecodeSession` handles the case where no warm stream exists — it opens a cold stream. The delay is an optimization, not a requirement.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors in both managers app and `packages/scanner`.
- `npm run build`: clean Vite build for managers app.
- Manual smoke test: open Internal Task Creation slide → tap scan button on Article Number tab → scanner slide opens with camera → hold a QR code in front → slide closes → article number input is populated with decoded value.
- Manual smoke test: repeat with SKU tab selected — SKU input is populated.
- Manual smoke test: repeat for Pre-Order and Return creation slides.
- Manual verification: background the app mid-scan → foreground it → camera resumes (confirms `useCameraAppLifecycleFlow` is working).

---

## Review log

- `2026-06-03`: Implemented `@beyo/scanner`, wired the managers-app task-creation forms, and validated with managers-app `npm run typecheck` and `npm run build`.

---

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: codex
