import { useCallback, useEffect, useRef, useState } from 'react';

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1920 },
  },
  audio: false,
};

let sharedStream: MediaStream | null = null;
let streamRequest: Promise<MediaStream> | null = null;

async function getOrCreateCameraStream(): Promise<MediaStream> {
  if (sharedStream?.active) {
    return sharedStream;
  }

  if (streamRequest) {
    return streamRequest;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API unavailable.');
  }

  streamRequest = navigator.mediaDevices
    .getUserMedia(CAMERA_CONSTRAINTS)
    .then((stream) => {
      sharedStream = stream;
      return stream;
    })
    .finally(() => {
      streamRequest = null;
    });

  return streamRequest;
}

function releaseCameraStream(): void {
  sharedStream?.getTracks().forEach((track) => track.stop());
  sharedStream = null;
}

export async function prewarmCameraStream(): Promise<void> {
  await getOrCreateCameraStream();
}

type UseCameraStreamResult = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  hasError: boolean;
  startStream: () => Promise<void>;
  stopStream: () => void;
  prewarm: () => Promise<void>;
  captureFrame: () => Promise<Blob | null>;
};

export function useCameraStream(): UseCameraStreamResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const startStream = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    try {
      setHasError(false);
      const stream = await getOrCreateCameraStream();

      if (videoRef.current !== video) {
        return;
      }

      video.srcObject = stream;
      // play() rejects on iOS Safari when called from useEffect (outside a user-gesture
      // stack) even with muted + playsInline. autoPlay handles actual playback when
      // srcObject is set — swallow the rejection so hasError is not set incorrectly.
      await video.play().catch(() => {});
      setIsReady(true);
    } catch (error) {
      setHasError(true);
      setIsReady(false);
      console.error('[useCameraStream] Failed to start stream.', error);
    }
  }, []);

  const stopStream = useCallback(() => {
    const video = videoRef.current;

    if (video) {
      video.pause();
      video.srcObject = null;
    }

    releaseCameraStream();
    setIsReady(false);
  }, []);

  const prewarm = useCallback(async () => {
    try {
      setHasError(false);
      await prewarmCameraStream();
    } catch {
      // Prewarm is opportunistic. The page mount path will surface the real error state.
    }
  }, []);

  const captureFrame = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !isReady || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const size = Math.min(video.videoWidth, video.videoHeight);
    const sourceX = Math.floor((video.videoWidth - size) / 2);
    const sourceY = Math.floor((video.videoHeight - size) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.drawImage(video, sourceX, sourceY, size, size, 0, 0, size, size);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }, [isReady]);

  useEffect(() => () => {
    stopStream();
  }, [stopStream]);

  return { videoRef, isReady, hasError, startStream, stopStream, prewarm, captureFrame };
}
