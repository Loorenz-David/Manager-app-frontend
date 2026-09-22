import { m } from "framer-motion";

import { cn } from "@beyo/lib";

import { FAB_ANCHOR_CLASS, FAB_BUTTON_CLASS, FAB_TRANSITION } from "./fab-shared";

export type FabButtonProps = {
  /** Accessible name — the button is icon-only. */
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  /** Overrides the fixed position. */
  className?: string;
  dataTestId?: string;
};

/**
 * A floating action button that *is* its action, rather than opening onto one.
 *
 * Use it wherever there is exactly one thing to do and no choice to offer — a
 * mode with a single way out, say. `FabMenu` is for the case where the button
 * opens onto two or more actions; wrapping a lone action in a menu costs the
 * user a tap to reach a decision that was never theirs to make.
 */
export function FabButton({
  label,
  icon,
  onPress,
  disabled = false,
  className,
  dataTestId,
}: FabButtonProps): React.JSX.Element {
  return (
    <m.button
      animate={{ scale: 1 }}
      aria-label={label}
      className={cn(FAB_ANCHOR_CLASS, FAB_BUTTON_CLASS, className)}
      data-testid={dataTestId}
      disabled={disabled}
      initial={false}
      transition={FAB_TRANSITION}
      type="button"
      onClick={onPress}
    >
      {icon}
    </m.button>
  );
}
