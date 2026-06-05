# PLAN_scanner_multi_format_20260603

## Metadata

- Plan ID: `PLAN_scanner_multi_format_20260603`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-03T00:00:00Z`
- Last updated at (UTC): `2026-06-03T18:22:11Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- **Goal:** Extend `@beyo/scanner` to accept a `scanFormat` parameter (`"qr"` | `"barcode"` | `"any"`) that controls both which ZXing decode hints are used and which guide overlay + scan-region geometry is presented. The managers app passes `"barcode"` when the article-number tab is active and `"qr"` when the SKU tab is active.
- **Business/user intent:** Article numbers on furniture are printed as linear (1D) barcodes on labels. SKU codes are typically QR codes printed in digital workflows. Using the wrong decode mode wastes CPU cycles and confuses users — the guide box shape communicates to the user how to orient the label.
- **Non-goals:** Lens switching UI. Frozen-frame confirmation flow. Any barcode format outside the standard retail/industrial 1D set. Adding `scanFormat` to `useCameraPrewarm` (prewarm is format-agnostic; the stream is the same regardless of format). Changes to the workers app.

---

## Scope

**In scope:**
- `ScanFormat` type added to `packages/scanner/src/types.ts`.
- `zxing-loader.ts` refactored: per-format factory cache, renamed to `loadReaderFactory(format)`.
- `scanner-guide.ts` extended: barcode guide constants + `getBarcodeGuideRect`.
- `camera-session.manager.ts` updated: `DecodeSessionOptions.scanFormat`, `buildDecodeCanvas` uses correct ROI per format, `loadReaderFactory` replaces `loadQrReaderFactory`.
- `use-qr-scanner.ts` updated: `UseQrScannerOptions.scanFormat` option + effect dependency.
- `ScannerGuideOverlay.tsx` updated: `scanFormat` prop, conditional square vs. wide-rectangle rendering.
- `ScannerSlideContent.tsx` updated: `scanFormat` prop passed to `ScannerGuideOverlay`.
- `ScannerSlideRouteEntry.tsx` updated: reads `scanFormat` from surface props, threads to hook and content.
- `surface-ids.ts` updated: `ScannerSlideSurfaceProps.scanFormat` optional field.
- `index.ts` updated: exports `ScanFormat` type and new barcode guide constants.
- Three task-creation form components in managers app: `handleOpenScanner` passes `scanFormat` based on active tab.

**Out of scope:**
- Workers app.
- Adding `scanFormat` to `useCameraPrewarm` — the camera stream is format-agnostic.
- Automatic format detection.
- UI for the user to select format.

**Assumptions:**
- `"qr"` is the default when `scanFormat` is omitted — existing callers that do not pass the option continue working without changes.
- All three `*FormContent` form components have identical `handleOpenScanner` logic; the same change applies to each.
- The ZXing `@zxing/library` `BarcodeFormat` enum includes standard 1D formats (`CODE_128`, `EAN_13`, `EAN_8`, `CODE_39`, `UPC_A`, `UPC_E`, `ITF`, `CODABAR`).

---

## Clarifications required

None — all unknowns resolved during research.

---

## Acceptance criteria

1. `"qr"` format: scan region and guide overlay are square (current geometry unchanged). ZXing decodes only `QR_CODE`.
2. `"barcode"` format: scan region and guide overlay are a wide rectangle (≈82 vw wide, ≈32% of that wide in height). ZXing decodes `CODE_128`, `EAN_13`, `EAN_8`, `CODE_39`, `UPC_A`, `UPC_E`, `ITF`, `CODABAR`.
3. `"any"` format: square guide (QR region); ZXing decodes QR + all 1D formats above.
4. Tapping the article-number scan button opens the scanner in `"barcode"` mode.
5. Tapping the SKU scan button opens the scanner in `"qr"` mode.
6. All existing callers that pass no `scanFormat` continue to work (defaults to `"qr"`).
7. Managers app `npm run typecheck` and `npm run build` pass with zero errors.

---

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: package boundary rules, no build step, peerDeps only, `@source` already registered.

### File read intent — pattern vs. relational

Permitted reads (relational — existing behavior):
- `packages/scanner/src/domain/zxing-loader.ts` — exact singleton pattern to replace with per-format cache.
- `packages/scanner/src/domain/scanner-guide.ts` — exact constants and function to extend.
- `packages/scanner/src/domain/camera-session.manager.ts` — exact import list and `buildDecodeCanvas` function to update.
- `packages/scanner/src/flows/use-qr-scanner.ts` — exact `attachDecodeSession` call site and effect deps array.
- `packages/scanner/src/ui/ScannerGuideOverlay.tsx` — exact style values to use as reference for the barcode variant.
- `packages/scanner/src/surface-ids.ts` — existing type to extend.
- Form components — existing `handleOpenScanner` shape to update.

---

## Implementation plan

### Step 1 — Add `ScanFormat` to `packages/scanner/src/types.ts`

Append to the existing file:

```ts
export type ScanFormat = "qr" | "barcode" | "any";
```

No other changes to this file.

---

### Step 2 — Refactor `packages/scanner/src/domain/zxing-loader.ts`

The current module has a single `factoryPromise` singleton that is always configured for QR only. Replace it with a per-format cache so each format gets its own cached reader factory.

The public function is renamed from `loadQrReaderFactory` to `loadReaderFactory` and accepts a `ScanFormat` argument.

Full replacement:

```ts
import type { ScanFormat } from "../types";

export interface QrReader {
  decodeFromCanvas(canvas: HTMLCanvasElement): { getText(): string };
}

type QrReaderFactory = () => QrReader;

const factoryCache = new Map<ScanFormat, Promise<QrReaderFactory>>();

function buildFactoryPromise(format: ScanFormat): Promise<QrReaderFactory> {
  return Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]).then(([browser, library]) => {
    const { BrowserMultiFormatReader } = browser;
    const { BarcodeFormat, DecodeHintType } = library;

    const BARCODE_1D_FORMATS = [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
    ];

    const formats =
      format === "qr"
        ? [BarcodeFormat.QR_CODE]
        : format === "barcode"
          ? BARCODE_1D_FORMATS
          : [BarcodeFormat.QR_CODE, ...BARCODE_1D_FORMATS];

    const hints = new Map<unknown, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, formats],
      [DecodeHintType.TRY_HARDER, true],
    ]);

    const Reader = BrowserMultiFormatReader as unknown as {
      new (hints: unknown): QrReader;
    };

    return () => new Reader(hints);
  });
}

export async function loadReaderFactory(
  format: ScanFormat = "qr",
): Promise<QrReaderFactory> {
  if (!factoryCache.has(format)) {
    factoryCache.set(format, buildFactoryPromise(format));
  }
  return factoryCache.get(format)!;
}
```

---

### Step 3 — Add barcode guide geometry to `packages/scanner/src/domain/scanner-guide.ts`

Append after the existing exports. Do not modify any existing constants or functions.

```ts
// ─── Barcode (1D) guide ──────────────────────────────────────────────────────
// Barcodes are wide-format labels. The guide is a landscape rectangle,
// centred at the same vertical position as the QR guide.

export const BARCODE_GUIDE_WIDTH_RATIO = 0.82;
export const BARCODE_GUIDE_HEIGHT_FACTOR = 0.32;
export const BARCODE_GUIDE_MIN_WIDTH_PX = 260;
export const BARCODE_GUIDE_MAX_WIDTH_PX = 480;

export function getBarcodeGuideRect({
  viewportWidth,
  viewportHeight,
  paddingPx = 0,
}: ScannerGuideRectInput): ScannerGuideRect {
  const guideWidth = clamp(
    viewportWidth * BARCODE_GUIDE_WIDTH_RATIO,
    BARCODE_GUIDE_MIN_WIDTH_PX,
    BARCODE_GUIDE_MAX_WIDTH_PX,
  );
  const guideHeight = Math.round(guideWidth * BARCODE_GUIDE_HEIGHT_FACTOR);

  const w = guideWidth + paddingPx * 2;
  const h = guideHeight + paddingPx * 2;

  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2 + SCANNER_GUIDE_OFFSET_TOP_PX;

  return {
    left: centerX - w / 2,
    top: centerY - h / 2,
    right: centerX + w / 2,
    bottom: centerY + h / 2,
  };
}
```

`clamp` is already defined in this file (it is a file-private function). `ScannerGuideRectInput`, `ScannerGuideRect`, and `SCANNER_GUIDE_OFFSET_TOP_PX` are also already defined in the same file — no new imports needed.

---

### Step 4 — Update `packages/scanner/src/domain/camera-session.manager.ts`

Four targeted changes:

**4a — Update import from `zxing-loader`**

```ts
// before
import { loadQrReaderFactory } from "./zxing-loader";
import {
  getScannerGuideRect,
  SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX,
} from "./scanner-guide";

// after
import { loadReaderFactory } from "./zxing-loader";
import {
  getBarcodeGuideRect,
  getScannerGuideRect,
  SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX,
} from "./scanner-guide";
import type { ScanFormat } from "../types";
```

**4b — Add `scanFormat` to `DecodeSessionOptions`**

```ts
// before
type DecodeSessionOptions = {
  forceDeviceId?: boolean;
};

// after
type DecodeSessionOptions = {
  forceDeviceId?: boolean;
  scanFormat?: ScanFormat;
};
```

**4c — Update `buildDecodeCanvas` to accept `scanFormat`**

Current signature:
```ts
function buildDecodeCanvas(
  video: HTMLVideoElement,
  container: HTMLElement,
): HTMLCanvasElement | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  const roiRect = getScannerGuideRect({
    viewportWidth: container.clientWidth,
    viewportHeight: container.clientHeight,
    paddingPx: SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX,
  });
```

Replace with:
```ts
function buildDecodeCanvas(
  video: HTMLVideoElement,
  container: HTMLElement,
  scanFormat: ScanFormat = "qr",
): HTMLCanvasElement | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  const roiRect =
    scanFormat === "barcode"
      ? getBarcodeGuideRect({
          viewportWidth: container.clientWidth,
          viewportHeight: container.clientHeight,
          paddingPx: SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX,
        })
      : getScannerGuideRect({
          viewportWidth: container.clientWidth,
          viewportHeight: container.clientHeight,
          paddingPx: SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX,
        });
```

The rest of `buildDecodeCanvas` is unchanged.

**4d — Update the two call sites inside `attachDecodeSession`**

The `buildDecodeCanvas` call site (currently inside the decode loop):
```ts
// before
const canvas = buildDecodeCanvas(currentVideo, root);

// after
const canvas = buildDecodeCanvas(currentVideo, root, options.scanFormat ?? "qr");
```

The `loadQrReaderFactory` call site:
```ts
// before
const readerFactory = await loadQrReaderFactory();

// after
const readerFactory = await loadReaderFactory(options.scanFormat ?? "qr");
```

The inline stale comment `// No QR code found in this frame.` in the catch block should be updated to `// No code found in this frame.` to reflect multi-format support.

---

### Step 5 — Update `packages/scanner/src/flows/use-qr-scanner.ts`

Three targeted changes:

**5a — Add `scanFormat` to `UseQrScannerOptions`**

```ts
export interface UseQrScannerOptions {
  sessionId: string;
  onDecode: (value: string) => void;
  selectedLensId?: string | null;
  lensSelectionRevision?: number;
  dedupeWindowMs?: number;
  scanFormat?: ScanFormat;        // ← add
}
```

Also add the import at the top:
```ts
import type { ScanFormat, ScannerFrozenFrame, ScannerLens } from "../types";
```

(Replace the existing `import type { ScannerFrozenFrame, ScannerLens } from "../types";`.)

**5b — Destructure `scanFormat` in the hook body**

```ts
export function useQrScanner({
  sessionId,
  onDecode,
  selectedLensId = null,
  lensSelectionRevision = 0,
  dedupeWindowMs = 1200,
  scanFormat = "qr",              // ← add with default
}: UseQrScannerOptions): UseQrScannerResult {
```

**5c — Pass `scanFormat` to `attachDecodeSession` and add it to the effect deps**

```ts
// In the attachDecodeSession call, update the options argument:
      { forceDeviceId: lensSelectionRevision > 0, scanFormat },   // ← add scanFormat

// In the effect deps array, add scanFormat:
  }, [
    sessionId,
    selectedLensId,
    lensSelectionRevision,
    dedupeWindowMs,
    scanFormat,                    // ← add
    initLenses,
    restartKey,
  ]);
```

---

### Step 6 — Update `packages/scanner/src/ui/ScannerGuideOverlay.tsx`

Add `scanFormat` prop and render the appropriate guide geometry.

The component currently renders a square frame. For `"barcode"`, it renders a wide rectangle with smaller corner brackets and a lower corner radius. The `isFrozen` prop and animation logic remain unchanged (they are never used in practice but must stay for the public API).

Full replacement of the component:

```tsx
import { m } from "framer-motion";

import {
  BARCODE_GUIDE_HEIGHT_FACTOR,
  BARCODE_GUIDE_MAX_WIDTH_PX,
  BARCODE_GUIDE_MIN_WIDTH_PX,
  BARCODE_GUIDE_OFFSET_TOP_PX,
  BARCODE_GUIDE_WIDTH_RATIO,
  SCANNER_GUIDE_MAX_SIZE_PX,
  SCANNER_GUIDE_MIN_SIZE_PX,
  SCANNER_GUIDE_OFFSET_TOP_PX,
  SCANNER_GUIDE_VIEWPORT_SIZE_RATIO,
} from "../domain/scanner-guide";
import type { ScanFormat } from "../types";

interface ScannerGuideOverlayProps {
  isFrozen: boolean;
  scanFormat?: ScanFormat;
}

export function ScannerGuideOverlay({
  isFrozen,
  scanFormat = "qr",
}: ScannerGuideOverlayProps): React.JSX.Element {
  const frameClass = isFrozen ? "border-emerald-300/60" : "border-sky-100/35";
  const cornerClass = isFrozen ? "border-emerald-300" : "border-sky-200";

  if (scanFormat === "barcode") {
    return <BarcodeGuideFrame isFrozen={isFrozen} frameClass={frameClass} cornerClass={cornerClass} />;
  }

  return <QrGuideFrame isFrozen={isFrozen} frameClass={frameClass} cornerClass={cornerClass} />;
}

// ─── QR guide (square) ────────────────────────────────────────────────────────

interface GuideFrameProps {
  isFrozen: boolean;
  frameClass: string;
  cornerClass: string;
}

function QrGuideFrame({ isFrozen, frameClass, cornerClass }: GuideFrameProps): React.JSX.Element {
  const pulseTransition = {
    duration: 0.42,
    times: [0, 0.42, 1],
    ease: "easeOut" as const,
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-6"
      style={{ transform: `translateY(${SCANNER_GUIDE_OFFSET_TOP_PX}px)` }}
    >
      <m.div
        className="relative"
        style={{
          width: `min(${SCANNER_GUIDE_VIEWPORT_SIZE_RATIO * 100}svh, ${SCANNER_GUIDE_VIEWPORT_SIZE_RATIO * 100}vw)`,
          height: `min(${SCANNER_GUIDE_VIEWPORT_SIZE_RATIO * 100}svh, ${SCANNER_GUIDE_VIEWPORT_SIZE_RATIO * 100}vw)`,
          minWidth: `${SCANNER_GUIDE_MIN_SIZE_PX}px`,
          minHeight: `${SCANNER_GUIDE_MIN_SIZE_PX}px`,
          maxWidth: `${SCANNER_GUIDE_MAX_SIZE_PX}px`,
          maxHeight: `${SCANNER_GUIDE_MAX_SIZE_PX}px`,
        }}
        animate={{ scale: isFrozen ? [1, 1.065, 1] : 1 }}
        transition={pulseTransition}
      >
        <m.div
          className="absolute inset-0 rounded-[24px]"
          animate={{
            boxShadow: isFrozen
              ? "0 0 0 9999px rgba(2, 8, 23, 0.56)"
              : "0 0 0 9999px rgba(2, 8, 23, 0)",
          }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        />
        <div className={`relative h-full w-full rounded-[24px] border ${frameClass}`}>
          <span className={`absolute -left-0.5 -top-0.5 h-12 w-12 rounded-tl-[22px] border-l-4 border-t-4 ${cornerClass}`} />
          <span className={`absolute -right-0.5 -top-0.5 h-12 w-12 rounded-tr-[22px] border-r-4 border-t-4 ${cornerClass}`} />
          <span className={`absolute -bottom-0.5 -left-0.5 h-12 w-12 rounded-bl-[22px] border-b-4 border-l-4 ${cornerClass}`} />
          <span className={`absolute -bottom-0.5 -right-0.5 h-12 w-12 rounded-br-[22px] border-b-4 border-r-4 ${cornerClass}`} />
        </div>
      </m.div>
    </div>
  );
}

// ─── Barcode guide (wide rectangle) ─────────────────────────────────────────
// Corner brackets emphasise the horizontal extent with wider, shorter ticks.
// Smaller corner radius reflects the rectangular label format.

const barcodeMinHeightPx = Math.round(BARCODE_GUIDE_MIN_WIDTH_PX * BARCODE_GUIDE_HEIGHT_FACTOR);
const barcodeMaxHeightPx = Math.round(BARCODE_GUIDE_MAX_WIDTH_PX * BARCODE_GUIDE_HEIGHT_FACTOR);

function BarcodeGuideFrame({ isFrozen, frameClass, cornerClass }: GuideFrameProps): React.JSX.Element {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      style={{ transform: `translateY(${BARCODE_GUIDE_OFFSET_TOP_PX}px)` }}
    >
      <m.div
        className="absolute inset-0 rounded-[8px]"
        style={{
          margin: "auto",
          width: `min(${BARCODE_GUIDE_WIDTH_RATIO * 100}vw, ${BARCODE_GUIDE_MAX_WIDTH_PX}px)`,
          height: `min(${BARCODE_GUIDE_WIDTH_RATIO * BARCODE_GUIDE_HEIGHT_FACTOR * 100}vw, ${barcodeMaxHeightPx}px)`,
          minWidth: `${BARCODE_GUIDE_MIN_WIDTH_PX}px`,
          minHeight: `${barcodeMinHeightPx}px`,
          position: "absolute",
          inset: 0,
        }}
        animate={{
          boxShadow: isFrozen
            ? "0 0 0 9999px rgba(2, 8, 23, 0.56)"
            : "0 0 0 9999px rgba(2, 8, 23, 0)",
        }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      />
      <div
        className="relative"
        style={{
          width: `min(${BARCODE_GUIDE_WIDTH_RATIO * 100}vw, ${BARCODE_GUIDE_MAX_WIDTH_PX}px)`,
          height: `min(${BARCODE_GUIDE_WIDTH_RATIO * BARCODE_GUIDE_HEIGHT_FACTOR * 100}vw, ${barcodeMaxHeightPx}px)`,
          minWidth: `${BARCODE_GUIDE_MIN_WIDTH_PX}px`,
          minHeight: `${barcodeMinHeightPx}px`,
        }}
      >
        <div className={`relative h-full w-full rounded-[8px] border ${frameClass}`}>
          {/* top-left: long horizontal, short vertical */}
          <span className={`absolute -left-0.5 -top-0.5 h-5 w-14 rounded-tl-[6px] border-l-4 border-t-4 ${cornerClass}`} />
          {/* top-right */}
          <span className={`absolute -right-0.5 -top-0.5 h-5 w-14 rounded-tr-[6px] border-r-4 border-t-4 ${cornerClass}`} />
          {/* bottom-left */}
          <span className={`absolute -bottom-0.5 -left-0.5 h-5 w-14 rounded-bl-[6px] border-b-4 border-l-4 ${cornerClass}`} />
          {/* bottom-right */}
          <span className={`absolute -bottom-0.5 -right-0.5 h-5 w-14 rounded-br-[6px] border-b-4 border-r-4 ${cornerClass}`} />
        </div>
      </div>
    </div>
  );
}
```

Notes:
- `BARCODE_GUIDE_OFFSET_TOP_PX` is the same value as `SCANNER_GUIDE_OFFSET_TOP_PX` (`-100`). Import only `SCANNER_GUIDE_OFFSET_TOP_PX` and reuse it for the barcode overlay too, since both guides share the same vertical offset. Rename the import alias in the barcode frame component call site if needed, or just use one constant.
- The `m.div` for the shadow overlay in `BarcodeGuideFrame` needs to be positioned correctly. Use `position: "absolute", inset: 0` and `margin: "auto"` to centre it within the full-bleed container, or better — restructure so the shadow `m.div` wraps the frame div the same way as `QrGuideFrame`. Codex should ensure the shadow overlay completely covers the viewport (the `9999px` spread on `boxShadow` handles this regardless of exact positioning).
- The `BARCODE_GUIDE_OFFSET_TOP_PX` constant referenced in the note above: since the barcode guide shares `SCANNER_GUIDE_OFFSET_TOP_PX = -100`, no new constant is needed. Use the same import alias and apply it identically.

**Simplified positioning note for Codex:** The cleanest structure for `BarcodeGuideFrame` mirrors `QrGuideFrame` exactly — an outer `div` with `style={{ transform: translateY(...) }}` that grid-centres the inner animated `m.div`, which then wraps the visible frame `div`. The only difference is the `style` dimensions (wide rectangle instead of square) and the corner bracket sizes. Use the same structural pattern.

---

### Step 7 — Update `packages/scanner/src/ui/ScannerSlideContent.tsx`

Add `scanFormat` prop and pass it to `ScannerGuideOverlay`.

```tsx
// Add import
import type { ScanFormat } from "../types";

// Extend props interface
interface ScannerSlideContentProps {
  sessionId: string;
  isCameraReady: boolean;
  cameraError: string | null;
  onRetry?: () => void;
  scanFormat?: ScanFormat;       // ← add
}

// Destructure in function signature
export function ScannerSlideContent({
  sessionId,
  isCameraReady,
  cameraError,
  onRetry,
  scanFormat = "qr",             // ← add with default
}: ScannerSlideContentProps): React.JSX.Element {

// Pass to ScannerGuideOverlay
  <ScannerGuideOverlay isFrozen={false} scanFormat={scanFormat} />
```

No other changes to this file.

---

### Step 8 — Update `packages/scanner/src/pages/ScannerSlideRouteEntry.tsx`

Read `scanFormat` from surface props and thread it to both the hook and the content component.

```tsx
// Add import
import type { ScanFormat } from "../types";

// In the component body, destructure scanFormat from surface props:
  const { sessionId = SCANNER_SESSION_ID, onScan, scanFormat = "qr" } =
    useSurfaceProps<ScannerSlideSurfaceProps>();

// Pass to useQrScanner:
  const { isCameraReady, cameraError, restart } = useQrScanner({
    sessionId,
    onDecode: (value) => {
      onScan?.(value);
    },
    scanFormat,
  });

// Pass to ScannerSlideContent:
  return (
    <ScannerSlideContent
      sessionId={sessionId}
      isCameraReady={isCameraReady}
      cameraError={cameraError}
      onRetry={restart}
      scanFormat={scanFormat}
    />
  );
```

---

### Step 9 — Update `packages/scanner/src/surface-ids.ts`

Add `scanFormat` as an optional field to `ScannerSlideSurfaceProps`:

```ts
import type { ScanFormat } from "./types";

export const SCANNER_SLIDE_SURFACE_ID = "scanner-slide";

export const SCANNER_SESSION_ID = "item-barcode-scanner";

export type ScannerSlideSurfaceProps = {
  sessionId: string;
  onScan: (value: string) => void;
  scanFormat?: ScanFormat;
};
```

---

### Step 10 — Update `packages/scanner/src/index.ts`

Export `ScanFormat` and the new barcode guide symbols:

Add `ScanFormat` to the types export line:
```ts
export type { ScanFormat, ScannerLens, ScannerFrozenFrame } from "./types";
```

Add barcode guide exports (after the existing scanner-guide exports):
```ts
export {
  getBarcodeGuideRect,
  BARCODE_GUIDE_WIDTH_RATIO,
  BARCODE_GUIDE_HEIGHT_FACTOR,
  BARCODE_GUIDE_MIN_WIDTH_PX,
  BARCODE_GUIDE_MAX_WIDTH_PX,
} from "./domain/scanner-guide";
```

---

### Step 11 — Update `handleOpenScanner` in the three task-creation form components

The same change applies to:
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/InternalFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/PreOrderFormContent.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/ReturnFormContent.tsx`

**Add `ScanFormat` to the import from `@beyo/scanner`:**

```ts
// before
import {
  SCANNER_SESSION_ID,
  SCANNER_SLIDE_SURFACE_ID,
  useCameraPrewarm,
  type ScannerSlideSurfaceProps,
} from "@beyo/scanner";

// after
import {
  SCANNER_SESSION_ID,
  SCANNER_SLIDE_SURFACE_ID,
  useCameraPrewarm,
  type ScanFormat,
  type ScannerSlideSurfaceProps,
} from "@beyo/scanner";
```

**Update `handleOpenScanner` to derive and pass `scanFormat`:**

```ts
function handleOpenScanner(tab: "article_number" | "sku"): void {
  const scanFormat: ScanFormat =
    tab === "article_number" ? "barcode" : "qr";

  surface.open(SCANNER_SLIDE_SURFACE_ID, {
    sessionId: SCANNER_SESSION_ID,
    scanFormat,
    onScan: (value: string) => {
      form.setValue(
        tab === "article_number" ? "item.article_number" : "item.sku",
        value,
        { shouldDirty: true },
      );
      surface.close(SCANNER_SLIDE_SURFACE_ID);
    },
  } satisfies ScannerSlideSurfaceProps);
}
```

This is a drop-in replacement for the existing `handleOpenScanner` in each form. No other changes to form files.

---

## Risks and mitigations

- **Risk:** `BarcodeFormat` enum values in `@zxing/library` may not include all listed formats if the installed version is older.
  **Mitigation:** `CODE_128`, `EAN_13`, `EAN_8`, `CODE_39`, `UPC_A`, `UPC_E` are present in all ZXing versions since 0.1.x. `ITF` and `CODABAR` are in 0.2+. If a format constant is missing, TypeScript will error at the point of use in `zxing-loader.ts` — straightforward to diagnose. The fallback is to remove the missing constant from the array.

- **Risk:** The barcode guide overlay's `m.div` shadow overlay requires correct absolute positioning to cover the full viewport. Mispositioned `position: "absolute"` and missing `inset: 0` could make the shadow overlay not cover the camera area.
  **Mitigation:** Follow the exact structural pattern of `QrGuideFrame` — outer `translateY` container → inner `m.div` with fixed dimensions → inner frame `div`. The `boxShadow` spread `9999px` covers the entire viewport regardless of the element's own size as long as it is rendered in the DOM.

- **Risk:** `"any"` format (QR + all 1D) uses the square QR guide region as the scan ROI. Wide barcodes positioned at the edge of the square region may partially fall outside the sampled area.
  **Mitigation:** This is an intentional trade-off for `"any"` mode. Users who need reliable barcode scanning should use `"barcode"` explicitly. The `"any"` mode is for cases where the format is genuinely unknown.

---

## Validation plan

- `npm run typecheck`: zero errors.
- `npm run build`: clean build.
- Manual: open Internal Task Creation → article-number tab → tap scan → scanner slide opens with wide rectangular guide → hold a CODE_128 barcode → value appears in article-number field, slide closes.
- Manual: open Internal Task Creation → SKU tab → tap scan → scanner slide opens with square QR guide → scan a QR code → value appears in SKU field, slide closes.
- Manual: repeat for Pre-Order and Return task creation slides.

---

## Review log

- `2026-06-03`: Implemented multi-format scan support in `@beyo/scanner`, updated managers-app task-creation openers, and validated with managers-app `npm run typecheck` and `npm run build`.

---

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: codex
