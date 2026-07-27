/**
 * Shared geometry for the trays that dock above the on-screen keyboard
 * (floating field, numeric bar, accessory bar).
 *
 * `KEYBOARD_TRAY_ANCHOR` pins the tray to the top edge of the keyboard via
 * `--keyboard-inset` (see `KeyboardInsetProvider`).
 *
 * `KEYBOARD_TRAY_SURFACE` is the tray itself. Its bottom padding is the only
 * breathing room between the content and the keyboard, so it takes a hard
 * floor: `--safe-bottom` is 0 on Android (no home indicator), which otherwise
 * leaves the content sitting flush against the keys. iOS keeps the larger
 * safe-area-derived value.
 */
export const KEYBOARD_TRAY_ANCHOR =
  "pointer-events-none fixed inset-x-0 z-[9999] bottom-[var(--keyboard-inset)]";

export const KEYBOARD_TRAY_SURFACE =
  "pointer-events-auto border-t border-border bg-card px-4 pb-[max(1.25rem,calc(var(--safe-bottom,0px)_+_0.75rem))] shadow-xl";
