import { m } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@beyo/lib";

import type { FabMenuProps } from "./fab-menu.types";

const FAB_TRANSITION = {
  duration: 0.3,
  ease: [0.32, 0.72, 0, 1] as const,
};

const STAGGER_SECONDS = 0.03;

/** Distance from the trigger's centre to an expanded action's centre. */
const ARC_RADIUS = 72;

const ANCHOR_CLASS =
  "fixed bottom-[calc(var(--safe-bottom,0px)+0.75rem)] right-4 z-40";

const BUTTON_CLASS =
  "flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md disabled:opacity-50";

type ActionOffset = { x: number; y: number };

/**
 * Where the action at `index` rests when the menu is open.
 *
 * The actions fan out along a quarter circle above and to the left of the
 * trigger: index 0 sits due left (0°), the last sits due up (90°). A lone
 * action has no arc to spread across and goes straight up, which reads as a
 * single button pushed out of the trigger rather than an odd diagonal.
 */
export function fabMenuActionOffset(index: number, count: number): ActionOffset {
  const degrees = count <= 1 ? 90 : (index * 90) / (count - 1);
  const radians = (degrees * Math.PI) / 180;

  const x = Math.round(ARC_RADIUS * Math.cos(radians));
  const y = Math.round(ARC_RADIUS * Math.sin(radians));

  // `-0` would leak out of a plain negation and reads as a different value.
  return { x: x === 0 ? 0 : -x, y: y === 0 ? 0 : -y };
}

export function FabMenu({
  actions,
  openIcon,
  closeIcon,
  openLabel = "Open menu",
  closeLabel = "Close menu",
  className,
  dataTestId = "fab-menu",
  onOpenChange,
}: FabMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  function setOpen(next: boolean): void {
    setIsOpen(next);
    onOpenChange?.(next);
  }

  return (
    <>
      {actions.map((action, index) => {
        const offset = fabMenuActionOffset(index, actions.length);

        return (
          <m.button
            key={action.id}
            animate={
              isOpen
                ? { scale: 0.75, x: offset.x, y: offset.y }
                : { scale: 0, x: 0, y: 0 }
            }
            aria-label={action.label}
            className={cn(
              ANCHOR_CLASS,
              BUTTON_CLASS,
              !isOpen && "pointer-events-none",
              className,
            )}
            data-testid={`${dataTestId}-action-${action.id}`}
            disabled={action.disabled}
            initial={false}
            transition={{
              ...FAB_TRANSITION,
              delay: isOpen
                ? index * STAGGER_SECONDS
                : (actions.length - 1 - index) * STAGGER_SECONDS,
            }}
            type="button"
            onClick={() => {
              setOpen(false);
              action.onPress();
            }}
          >
            {action.icon}
          </m.button>
        );
      })}

      <m.button
        animate={{ scale: isOpen ? 0.7 : 1 }}
        aria-expanded={isOpen}
        aria-label={isOpen ? closeLabel : openLabel}
        className={cn(ANCHOR_CLASS, BUTTON_CLASS, className)}
        data-testid={dataTestId}
        initial={false}
        transition={FAB_TRANSITION}
        type="button"
        onClick={() => setOpen(!isOpen)}
      >
        {isOpen
          ? (closeIcon ?? <X aria-hidden="true" className="size-5" />)
          : (openIcon ?? <Plus aria-hidden="true" className="size-5" />)}
      </m.button>
    </>
  );
}
