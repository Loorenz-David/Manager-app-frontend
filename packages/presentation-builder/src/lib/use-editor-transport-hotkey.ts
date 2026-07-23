import { useEffect, useRef } from "react";

const TYPING_TARGET_SELECTOR = "input, textarea, select, [contenteditable]";

export function isEditorTypingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TYPING_TARGET_SELECTOR) !== null;
}

type EditorTransportHotkeyOptions = {
  enabled?: boolean;
  publishDialogOpen?: boolean;
};

export function useEditorTransportHotkey(
  onTogglePlay: () => void,
  {
    enabled = true,
    publishDialogOpen = false,
  }: EditorTransportHotkeyOptions = {},
): void {
  const onTogglePlayRef = useRef(onTogglePlay);
  onTogglePlayRef.current = onTogglePlay;

  useEffect(() => {
    if (!enabled || publishDialogOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== " " ||
        event.defaultPrevented ||
        isEditorTypingTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      onTogglePlayRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, publishDialogOpen]);
}
