import { useCallback, useEffect, useRef } from "react";
import type { HTMLAttributes, KeyboardEvent, PointerEvent } from "react";

const DEVICE_SETTINGS_LONG_PRESS_MS = 600;

export function useDeviceSettingsLongPress(
  onLongPress: () => void,
): HTMLAttributes<HTMLDivElement> {
  const timerRef = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    cancel();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onLongPress();
    }, DEVICE_SETTINGS_LONG_PRESS_MS);
  }, [cancel, onLongPress]);

  useEffect(() => cancel, [cancel]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button === 0) {
        start();
      }
    },
    [start],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if ((event.key === " " || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        start();
      }
    },
    [start],
  );

  return {
    "aria-label": "Open terminal settings with a long press",
    onContextMenu: (event) => event.preventDefault(),
    onKeyDown: handleKeyDown,
    onKeyUp: cancel,
    onPointerCancel: cancel,
    onPointerDown: handlePointerDown,
    onPointerLeave: cancel,
    onPointerUp: cancel,
    role: "button",
    tabIndex: 0,
  };
}
