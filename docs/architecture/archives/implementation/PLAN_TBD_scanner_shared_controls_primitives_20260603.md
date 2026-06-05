# PLAN_TBD_scanner_shared_controls_primitives_20260603

## Metadata

- Plan ID: `PLAN_TBD_scanner_shared_controls_primitives_20260603`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-03T21:00:00Z`
- Last updated at (UTC): `2026-06-03T19:28:59Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_scanner_shared_engine_app_owned_post_scan_workflows_20260603.md`

## Goal and intent

- Goal: Add two stable shared scanner UI primitives to `@beyo/scanner`: a close-control button positioned for scanner use and a camera-lens picker rendered only when multiple cameras are available. Also update `ScannerSlideContent` to accept children so these primitives (and any app-owned overlays) can be rendered inside the scanner shell.
- Business/user intent: Cross-app reuse of scanner controls without each app re-implementing chrome. Apps that build their own post-scan workflows can compose these primitives alongside the shared scanner engine.
- Non-goals: Wiring these primitives into the shared `ScannerSlideRouteEntry` (that is Plan B). No lens-switching state machine here — the primitives are purely presentational.

## Scope

- In scope:
  - `packages/scanner/src/ui/ScannerCloseControl.tsx` — new component
  - `packages/scanner/src/ui/ScannerLensPicker.tsx` — new component
  - `packages/scanner/src/ui/ScannerSlideContent.tsx` — add `children?: ReactNode`
  - `packages/scanner/src/index.ts` — export `ScannerCloseControl`, `ScannerLensPicker`, and `FrozenFrameCanvas` (currently in `ui/` but not yet exported)
- Out of scope:
  - Lens-switching state management (belongs in `useQrScanner` callers)
  - Wiring either primitive into `ScannerSlideRouteEntry` (Plan B)
  - Any managers-app changes

## Clarifications required

_(none — all design decisions are resolved below)_

## Acceptance criteria

1. `ScannerCloseControl` renders a circular button at `absolute bottom-6 right-5 z-30` inside a relative scanner shell, calls `onClose` on press.
2. `ScannerLensPicker` renders `null` when `lenses.length <= 1`; otherwise renders a pill-shaped control centered at `absolute bottom-6 left-1/2 z-30 -translate-x-1/2`, highlights the active lens, and calls `onLensSelect(lensId)` on press.
3. `ScannerSlideContent` accepts and renders `children` inside its root div so callers can compose controls inside the scanner shell.
4. `ScannerCloseControl`, `ScannerLensPicker`, and `FrozenFrameCanvas` are exported from `packages/scanner/src/index.ts`.
5. `npm run typecheck` passes in `apps/managers-app/ManagerBeyo-app-managers`.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: scanner is a source package — no runtime bundling, raw TypeScript exports, peer dependencies only, app-side Tailwind `@source` registration. New components stay inside `packages/scanner/src/ui/`.
- `architecture/07_components.md`: UI primitives are functional components, named exports, props typed via a local `interface`, no default exports.
- `architecture/14_styling.md`: Tailwind utility classes; `cn()` for conditional classes; framer-motion (`m.*`) available for animation.
- `architecture/28_surfaces_local.md`: scanner is a `slide` surface — the new primitives are overlays inside the slide's content shell, not surface-level elements.
- `architecture/31_animations.md`: framer-motion `m` (not `motion`) is the import alias for animated elements.

### Local extensions loaded

_(none for this plan)_

### File read intent — pattern vs. relational

Permitted reads before implementation:
- `packages/scanner/src/ui/ScannerSlideContent.tsx` — to see the exact root div structure and existing z-index layers (relational: understanding what exists)
- `packages/scanner/src/ui/ScannerGuideOverlay.tsx` — to confirm z-20 usage so new controls sit at z-30 without collision (relational)
- `packages/scanner/src/ui/FrozenFrameCanvas.tsx` — to confirm the current component signature before adding it to the public API (relational)
- `packages/scanner/src/types.ts` — for `ScannerLens` type (relational)
- `packages/scanner/src/index.ts` — to find the correct export block location (relational)

Prohibited (pattern reads):
- Reading other scanner UI components to understand "how to write a scanner control" — `07_components.md` + `14_styling.md` already define the pattern.

### Skill selection

- Primary skill: none (pure UI primitive authoring)

## Implementation plan

### Step 1 — `ScannerCloseControl.tsx`

Create `packages/scanner/src/ui/ScannerCloseControl.tsx`:

```tsx
import { X } from "lucide-react";

interface ScannerCloseControlProps {
  onClose: () => void;
}

export function ScannerCloseControl({
  onClose,
}: ScannerCloseControlProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label="Close scanner"
      className="absolute bottom-6 right-5 z-30 flex size-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm active:bg-white/20"
      onClick={onClose}
    >
      <X aria-hidden="true" className="size-5" />
    </button>
  );
}
```

Design notes:
- `z-30` matches the camera-loading and camera-error overlay layers in `ScannerSlideContent`.
- `backdrop-blur-sm` keeps it legible over any camera frame content.
- No framer-motion needed — simple tap target.

---

### Step 2 — `ScannerLensPicker.tsx`

Create `packages/scanner/src/ui/ScannerLensPicker.tsx`:

```tsx
import { cn } from "../lib/utils";
import type { ScannerLens } from "../types";

interface ScannerLensPickerProps {
  lenses: ScannerLens[];
  activeLensId: string | null;
  onLensSelect: (lensId: string) => void;
}

export function ScannerLensPicker({
  lenses,
  activeLensId,
  onLensSelect,
}: ScannerLensPickerProps): React.JSX.Element | null {
  if (lenses.length <= 1) {
    return null;
  }

  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/10 px-2 py-1.5 backdrop-blur-sm">
      {lenses.map((lens) => (
        <button
          key={lens.id}
          type="button"
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium text-white transition-colors",
            lens.id === activeLensId ? "bg-white/25" : "hover:bg-white/10",
          )}
          onClick={() => onLensSelect(lens.id)}
        >
          {lens.label}
        </button>
      ))}
    </div>
  );
}
```

Design notes:
- Returns `null` when single camera — no empty DOM node.
- Pill container is centered using `left-1/2 -translate-x-1/2` (same pattern used elsewhere in the app).
- `cn()` comes from `../lib/utils` — verify that path resolves inside the scanner package before using it. If `lib/utils` does not exist in the scanner package, inline the ternary directly instead of using `cn`.
- Max width not constrained — labels are short (e.g., "Wide", "Ultra"), so overflow is unlikely. If a future app has long lens names, callers can wrap with `max-w-[80vw] overflow-x-auto`.

---

### Step 3 — Update `ScannerSlideContent.tsx`

Add `children?: ReactNode` to `ScannerSlideContentProps` and render it inside the root div:

```tsx
import type { ReactNode } from "react";
// ... existing imports unchanged

interface ScannerSlideContentProps {
  sessionId: string;
  isCameraReady: boolean;
  cameraError: string | null;
  onRetry?: () => void;
  scanFormat?: ScanFormat;
  children?: ReactNode;
}

export function ScannerSlideContent({
  // ... existing props unchanged
  children,
}: ScannerSlideContentProps): React.JSX.Element {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020617]">
      {/* ... existing inner elements unchanged */}
      {children}
    </div>
  );
}
```

Placement: `{children}` is rendered after the existing `cameraError` conditional block (last child inside the root div), so all child nodes are at or above the existing overlays. Since children supply their own z-index (z-30), order within the DOM is irrelevant for stacking.

---

### Step 4 — Update `packages/scanner/src/index.ts`

Add three exports to the existing `ui` block:

```ts
export { ScannerCloseControl } from "./ui/ScannerCloseControl";
export { ScannerLensPicker } from "./ui/ScannerLensPicker";
export { FrozenFrameCanvas } from "./ui/FrozenFrameCanvas";
```

`FrozenFrameCanvas` is added here because it is a stable shared primitive required by any app that implements a frozen-frame success state — it is currently in `ui/` but absent from the public API.

---

### Step 5 — Typecheck

Run in `apps/managers-app/ManagerBeyo-app-managers`:

```sh
npm run typecheck
```

Expected: zero errors. No managers-app files changed; this verifies the new exports don't break the existing import graph.

## Risks and mitigations

- Risk: `cn()` from `../lib/utils` may not exist inside the scanner package.
  Mitigation: Before writing `ScannerLensPicker`, check whether `packages/scanner/src/lib/utils.ts` exists. If not, inline the class ternary directly rather than importing `cn`.

- Risk: `FrozenFrameCanvas` type signature may change in Plan B if the frozen-frame concept is expanded.
  Mitigation: Export it as-is; the current `{ dataUrl, width, height }` props are stable and do not depend on scanner-internal state.

## Validation plan

- `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`: zero TypeScript errors
- Visual inspection not required for this plan (primitives are composed and tested in Plan B)

## Review log

- `2026-06-03`: Implemented `ScannerCloseControl`, `ScannerLensPicker`, `ScannerSlideContent` children composition, and public exports for scanner overlay primitives; managers-app `npm run typecheck` passed.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `codex`
