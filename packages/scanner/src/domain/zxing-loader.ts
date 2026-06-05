import type { ScanFormat } from "../types";

export interface QrReader {
  decodeFromCanvas(canvas: HTMLCanvasElement): { getText(): string };
}

type QrReaderFactory = () => QrReader;

const factoryCache = new Map<ScanFormat, Promise<QrReaderFactory>>();

function buildFactoryPromise(format: ScanFormat): Promise<QrReaderFactory> {
  return Promise.all([import("@zxing/browser"), import("@zxing/library")]).then(
    ([browser, library]) => {
      const { BrowserMultiFormatReader } = browser;
      const { BarcodeFormat, DecodeHintType } = library;

      const barcode1dFormats = [
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
            ? barcode1dFormats
            : [BarcodeFormat.QR_CODE, ...barcode1dFormats];

      const hints = new Map<unknown, unknown>([
        [DecodeHintType.POSSIBLE_FORMATS, formats],
        [DecodeHintType.TRY_HARDER, true],
      ]);

      const Reader = BrowserMultiFormatReader as unknown as {
        new (hints: unknown): QrReader;
      };

      return () => new Reader(hints);
    },
  );
}

export async function loadReaderFactory(
  format: ScanFormat = "qr",
): Promise<QrReaderFactory> {
  if (!factoryCache.has(format)) {
    factoryCache.set(format, buildFactoryPromise(format));
  }

  return factoryCache.get(format)!;
}
