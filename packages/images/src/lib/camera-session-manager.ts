const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1920 },
  },
  audio: false,
};

const DEFAULT_CAMERA_KEEP_ALIVE_MS = 30_000;
const PREWARM_CAMERA_SESSION_ID = "__prewarm_camera_session__";

let sharedStream: MediaStream | null = null;
let streamRequest: Promise<MediaStream> | null = null;
let activeSessionId: string | null = null;
let stopTimeoutId: number | null = null;
let shouldStopPendingStream = false;
const attachedVideos = new Set<HTMLVideoElement>();

type GlobalWithCameraKeepAliveOverride = typeof globalThis & {
  __BEYO_CAMERA_KEEP_ALIVE_MS__?: number;
};

function getCameraKeepAliveMs(): number {
  const override = (globalThis as GlobalWithCameraKeepAliveOverride)
    .__BEYO_CAMERA_KEEP_ALIVE_MS__;

  if (
    typeof override === "number" &&
    Number.isFinite(override) &&
    override > 0
  ) {
    return override;
  }

  return DEFAULT_CAMERA_KEEP_ALIVE_MS;
}

function clearScheduledStop(): void {
  if (stopTimeoutId !== null) {
    window.clearTimeout(stopTimeoutId);
    stopTimeoutId = null;
  }
}

function claimCameraSession(sessionId: string): void {
  activeSessionId = sessionId;
  shouldStopPendingStream = false;
  clearScheduledStop();
}

function detachVideoElement(video: HTMLVideoElement | null): void {
  if (!video) {
    return;
  }

  attachedVideos.delete(video);
  video.pause();
  video.srcObject = null;
}

function releaseCameraStream(): void {
  clearScheduledStop();
  attachedVideos.forEach((video) => {
    video.pause();
    video.srcObject = null;
  });
  attachedVideos.clear();
  sharedStream?.getTracks().forEach((track) => track.stop());
  sharedStream = null;
  activeSessionId = null;

  if (streamRequest) {
    shouldStopPendingStream = true;
  }
}

async function getOrCreateCameraStream(): Promise<MediaStream> {
  if (sharedStream?.active) {
    return sharedStream;
  }

  if (streamRequest) {
    return streamRequest;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API unavailable.");
  }

  streamRequest = navigator.mediaDevices
    .getUserMedia(CAMERA_CONSTRAINTS)
    .then((stream) => {
      if (shouldStopPendingStream && activeSessionId === null) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Camera stream released before it became active.");
      }

      sharedStream = stream;
      return stream;
    })
    .finally(() => {
      streamRequest = null;
      shouldStopPendingStream = false;
    });

  return streamRequest;
}

export function keepCameraStreamWarm(sessionId: string): void {
  claimCameraSession(sessionId);
}

export async function ensureCameraStreamStarted(
  sessionId: string,
): Promise<MediaStream> {
  claimCameraSession(sessionId);
  return getOrCreateCameraStream();
}

export async function attachCameraStream(
  video: HTMLVideoElement,
  sessionId: string,
): Promise<void> {
  const stream = await ensureCameraStreamStarted(sessionId);

  video.srcObject = stream;
  attachedVideos.add(video);
  // play() rejects on iOS Safari when called from useEffect (outside a
  // user-gesture stack) even with muted + playsInline. autoPlay handles actual
  // playback when srcObject is set, so swallow the rejection here.
  await video.play().catch(() => {});
}

export function detachCameraStream(video: HTMLVideoElement | null): void {
  detachVideoElement(video);
}

export function scheduleCameraStreamStop(
  sessionId: string,
  delayMs = getCameraKeepAliveMs(),
): void {
  if (activeSessionId !== sessionId) {
    return;
  }

  clearScheduledStop();
  stopTimeoutId = window.setTimeout(() => {
    if (activeSessionId === sessionId) {
      releaseCameraStream();
    }
  }, delayMs);
}

export function cancelCameraStreamStop(sessionId: string): void {
  if (activeSessionId !== sessionId) {
    return;
  }

  clearScheduledStop();
}

export function forceStopCameraStream(sessionId: string): void {
  if (activeSessionId !== sessionId) {
    return;
  }

  releaseCameraStream();
}

export async function prewarmCameraStream(): Promise<void> {
  keepCameraStreamWarm(PREWARM_CAMERA_SESSION_ID);
  await getOrCreateCameraStream();
  scheduleCameraStreamStop(PREWARM_CAMERA_SESSION_ID);
}
