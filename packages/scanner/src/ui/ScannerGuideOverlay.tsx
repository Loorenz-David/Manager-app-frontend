import { m } from "framer-motion";

import {
  BARCODE_GUIDE_HEIGHT_FACTOR,
  BARCODE_GUIDE_MAX_WIDTH_PX,
  BARCODE_GUIDE_MIN_WIDTH_PX,
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

interface GuideFrameProps {
  isFrozen: boolean;
  frameClass: string;
  cornerClass: string;
}

function getOverlayBoxShadow(isFrozen: boolean): string {
  return isFrozen
    ? "0 0 0 9999px rgba(2, 8, 23, 0.62)"
    : "0 0 0 9999px rgba(2, 8, 23, 0.42)";
}

const barcodeMinHeightPx = Math.round(
  BARCODE_GUIDE_MIN_WIDTH_PX * BARCODE_GUIDE_HEIGHT_FACTOR,
);
const barcodeMaxHeightPx = Math.round(
  BARCODE_GUIDE_MAX_WIDTH_PX * BARCODE_GUIDE_HEIGHT_FACTOR,
);

export function ScannerGuideOverlay({
  isFrozen,
  scanFormat = "qr",
}: ScannerGuideOverlayProps): React.JSX.Element {
  const frameClass = isFrozen ? "border-emerald-300/60" : "border-sky-100/35";
  const cornerClass = isFrozen ? "border-emerald-300" : "border-sky-200";

  if (scanFormat === "barcode") {
    return (
      <BarcodeGuideFrame
        isFrozen={isFrozen}
        frameClass={frameClass}
        cornerClass={cornerClass}
      />
    );
  }

  return (
    <QrGuideFrame
      isFrozen={isFrozen}
      frameClass={frameClass}
      cornerClass={cornerClass}
    />
  );
}

function QrGuideFrame({
  isFrozen,
  frameClass,
  cornerClass,
}: GuideFrameProps): React.JSX.Element {
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
            boxShadow: getOverlayBoxShadow(isFrozen),
          }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        />

        <div
          className={`relative h-full w-full rounded-[24px] border ${frameClass}`}
        >
          <span
            className={`absolute -left-0.5 -top-0.5 h-12 w-12 rounded-tl-[22px] border-l-4 border-t-4 ${cornerClass}`}
          />
          <span
            className={`absolute -right-0.5 -top-0.5 h-12 w-12 rounded-tr-[22px] border-r-4 border-t-4 ${cornerClass}`}
          />
          <span
            className={`absolute -bottom-0.5 -left-0.5 h-12 w-12 rounded-bl-[22px] border-b-4 border-l-4 ${cornerClass}`}
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-12 w-12 rounded-br-[22px] border-b-4 border-r-4 ${cornerClass}`}
          />
        </div>
      </m.div>
    </div>
  );
}

function BarcodeGuideFrame({
  isFrozen,
  frameClass,
  cornerClass,
}: GuideFrameProps): React.JSX.Element {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-6"
      style={{ transform: `translateY(${SCANNER_GUIDE_OFFSET_TOP_PX}px)` }}
    >
      <m.div
        className="relative"
        style={{
          width: `min(${BARCODE_GUIDE_WIDTH_RATIO * 100}vw, ${BARCODE_GUIDE_MAX_WIDTH_PX}px)`,
          height: `min(${BARCODE_GUIDE_WIDTH_RATIO * BARCODE_GUIDE_HEIGHT_FACTOR * 100}vw, ${barcodeMaxHeightPx}px)`,
          minWidth: `${BARCODE_GUIDE_MIN_WIDTH_PX}px`,
          minHeight: `${barcodeMinHeightPx}px`,
          maxWidth: `${BARCODE_GUIDE_MAX_WIDTH_PX}px`,
          maxHeight: `${barcodeMaxHeightPx}px`,
        }}
      >
        <m.div
          className="absolute inset-0 rounded-[8px]"
          animate={{
            boxShadow: getOverlayBoxShadow(isFrozen),
          }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        />

        <div className={`relative h-full w-full rounded-[8px] border ${frameClass}`}>
          <span
            className={`absolute -left-0.5 -top-0.5 h-5 w-14 rounded-tl-[6px] border-l-4 border-t-4 ${cornerClass}`}
          />
          <span
            className={`absolute -right-0.5 -top-0.5 h-5 w-14 rounded-tr-[6px] border-r-4 border-t-4 ${cornerClass}`}
          />
          <span
            className={`absolute -bottom-0.5 -left-0.5 h-5 w-14 rounded-bl-[6px] border-b-4 border-l-4 ${cornerClass}`}
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-5 w-14 rounded-br-[6px] border-b-4 border-r-4 ${cornerClass}`}
          />
        </div>
      </m.div>
    </div>
  );
}
