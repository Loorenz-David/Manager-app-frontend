export type { ScanFormat, ScannerLens, ScannerFrozenFrame } from "./types";

export { getCameraRegionId } from "./domain/camera-session.manager";
export type { CameraSessionId } from "./domain/camera-session.manager";
export {
  prewarmCameraSession,
  attachDecodeSession,
  forceReleaseCameraSession,
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
  getBarcodeGuideRect,
  BARCODE_GUIDE_WIDTH_RATIO,
  BARCODE_GUIDE_HEIGHT_FACTOR,
  BARCODE_GUIDE_MIN_WIDTH_PX,
  BARCODE_GUIDE_MAX_WIDTH_PX,
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

export { ScannerCloseControl } from "./ui/ScannerCloseControl";
export { FrozenFrameCanvas } from "./ui/FrozenFrameCanvas";
export { ScannerGuideOverlay } from "./ui/ScannerGuideOverlay";
export { ScannerLensPicker } from "./ui/ScannerLensPicker";
export { ScannerSlideContent } from "./ui/ScannerSlideContent";
export { ScannerSlideRouteEntry } from "./pages/ScannerSlideRouteEntry";
export {
  SCANNER_SLIDE_SURFACE_ID,
  SCANNER_SESSION_ID,
  type ScannerSlideSurfaceProps,
} from "./surface-ids";
