import { m } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@beyo/lib";

import type { FabMenuProps } from "./fab-menu.types";
import {
  FAB_ANCHOR_CLASS,
  FAB_ARC_RADIUS,
  FAB_BUTTON_CLASS,
  FAB_STAGGER_SECONDS,
  FAB_TRANSITION,
} from "./fab-shared";

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

  const x = Math.round(FAB_ARC_RADIUS * Math.cos(radians));
  const y = Math.round(FAB_ARC_RADIUS * Math.sin(radians));

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
              FAB_ANCHOR_CLASS,
              FAB_BUTTON_CLASS,
              !isOpen && "pointer-events-none",
              className,
            )}
            data-testid={`${dataTestId}-action-${action.id}`}
            disabled={action.disabled}
            initial={false}
            transition={{
              ...FAB_TRANSITION,
              delay: isOpen
                ? index * FAB_STAGGER_SECONDS
                : (actions.length - 1 - index) * FAB_STAGGER_SECONDS,
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
        className={cn(FAB_ANCHOR_CLASS, FAB_BUTTON_CLASS, className)}
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
