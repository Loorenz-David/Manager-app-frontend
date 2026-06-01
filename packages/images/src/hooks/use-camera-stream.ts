import { useCallback, useEffect, useRef, useState } from "react";

import {
  attachCameraStream,
  detachCameraStream,
  prewarmCameraStream,
} from "../lib/camera-session-manager";

type UseCameraStreamResult = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  hasError: boolean;
  startStream: () => Promise<void>;
  captureFrame: () => Promise<Blob | null>;
};

export { prewarmCameraStream };

export function useCameraStream(sessionId: string): UseCameraStreamResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isMountedRef = useRef(true);

  const startStream = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    try {
      setHasError(false);
      await attachCameraStream(video, sessionId);

      if (videoRef.current !== video) {
        detachCameraStream(video);
        return;
      }

      if (isMountedRef.current) {
        setIsReady(true);
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setHasError(true);
      setIsReady(false);
      console.error('[useCameraStream] Failed to start stream.', error);
    }
  }, [sessionId]);

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
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, [isReady]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      detachCameraStream(videoRef.current);
    };
  }, []);

  return { videoRef, isReady, hasError, startStream, captureFrame };
}
