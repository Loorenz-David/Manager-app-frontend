import { useEffect, useState } from "react";
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
    setLensRevision((revision) => revision + 1);
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
