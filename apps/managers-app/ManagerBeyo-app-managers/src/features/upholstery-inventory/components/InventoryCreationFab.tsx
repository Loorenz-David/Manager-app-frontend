import { motion } from "framer-motion";
import { Plus, Spool, X } from "lucide-react";
import { useState } from "react";

import { usePreloadSurface } from "@/hooks/use-preload-surface";
import { cn } from "@/lib/utils";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

import {
  INVENTORY_CREATION_SLIDE_ID,
  preloadInventoryCreationSurface,
} from "../surfaces";

const FAB_TRANSITION = {
  duration: 0.3,
  ease: [0.32, 0.72, 0, 1] as const,
};

const FAB_POSITION_CLASS =
  "bottom-[calc(var(--safe-bottom,0px)+0.75rem)] right-4";

const ACTION_BUTTON = {
  id: "inventory",
  surfaceId: INVENTORY_CREATION_SLIDE_ID,
  icon: Spool,
  label: "New inventory",
  x: 0,
  y: -72,
} as const;

export function InventoryCreationFab(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  usePreloadSurface(preloadInventoryCreationSurface);

  function handleActionPress(): void {
    useSurfaceStore.getState().open(ACTION_BUTTON.surfaceId);
    setIsOpen(false);
  }

  return (
    <>
      <motion.button
        aria-label={ACTION_BUTTON.label}
        className={cn(
          `fixed ${FAB_POSITION_CLASS} z-40 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md`,
          !isOpen && "pointer-events-none",
        )}
        data-testid="inventory-creation-fab-action-inventory"
        initial={false}
        transition={FAB_TRANSITION}
        animate={
          isOpen
            ? { scale: 0.75, x: ACTION_BUTTON.x, y: ACTION_BUTTON.y }
            : { scale: 0, x: 0, y: 0 }
        }
        type="button"
        onClick={handleActionPress}
      >
        <ACTION_BUTTON.icon aria-hidden="true" className="size-5" />
      </motion.button>

      <motion.button
        aria-label={
          isOpen
            ? "Close inventory creation menu"
            : "Open inventory creation menu"
        }
        className={`fixed ${FAB_POSITION_CLASS} z-40 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md`}
        data-testid="inventory-creation-fab"
        initial={false}
        transition={FAB_TRANSITION}
        animate={{ scale: isOpen ? 0.7 : 1 }}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Plus aria-hidden="true" className="size-5" />
        )}
      </motion.button>
    </>
  );
}
