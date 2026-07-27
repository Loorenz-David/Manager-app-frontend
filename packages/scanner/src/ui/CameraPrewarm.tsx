import type { CameraSessionId } from "../domain/camera-session.manager";
import { useCameraPrewarm } from "../flows/use-camera-prewarm";

type CameraPrewarmProps = {
  sessionId: CameraSessionId;
  /** Grace period before the stream is acquired, so a step the user passes
   * straight through never opens the camera at all. */
  delayMs?: number;
};

/**
 * Renders nothing; holds a camera session warm for exactly as long as it stays
 * mounted, and releases it on unmount. Place it next to the control that opens
 * the camera — that way the stream is only ever acquired while that trigger is
 * actually on screen, instead of for the whole lifetime of the surrounding
 * page or form.
 */
export function CameraPrewarm({
  sessionId,
  delayMs = 0,
}: CameraPrewarmProps): null {
  useCameraPrewarm(sessionId, delayMs);
  return null;
}
