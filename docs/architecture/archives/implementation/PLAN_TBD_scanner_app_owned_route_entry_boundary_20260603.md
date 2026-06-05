# PLAN_TBD_scanner_app_owned_route_entry_boundary_20260603

## Metadata

- Plan ID: `PLAN_TBD_scanner_app_owned_route_entry_boundary_20260603`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-03T21:00:00Z`
- Last updated at (UTC): `2026-06-03T19:28:59Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_scanner_shared_engine_app_owned_post_scan_workflows_20260603.md`
- Depends on: `PLAN_TBD_scanner_shared_controls_primitives_20260603` (must be implemented first)

## Goal and intent

- Goal: Compose the shared scanner controls (`ScannerCloseControl`, `ScannerLensPicker`) into the shared `ScannerSlideRouteEntry`, add lens-selection state so the lens picker is interactive, and ensure every building block an app needs to write its own route entry is part of the public `@beyo/scanner` API.
- Business/user intent: The managers app gets a close button and lens switcher inside the scanner at no migration cost. Future apps that need API-backed post-scan flows can compose `useQrScanner` + shared primitives into a fully custom route entry without touching the scanner engine.
- Non-goals:
  - Building a worker-app or delivery-app scanner route entry.
  - Implementing API submission, loading states, or frozen-frame result cards (those belong in app-owned route entries).
  - Removing `ScannerSlideRouteEntry` from the shared package — it remains as the default for close-immediately flows.

## Scope

- In scope:
  - `packages/scanner/src/pages/ScannerSlideRouteEntry.tsx` — add lens state, wire `ScannerCloseControl` and `ScannerLensPicker`
  - `packages/scanner/src/index.ts` — verify all app-composition building blocks are exported (no gaps)
  - No managers-app files change — the managers app already consumes the shared route entry
- Out of scope:
  - `ScannerSlideSurfaceProps` shape changes (no new required props)
  - Workers app or any second app adopting the scanner

## Clarifications required

_(none — design resolved below)_

## Acceptance criteria

1. The shared `ScannerSlideRouteEntry` renders a `ScannerCloseControl` (bottom-right) that closes `SCANNER_SLIDE_SURFACE_ID` when pressed.
2. The shared `ScannerSlideRouteEntry` renders a `ScannerLensPicker` (centered bottom) when more than one camera is available; tapping a lens restarts the decode session on that camera and persists the selection via `rememberLensId`.
3. All building blocks for a custom route entry are in the public API: `useQrScanner`, `ScannerSlideContent`, `ScannerCloseControl`, `ScannerLensPicker`, `FrozenFrameCanvas`, `rememberLensId`, `SCANNER_SLIDE_SURFACE_ID`, `ScannerSlideSurfaceProps`, `SCANNER_SESSION_ID`.
4. `ScannerSlideSurfaceProps` gains no new required fields — the managers app's existing scanner surface registrations remain valid without any change.
5. `npm run typecheck` passes in `apps/managers-app/ManagerBeyo-app-managers`.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: scanner remains a source package. `ScannerSlideRouteEntry` is a page-level component inside the package; it is allowed to consume surface hooks and `@beyo/hooks` (peer dependency already declared).
- `architecture/07_components.md`: named export, props via interface, no default export.
- `architecture/28_surfaces_local.md`: the scanner is registered as a `slide` surface in the managers app. `SCANNER_SLIDE_SURFACE_ID` is the ID used to close it programmatically.
- `architecture/30_dynamic_loading_local.md`: no new dynamic loading changes needed; the route entry file is already loaded lazily via the surface system.

### Local extensions loaded

_(none)_

### File read intent — pattern vs. relational

Permitted reads before implementation:
- `packages/scanner/src/pages/ScannerSlideRouteEntry.tsx` — to confirm the current import set and structure before editing (relational)
- `packages/scanner/src/flows/use-qr-scanner.ts` — to confirm `selectedLensId` and `lensSelectionRevision` parameter names (relational)
- `packages/scanner/src/surface-ids.ts` — to confirm `SCANNER_SLIDE_SURFACE_ID` value (relational)
- `packages/hooks/src/use-surface.ts` — to confirm `useSurface` provides a `close(id)` function (relational: understanding what exists in the dep)
- `packages/scanner/src/index.ts` — to audit which building blocks are already exported (relational)

Prohibited (pattern reads):
- Reading another route entry to understand "how to write a route entry" — `07_components.md` defines the pattern.
- Reading a surface's registration file to understand the surface close pattern — `useSurface` from `@beyo/hooks` is already confirmed as the correct API.

### Skill selection

- Primary skill: none (targeted edit to an existing component)

## Implementation plan

### Step 1 — Update `ScannerSlideRouteEntry.tsx`

Full updated file (replaces the current implementation):

```tsx
import { useState, useEffect } from "react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { rememberLensId } from "../domain/scanner-camera-lens";
import { useQrScanner } from "../flows/use-qr-scanner";
import {
  SCANNER_SESSION_ID,
  SCANNER_SLIDE_SURFACE_ID,
  type ScannerSlideSurfaceProps,
} from "../surface-ids";
import { ScannerCloseControl } from "../ui/ScannerCloseControl";
import { ScannerLensPicker } from "../ui/ScannerLensPicker";
import { ScannerSlideContent } from "../ui/ScannerSlideContent";

export function ScannerSlideRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { close } = useSurface();
  const { sessionId = SCANNER_SESSION_ID, onScan, scanFormat = "qr" } =
    useSurfaceProps<ScannerSlideSurfaceProps>();

  const [selectedLensId, setSelectedLensId] = useState<string | null>(null);
  const [lensRevision, setLensRevision] = useState(0);

  const { isCameraReady, cameraError, restart, availableLenses, activeLensId } =
    useQrScanner({
      sessionId,
      onDecode: (value) => {
        onScan?.(value);
      },
      scanFormat,
      selectedLensId,
      lensSelectionRevision: lensRevision,
    });

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  function handleClose(): void {
    close(SCANNER_SLIDE_SURFACE_ID);
  }

  function handleLensSelect(lensId: string): void {
    rememberLensId(lensId);
    setSelectedLensId(lensId);
    setLensRevision((r) => r + 1);
  }

  return (
    <ScannerSlideContent
      sessionId={sessionId}
      isCameraReady={isCameraReady}
      cameraError={cameraError}
      onRetry={restart}
      scanFormat={scanFormat}
    >
      <ScannerLensPicker
        lenses={availableLenses}
        activeLensId={activeLensId}
        onLensSelect={handleLensSelect}
      />
      <ScannerCloseControl onClose={handleClose} />
    </ScannerSlideContent>
  );
}
```

Key decisions:
- `useSurface` is imported from `@beyo/hooks` (already a peer dep of the scanner package via `use-surface-header`).
- `close(SCANNER_SLIDE_SURFACE_ID)` closes the slide by its well-known ID — same ID the managers app registers.
- `lensRevision` increments force `useQrScanner` to restart the decode loop on a new device without requiring the lens to actually change value (needed when re-selecting the same lens after an error).
- `ScannerLensPicker` renders nothing when only one camera is available — no layout impact for single-camera devices.
- `ScannerCloseControl` is always rendered — always provides a visible close affordance.
- `onScan` in `ScannerSlideSurfaceProps` remains optional (`onScan?.(value)`) so existing surface registrations without a close handler continue to work.

---

### Step 2 — Audit `packages/scanner/src/index.ts` for composition completeness

Before running typecheck, verify the following are all exported (no gaps that would block a future app-owned route entry):

| Export | Purpose for app-owned route entry | Currently exported? |
|---|---|---|
| `useQrScanner` | Decode loop + camera state | Yes |
| `ScannerSlideContent` | Camera shell with guide overlay | Yes |
| `ScannerCloseControl` | Close button primitive | Added in Plan A |
| `ScannerLensPicker` | Lens picker primitive | Added in Plan A |
| `FrozenFrameCanvas` | Frozen frame display primitive | Added in Plan A |
| `rememberLensId` | Persist lens preference | Yes |
| `getRememberedLensId` | Read persisted lens | Yes |
| `SCANNER_SLIDE_SURFACE_ID` | Surface ID for closing the slide | Yes |
| `SCANNER_SESSION_ID` | Default session ID | Yes |
| `ScannerSlideSurfaceProps` | Surface props type | Yes |
| `ScannerFrozenFrame` | Frame capture return type | Yes |
| `ScannerLens` | Lens descriptor type | Yes |
| `ScanFormat` | Scan mode type | Yes |
| `useCameraPrewarm` | Prewarm hook | Yes |
| `CAMERA_IDLE_RELEASE_MS` | Idle release constant | Yes |

If any export is missing after Plan A, add it in this step.

---

### Step 3 — Typecheck

Run in `apps/managers-app/ManagerBeyo-app-managers`:

```sh
npm run typecheck
```

Expected: zero errors.

The managers app's existing scanner surface registrations (`src/features/items/surfaces.ts` or equivalent) pass `onScan` and `scanFormat` as before — no changes required because `ScannerSlideSurfaceProps` gains no new required fields.

## Risks and mitigations

- Risk: `useSurface` from `@beyo/hooks` imports from `@beyo/ui` (`useSurfaceStore`). If the scanner package's `tsconfig` doesn't resolve `@beyo/ui`, the import chain may fail typecheck.
  Mitigation: `useSurface` is already in `@beyo/hooks` (same package that `ScannerSlideRouteEntry` already imports `useSurfaceHeader` and `useSurfaceProps` from). If those already resolve, `useSurface` will too. If there's a type error, import `useSurface` from `@beyo/hooks` directly — not from `@beyo/ui` — and the transitive dep is resolved by the hooks package, not the scanner package.

- Risk: Calling `close(SCANNER_SLIDE_SURFACE_ID)` from a surface that is itself hosted at `SCANNER_SLIDE_SURFACE_ID` may or may not be idiomatic depending on the surface store implementation. It should be safe since `close(id)` is a store action and is not tied to component unmount order.
  Mitigation: If typecheck or runtime shows issues, replace with `closeTop()` from `useSurface()` which closes the topmost surface — equivalent when the scanner slide is the active surface.

- Risk: Lens state (`selectedLensId` / `lensRevision`) resets on component re-render triggered by surface suspension.
  Mitigation: This is acceptable — if the surface suspends (app background), lens state resetting is the correct behavior since `resumePrewarmedCameraSessions` will restart the stream without a device constraint anyway.

## Validation plan

- `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`: zero TypeScript errors
- Manual — open task creation form → scanner slide → confirm X close button visible → tap → slide closes
- Manual — on a device with multiple cameras → confirm lens picker pill appears → tap lens → decode restarts on new camera
- Manual — on a device with single camera → confirm lens picker is not rendered (no pill visible)
- Manual — scan → confirm `onScan` still fires and slide closes exactly as before (regression check)

## Review log

- `2026-06-03`: Wired the shared scanner controls and lens-selection behavior into `ScannerSlideRouteEntry`, preserved managers-app compatibility, and passed managers-app `npm run typecheck`.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `codex`
