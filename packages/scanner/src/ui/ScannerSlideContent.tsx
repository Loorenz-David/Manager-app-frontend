import type { ReactNode } from "react";

import { getCameraRegionId } from "../domain/camera-session.manager";
import type { ScanFormat } from "../types";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";

interface ScannerSlideContentProps {
  sessionId: string;
  isCameraReady: boolean;
  cameraError: string | null;
  onRetry?: () => void;
  scanFormat?: ScanFormat;
  children?: ReactNode;
}

export function ScannerSlideContent({
  sessionId,
  isCameraReady,
  cameraError,
  onRetry,
  scanFormat = "qr",
  children,
}: ScannerSlideContentProps): React.JSX.Element {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020617]">
      <div id={getCameraRegionId(sessionId)} className="absolute inset-0" />

      <ScannerGuideOverlay isFrozen={false} scanFormat={scanFormat} />

      {!isCameraReady && !cameraError ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <p className="text-sm text-white/60">Starting camera...</p>
        </div>
      ) : null}

      {cameraError ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-red-400">{cameraError}</p>
          {onRetry ? (
            <button
              type="button"
              className="rounded-md bg-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/20"
              onClick={onRetry}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {children}
    </div>
  );
}
