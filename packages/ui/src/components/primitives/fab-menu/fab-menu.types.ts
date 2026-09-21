import type { ReactNode } from "react";

export type FabMenuAction = {
  /** Stable id — also the suffix of the action's `data-testid`. */
  id: string;
  /** Accessible name of the action button; the buttons are icon-only. */
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onPress: () => void;
};

export type FabMenuProps = {
  actions: readonly FabMenuAction[];
  /** Glyph on the trigger while the menu is closed. Defaults to a plus. */
  openIcon?: ReactNode;
  /** Glyph on the trigger while the menu is open. Defaults to a cross. */
  closeIcon?: ReactNode;
  openLabel?: string;
  closeLabel?: string;
  /**
   * Overrides the fixed position of the whole menu. Every button is positioned
   * from the same anchor, so this must carry the anchor, not per-button offsets.
   */
  className?: string;
  dataTestId?: string;
  onOpenChange?: (open: boolean) => void;
};
