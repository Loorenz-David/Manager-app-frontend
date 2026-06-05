import type { ScanFormat } from "../types";
import { loadReaderFactory } from "./zxing-loader";
import {
  getBarcodeGuideRect,
  getScannerGuideRect,
  SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX,
} from "./scanner-guide";

export const CAMERA_IDLE_RELEASE_MS = 90_000;

const SCAN_LOOP_DELAY_MS = 90;
const SCAN_SUCCESS_BACKOFF_MS = 650;
const MAX_DECODE_CANVAS_EDGE_PX = 960;
const VIDEO_READY_TIMEOUT_MS = 2200;
const VIDEO_REATTACH_READY_TIMEOUT_MS = 1400;
const VIDEO_REOPEN_READY_TIMEOUT_MS = 2600;
const PREWARM_PREVIEW_READY_TIMEOUT_MS = 1400;

export type CameraSessionId = string;

export function getCameraRegionId(sessionId: string): string {
  return `${sessionId}-qr-reader`;
}

type SessionPhase = "idle" | "prewarming" | "hot" | "decoding";

interface CameraSession {
  id: CameraSessionId;
  phase: SessionPhase;
  stream: MediaStream | null;
  hasRenderableVideo: boolean;
  videoElement: HTMLVideoElement | null;
  prewarmDeviceId: string | undefined;
  prewarmPreviewEnabled: boolean;
  decodeControls: { stop: () => void } | null;
  prewarmCount: number;
  idleTimerId: number | null;
  startDelayTimerId: number | null;
}

interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

function makeSession(id: CameraSessionId): CameraSession {
  return {
    id,
    phase: "idle",
    stream: null,
    hasRenderableVideo: false,
    videoElement: null,
    prewarmDeviceId: undefined,
    prewarmPreviewEnabled: false,
    decodeControls: null,
    prewarmCount: 0,
    idleTimerId: null,
    startDelayTimerId: null,
  };
}

const sessions = new Map<string, CameraSession>();

function getSession(id: CameraSessionId): CameraSession {
  let session = sessions.get(id);
  if (!session) {
    session = makeSession(id);
    sessions.set(id, session);
  }
  return session;
}

function getContainerElement(id: CameraSessionId): HTMLElement | null {
  return document.getElementById(getCameraRegionId(id));
}

function getPrewarmHostId(id: CameraSessionId): string {
  return `${getCameraRegionId(id)}-prewarm-host`;
}

function getOrCreatePrewarmHostElement(id: CameraSessionId): HTMLElement {
  const hostId = getPrewarmHostId(id);
  let host = document.getElementById(hostId);
  if (!host) {
    host = document.createElement("div");
    host.id = hostId;
    document.body.appendChild(host);
  }

  host.style.setProperty("position", "fixed", "important");
  host.style.setProperty("left", "0", "important");
  host.style.setProperty("top", "0", "important");
  host.style.setProperty("width", "2px", "important");
  host.style.setProperty("height", "2px", "important");
  host.style.setProperty("overflow", "hidden", "important");
  host.style.setProperty("opacity", "0.01", "important");
  host.style.setProperty("pointer-events", "none", "important");
  host.style.setProperty("z-index", "-1", "important");
  host.style.setProperty("transform", "translateZ(0)", "important");

  return host;
}

function removePrewarmHostElement(id: CameraSessionId): void {
  document.getElementById(getPrewarmHostId(id))?.remove();
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForContainerToSettle(
  container: HTMLElement,
  isCancelled: () => boolean,
): Promise<void> {
  const startedAt = performance.now();
  let stableFrameCount = 0;

  while (!isCancelled()) {
    const rect = container.getBoundingClientRect();
    const hasSize = rect.width > 0 && rect.height > 0;
    const isInViewport =
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight;
    const isHorizontallySettled = Math.abs(rect.left) <= 1;

    if (hasSize && isInViewport && isHorizontallySettled) {
      stableFrameCount += 1;
      if (stableFrameCount >= 2) {
        return;
      }
    } else {
      stableFrameCount = 0;
    }

    if (performance.now() - startedAt > 700) {
      return;
    }

    await waitForNextFrame();
  }
}

function ensureSessionVideoElement(
  session: CameraSession,
  container: HTMLElement,
): HTMLVideoElement {
  let video =
    session.videoElement instanceof HTMLVideoElement
      ? session.videoElement
      : container.querySelector("video");

  if (!(video instanceof HTMLVideoElement)) {
    video = document.createElement("video");
  }

  if (video.parentElement !== container) {
    container.appendChild(video);
  }

  session.videoElement = video;
  applyMobileVideoAttributes(video);
  applyCameraVideoStyles(video);

  return video;
}

function ensurePrewarmVideoElement(session: CameraSession): HTMLVideoElement {
  return ensureSessionVideoElement(
    session,
    getOrCreatePrewarmHostElement(session.id),
  );
}

function applyMobileVideoAttributes(video: HTMLVideoElement): void {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.playsInline = true;
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
}

function applyCameraVideoStyles(video: HTMLVideoElement): void {
  video.style.setProperty("width", "100%", "important");
  video.style.setProperty("height", "100%", "important");
  video.style.setProperty("object-fit", "cover", "important");
  video.style.setProperty("position", "absolute", "important");
  video.style.setProperty("inset", "0", "important");
  video.style.setProperty("z-index", "0", "important");
  video.style.setProperty("background", "#020617", "important");
  video.style.setProperty("transform", "translateZ(0)", "important");
  video.style.setProperty("will-change", "transform", "important");
}

function buildVideoConstraints(
  resolvedDeviceId: string | undefined,
): MediaStreamConstraints {
  const video: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  };

  if (resolvedDeviceId) {
    video.deviceId = { exact: resolvedDeviceId };
  } else {
    video.facingMode = "environment";
  }

  return { video, audio: false };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function optimizeVideoTrackForQr(stream: MediaStream): Promise<void> {
  const [videoTrack] = stream.getVideoTracks();
  if (!videoTrack || typeof videoTrack.applyConstraints !== "function") {
    return;
  }

  const capabilities =
    typeof videoTrack.getCapabilities === "function"
      ? (videoTrack.getCapabilities() as {
          focusMode?: string[];
        })
      : null;

  if (!capabilities?.focusMode?.includes("continuous")) {
    return;
  }

  try {
    await videoTrack.applyConstraints({
      advanced: [
        {
          focusMode: "continuous",
        } as unknown as MediaTrackConstraintSet,
      ],
    });
  } catch {
    // Continuous focus is a best-effort mobile camera hint.
  }
}

function mapCssRectToVideoSourceRect(
  video: HTMLVideoElement,
  container: HTMLElement,
  cssRect: { left: number; top: number; right: number; bottom: number },
): SourceRect | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  if (!vw || !vh || !cw || !ch) return null;

  const videoAspect = vw / vh;
  const containerAspect = cw / ch;

  let renderedWidth: number;
  let renderedHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > containerAspect) {
    renderedHeight = ch;
    renderedWidth = ch * videoAspect;
    offsetX = (renderedWidth - cw) / 2;
  } else {
    renderedWidth = cw;
    renderedHeight = cw / videoAspect;
    offsetY = (renderedHeight - ch) / 2;
  }

  const left = clamp(cssRect.left, 0, cw);
  const top = clamp(cssRect.top, 0, ch);
  const right = clamp(cssRect.right, 0, cw);
  const bottom = clamp(cssRect.bottom, 0, ch);
  const roiWidth = Math.max(0, right - left);
  const roiHeight = Math.max(0, bottom - top);
  if (!roiWidth || !roiHeight) return null;

  const sx = ((left + offsetX) / renderedWidth) * vw;
  const sy = ((top + offsetY) / renderedHeight) * vh;
  const sw = (roiWidth / renderedWidth) * vw;
  const sh = (roiHeight / renderedHeight) * vh;

  return {
    sx: clamp(sx, 0, vw),
    sy: clamp(sy, 0, vh),
    sw: clamp(sw, 1, vw),
    sh: clamp(sh, 1, vh),
  };
}

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
  const sourceRect = mapCssRectToVideoSourceRect(video, container, roiRect);
  if (!sourceRect) return null;

  const sourceEdge = Math.max(sourceRect.sw, sourceRect.sh);
  const scale = Math.min(1, MAX_DECODE_CANVAS_EDGE_PX / sourceEdge);
  const targetWidth = Math.max(1, Math.round(sourceRect.sw * scale));
  const targetHeight = Math.max(1, Math.round(sourceRect.sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(
    video,
    sourceRect.sx,
    sourceRect.sy,
    sourceRect.sw,
    sourceRect.sh,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return canvas;
}

function stopDecodeControls(session: CameraSession): void {
  session.decodeControls?.stop();
  session.decodeControls = null;
}

function clearIdleTimer(session: CameraSession): void {
  if (session.idleTimerId !== null) {
    window.clearTimeout(session.idleTimerId);
    session.idleTimerId = null;
  }
}

function clearStartDelayTimer(session: CameraSession): void {
  if (session.startDelayTimerId !== null) {
    window.clearTimeout(session.startDelayTimerId);
    session.startDelayTimerId = null;
  }
}

function detachVideoElement(session: CameraSession): void {
  session.videoElement?.remove();
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function teardownSession(session: CameraSession): void {
  clearIdleTimer(session);
  clearStartDelayTimer(session);
  stopDecodeControls(session);
  detachVideoElement(session);
  removePrewarmHostElement(session.id);
  stopStream(session.stream);
  session.stream = null;
  session.hasRenderableVideo = false;
  session.videoElement = null;
  session.prewarmDeviceId = undefined;
  session.prewarmPreviewEnabled = false;
  session.phase = "idle";
}

function scheduleIdleRelease(session: CameraSession, delayMs = CAMERA_IDLE_RELEASE_MS): void {
  clearIdleTimer(session);
  if (session.prewarmCount > 0) {
    return;
  }

  if (delayMs === 0) {
    teardownSession(session);
    return;
  }

  session.idleTimerId = window.setTimeout(() => {
    teardownSession(session);
  }, delayMs);
}

async function waitForVideoReadiness(
  video: HTMLVideoElement,
  timeoutMs: number,
): Promise<void> {
  const readyStateSufficient = () =>
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0;

  if (readyStateSufficient()) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera preview did not become ready in time."));
    }, timeoutMs);

    const handleCanPlay = () => {
      if (!readyStateSufficient()) {
        return;
      }
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Camera preview failed to load."));
    };

    function cleanup() {
      window.clearTimeout(timeoutId);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadedmetadata", handleCanPlay);
      video.removeEventListener("error", handleError);
    }

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadedmetadata", handleCanPlay);
    video.addEventListener("error", handleError);
  });
}

async function bindStreamToVideo(
  session: CameraSession,
  video: HTMLVideoElement,
  stream: MediaStream,
  timeoutMs: number,
): Promise<void> {
  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }

  try {
    await video.play();
  } catch {
    // iOS Safari may reject if it decides the video is already playing.
  }

  await waitForVideoReadiness(video, timeoutMs);
  session.hasRenderableVideo = true;
}

async function openCameraStream(
  deviceId?: string,
): Promise<{ stream: MediaStream; activeDeviceId?: string }> {
  const stream = await navigator.mediaDevices.getUserMedia(
    buildVideoConstraints(deviceId),
  );
  const [track] = stream.getVideoTracks();
  await optimizeVideoTrackForQr(stream);
  return {
    stream,
    activeDeviceId: track?.getSettings().deviceId,
  };
}

async function ensureLiveStream(
  session: CameraSession,
  deviceId?: string,
): Promise<string | undefined> {
  clearIdleTimer(session);

  const existingTrack = session.stream?.getVideoTracks()[0];
  const activeDeviceId = existingTrack?.getSettings().deviceId;
  const shouldReopen =
    !session.stream ||
    !existingTrack ||
    existingTrack.readyState === "ended" ||
    (deviceId && activeDeviceId && activeDeviceId !== deviceId);

  if (shouldReopen) {
    stopDecodeControls(session);
    stopStream(session.stream);
    session.stream = null;
    session.hasRenderableVideo = false;

    const opened = await openCameraStream(deviceId);
    session.stream = opened.stream;
    session.prewarmDeviceId = opened.activeDeviceId ?? deviceId;
    session.phase = "hot";
    return session.prewarmDeviceId;
  }

  session.phase = "hot";
  return activeDeviceId ?? deviceId;
}

type DecodeSessionOptions = {
  forceDeviceId?: boolean;
  scanFormat?: ScanFormat;
};

export function attachDecodeSession(
  sessionId: CameraSessionId,
  onDecode: (value: string) => void,
  onStateChange?: (
    ready: boolean,
    error?: string,
    activeDeviceId?: string,
  ) => void,
  preferredDeviceId?: string,
  options: DecodeSessionOptions = {},
): () => void {
  const session = getSession(sessionId);
  let cancelled = false;
  let scanLoopTimerId: number | null = null;

  const clearScanLoopTimer = () => {
    if (scanLoopTimerId !== null) {
      window.clearTimeout(scanLoopTimerId);
      scanLoopTimerId = null;
    }
  };

  const emitState = (ready: boolean, error?: string, activeDeviceId?: string) => {
    onStateChange?.(ready, error, activeDeviceId);
  };

  const container = getContainerElement(sessionId);
  if (!container) {
    emitState(false, "Scanner container not found.");
    return () => {};
  }

  void (async () => {
    try {
      let activeDeviceId = await ensureLiveStream(
        session,
        options.forceDeviceId ? preferredDeviceId : undefined,
      );

      if (cancelled) {
        return;
      }

      await waitForContainerToSettle(container, () => cancelled);
      if (cancelled) {
        return;
      }

      const video = ensureSessionVideoElement(session, container);
      await bindStreamToVideo(
        session,
        video,
        session.stream!,
        session.hasRenderableVideo
          ? VIDEO_REATTACH_READY_TIMEOUT_MS
          : VIDEO_READY_TIMEOUT_MS,
      );

      if (cancelled) {
        return;
      }

      emitState(true, undefined, activeDeviceId);
      session.phase = "decoding";

      const readerFactory = await loadReaderFactory(options.scanFormat ?? "qr");
      if (cancelled) {
        return;
      }

      const reader = readerFactory();

      const decodeNext = () => {
        clearScanLoopTimer();

        if (cancelled) {
          return;
        }

        const root = getContainerElement(sessionId);
        const currentVideo = session.videoElement;
        if (!root || !(currentVideo instanceof HTMLVideoElement)) {
          emitState(false, "Camera preview detached unexpectedly.");
          return;
        }

        const canvas = buildDecodeCanvas(
          currentVideo,
          root,
          options.scanFormat ?? "qr",
        );
        if (!canvas) {
          scanLoopTimerId = window.setTimeout(decodeNext, SCAN_LOOP_DELAY_MS);
          return;
        }

        try {
          const result = reader.decodeFromCanvas(canvas);
          const value = result.getText();
          if (value) {
            onDecode(value);
            scanLoopTimerId = window.setTimeout(
              decodeNext,
              SCAN_SUCCESS_BACKOFF_MS,
            );
            return;
          }
        } catch {
          // No code found in this frame.
        }

        scanLoopTimerId = window.setTimeout(decodeNext, SCAN_LOOP_DELAY_MS);
      };

      decodeNext();
      session.decodeControls = {
        stop() {
          clearScanLoopTimer();
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start camera.";
      emitState(false, message);

      if (!session.prewarmCount) {
        teardownSession(session);
      }
    }
  })();

  return () => {
    cancelled = true;
    clearScanLoopTimer();
    stopDecodeControls(session);

    if (session.videoElement?.parentElement === container) {
      detachVideoElement(session);
    }

    if (session.prewarmCount > 0) {
      const previewVideo = ensurePrewarmVideoElement(session);
      void bindStreamToVideo(
        session,
        previewVideo,
        session.stream!,
        VIDEO_REOPEN_READY_TIMEOUT_MS,
      ).catch(() => {
        teardownSession(session);
      });
    } else {
      scheduleIdleRelease(session);
    }

    emitState(false);
  };
}

export function prewarmCameraSession(
  sessionId: CameraSessionId,
  delayMs = 0,
  preferredDeviceId?: string,
  options: { attachPreview?: boolean; idleReleaseMs?: number } = {},
): () => void {
  const session = getSession(sessionId);
  let cancelled = false;
  session.prewarmCount += 1;

  const startPrewarm = async () => {
    try {
      if (delayMs > 0) {
        await new Promise<void>((resolve) => {
          session.startDelayTimerId = window.setTimeout(resolve, delayMs);
        });
      }

      if (cancelled) {
        return;
      }

      const activeDeviceId = await ensureLiveStream(session, preferredDeviceId);
      if (cancelled) {
        return;
      }

      session.prewarmDeviceId = activeDeviceId ?? preferredDeviceId;
      session.prewarmPreviewEnabled = Boolean(options.attachPreview);

      if (options.attachPreview) {
        const previewVideo = ensurePrewarmVideoElement(session);
        await bindStreamToVideo(
          session,
          previewVideo,
          session.stream!,
          PREWARM_PREVIEW_READY_TIMEOUT_MS,
        );
      }

      session.phase = "prewarming";
    } catch {
      if (!session.prewarmCount) {
        teardownSession(session);
      }
    }
  };

  void startPrewarm();

  return () => {
    cancelled = true;
    clearStartDelayTimer(session);
    session.prewarmCount = Math.max(0, session.prewarmCount - 1);

    if (session.prewarmCount === 0) {
      if (session.phase === "decoding") {
        return;
      }

      scheduleIdleRelease(session, options.idleReleaseMs ?? CAMERA_IDLE_RELEASE_MS);
    }
  };
}

export function forceReleaseCameraSession(sessionId: CameraSessionId): void {
  const session = sessions.get(sessionId);
  if (session) teardownSession(session);
}

export function suspendAllCameraSessions(): void {
  for (const session of sessions.values()) {
    session.videoElement?.pause();
    stopStream(session.stream);
    session.stream = null;
    session.hasRenderableVideo = false;
    session.phase = session.prewarmCount > 0 ? "prewarming" : "idle";
  }
}

export function resumePrewarmedCameraSessions(): void {
  for (const session of sessions.values()) {
    if (session.prewarmCount === 0) {
      continue;
    }

    void (async () => {
      try {
        const activeDeviceId = await ensureLiveStream(
          session,
          session.prewarmDeviceId,
        );
        session.prewarmDeviceId = activeDeviceId ?? session.prewarmDeviceId;

        if (session.prewarmPreviewEnabled) {
          const previewVideo = ensurePrewarmVideoElement(session);
          await bindStreamToVideo(
            session,
            previewVideo,
            session.stream!,
            PREWARM_PREVIEW_READY_TIMEOUT_MS,
          );
        }

        session.phase = "prewarming";
      } catch {
        teardownSession(session);
      }
    })();
  }
}

export function releaseAllCameraSessions(): void {
  for (const session of sessions.values()) {
    teardownSession(session);
  }
  sessions.clear();
}
