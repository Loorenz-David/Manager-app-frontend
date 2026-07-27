import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

import { useKeyboardInset } from "../../../providers/KeyboardInsetProvider";
import { FloatingKeyboardBar } from "./FloatingKeyboardBar";

export type KeyboardFloatingCardProps = {
  /**
   * True while this card owns the keyboard. Only the active card wraps itself,
   * so the other rows of a list never dock themselves to the bottom too.
   */
  isFloating: boolean;
  /**
   * Renders the card. While floating it is rendered twice — an invisible
   * placeholder that keeps the list from shifting, and the docked copy — so
   * the ref must be forwarded to the field that owns the keyboard.
   */
  children: (inputRef?: RefObject<HTMLInputElement | null>) => ReactNode;
  /**
   * Called when the keyboard is dismissed while docked (Android back, the
   * hide-keyboard key), which does not necessarily blur the field.
   */
  onKeyboardDismissed?: () => void;
};

/**
 * Docks an entire card above the on-screen keyboard while one of its fields is
 * being edited, instead of only the field itself. The tray is opaque and full
 * width, so the rows left behind in the list do not show through.
 */
export function KeyboardFloatingCard({
  isFloating,
  children,
  onKeyboardDismissed,
}: KeyboardFloatingCardProps): React.JSX.Element {
  const { isKeyboardOpen } = useKeyboardInset();
  // The keyboard is still closed for the frame in which editing begins, so the
  // dismissal only counts once it has actually been up.
  const hasBeenOpenRef = useRef(false);

  useEffect(() => {
    if (!isFloating) {
      hasBeenOpenRef.current = false;
      return;
    }

    if (isKeyboardOpen) {
      hasBeenOpenRef.current = true;
      return;
    }

    if (hasBeenOpenRef.current) {
      hasBeenOpenRef.current = false;
      onKeyboardDismissed?.();
    }
  }, [isFloating, isKeyboardOpen, onKeyboardDismissed]);

  if (!isFloating) {
    return <>{children()}</>;
  }

  return (
    <FloatingKeyboardBar
      // The card carries its own horizontal margin; the surface only supplies
      // the opaque backdrop and the gap above the keys.
      className="px-0"
      // Cover the page up to the keyboard so the list behind is fully hidden,
      // with the card centred in the space that is left.
      fullHeight
      renderControls={({ inputRef }) => children(inputRef)}
    />
  );
}
