import type { ScanFormat } from "./types";

export const SCANNER_SLIDE_SURFACE_ID = "scanner-slide";

export const SCANNER_SESSION_ID = "item-barcode-scanner";

export type ScannerSlideSurfaceProps = {
  sessionId: string;
  onScan: (value: string) => void;
  scanFormat?: ScanFormat;
};
