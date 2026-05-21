import { Camera, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useCameraStream } from '../hooks/use-camera-stream';
import type { ImageLinkEntityType } from '../types';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

type ImageCameraPageProps = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  onCapture: (rawBlob: Blob) => void;
  latestImageUrl?: string | null;
};

export function ImageCameraPage(): React.JSX.Element {
  const { onCapture, latestImageUrl } = useSurfaceProps<ImageCameraPageProps>();
  const header = useSurfaceHeader();
  const { videoRef, isReady, hasError, startStream, captureFrame } = useCameraStream();
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const flashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    header?.setTitle('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void startStream();
  }, [startStream]);

  useEffect(() => () => {
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
    }
  }, []);

  const triggerFlash = useCallback(() => {
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
    }

    setIsFlashing(true);
    flashTimeoutRef.current = window.setTimeout(() => {
      setIsFlashing(false);
      flashTimeoutRef.current = null;
    }, 300);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!onCapture || isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      const blob = await captureFrame();
      if (!blob) {
        return;
      }

      triggerFlash();
      navigator.vibrate?.(10);
      onCapture(blob);
    } finally {
      setIsCapturing(false);
    }
  }, [captureFrame, isCapturing, onCapture, triggerFlash]);

  const handleClose = useCallback(() => {
    useSurfaceStore.getState().closeTop();
  }, []);

  if (hasError) {
    return (
      <div
        className="flex min-h-full flex-col items-center justify-center bg-black px-6 text-center text-white"
        data-testid="image-camera-error"
      >
        <p className="text-sm text-white/80">Camera unavailable.</p>
        <button
          type="button"
          className="mt-4 rounded-full border border-white/30 px-4 py-2 text-sm text-white"
          data-testid="camera-error-close"
          onClick={handleClose}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-black" data-testid="image-camera-page">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          className="h-full w-full object-cover"
          data-testid="camera-video-preview"
          muted
          playsInline
        />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <div className="aspect-square w-full max-w-full rounded-[28px] border border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]" />
        </div>

        {isFlashing ? (
          <div
            className="pointer-events-none absolute inset-0 animate-camera-flash bg-white"
            data-testid="camera-flash-overlay"
          />
        ) : null}
      </div>

      <div
        className="flex items-center justify-between gap-4 px-5 pb-[calc(var(--safe-bottom)+1rem)] pt-4"
        data-testid="camera-controls"
      >
        <button
          type="button"
          aria-label="Latest image"
          className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/10 disabled:opacity-60"
          data-testid="camera-latest-thumbnail"
          disabled={!latestImageUrl}
        >
          {latestImageUrl ? (
            <img alt="Latest capture" className="size-full object-cover" src={latestImageUrl} />
          ) : (
            <Camera aria-hidden="true" className="size-5 text-white/70" />
          )}
        </button>

        <button
          type="button"
          aria-label="Take photo"
          className="flex size-20 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-transform duration-75 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="camera-capture-button"
          disabled={!isReady || isCapturing}
          onClick={() => {
            void handleCapture();
          }}
        >
          <div className="size-14 rounded-full bg-white" />
        </button>

        <button
          type="button"
          aria-label="Close camera"
          className="flex size-14 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-150 hover:bg-white/15"
          data-testid="camera-close-button"
          onClick={handleClose}
        >
          <X className="size-6" />
        </button>
      </div>
    </div>
  );
}
