import { motion } from "framer-motion";
import { Circle, FolderPlus, Plus, Spool, X } from "lucide-react";
import { useState } from "react";

import { usePreloadSurface } from "@/hooks/use-preload-surface";
import { cn } from "@/lib/utils";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

import {
  INVENTORY_CREATION_SLIDE_ID,
  preloadInventoryCreationSurface,
} from "../surfaces";
import {
  UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID,
  preloadUpholsteryCategoryCreationSurface,
} from "@/features/upholstery-category";

const FAB_TRANSITION = {
  duration: 0.3,
  ease: [0.32, 0.72, 0, 1] as const,
};

const FAB_POSITION_CLASS =
  "bottom-[calc(var(--safe-bottom,0px)+0.75rem)] right-4";

const ACTION_BUTTONS = [
  {
    id: "future",
    surfaceId: null,
    icon: Circle,
    label: "Future action",
    x: -72,
    y: 0,
    testId: "inventory-creation-fab-action-future",
    disabled: true,
  },
  {
    id: "inventory",
    surfaceId: INVENTORY_CREATION_SLIDE_ID,
    icon: Spool,
    label: "New inventory",
    x: 0,
    y: -72,
    testId: "inventory-creation-fab-action-inventory",
    disabled: false,
  },
  {
    id: "category",
    surfaceId: UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID,
    icon: FolderPlus,
    label: "New category",
    x: -51,
    y: -51,
    testId: "inventory-creation-fab-action-category",
    disabled: false,
  },
] as const;

export function InventoryCreationFab(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  usePreloadSurface(preloadInventoryCreationSurface);
  usePreloadSurface(preloadUpholsteryCategoryCreationSurface);

  function handleActionPress(surfaceId: string | null): void {
    if (!surfaceId) {
      return;
    }

    useSurfaceStore.getState().open(surfaceId);
    setIsOpen(false);
  }

  return (
    <>
      {ACTION_BUTTONS.map((action, index) => (
        <motion.button
          key={action.id}
          aria-label={action.label}
          className={cn(
            `fixed ${FAB_POSITION_CLASS} z-40 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md`,
            !isOpen && "pointer-events-none",
            action.disabled && "opacity-55",
          )}
          data-testid={action.testId}
          initial={false}
          transition={{
            ...FAB_TRANSITION,
            delay: isOpen
              ? index * 0.03
              : (ACTION_BUTTONS.length - 1 - index) * 0.03,
          }}
          animate={
            isOpen
              ? { scale: 0.75, x: action.x, y: action.y }
              : { scale: 0, x: 0, y: 0 }
          }
          disabled={action.disabled}
          type="button"
          onClick={() => handleActionPress(action.surfaceId)}
        >
          <action.icon aria-hidden="true" className="size-5" />
        </motion.button>
      ))}

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
