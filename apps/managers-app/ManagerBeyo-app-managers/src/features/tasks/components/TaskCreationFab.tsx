import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, RotateCcw, ShoppingBag, Wrench, X } from "lucide-react";
import { useState } from "react";

import {
  TASK_CREATION_INTERNAL_SURFACE_ID,
  TASK_CREATION_PRE_ORDER_SURFACE_ID,
  TASK_CREATION_RETURN_SURFACE_ID,
  preloadInternalTaskSlideSurface,
  preloadPreOrderTaskSlideSurface,
  preloadReturnTaskSlideSurface,
  type TaskCreationCallbacks,
} from "@beyo/task-creation";

import { usePreloadSurface } from "@/hooks/use-preload-surface";
import { invalidateAfterInventoryMutation } from "@/features/upholstery-inventory/lib/invalidate-inventory";
import { cn } from "@/lib/utils";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

const FAB_TRANSITION = {
  duration: 0.3,
  ease: [0.32, 0.72, 0, 1] as const,
};

const FAB_POSITION_CLASS =
  "bottom-[calc(var(--safe-bottom,0px)+0.75rem)] right-4";

const ACTION_BUTTONS = [
  {
    id: "return",
    surfaceId: TASK_CREATION_RETURN_SURFACE_ID,
    Icon: RotateCcw,
    label: "New return",
    x: -72,
    y: 0,
  },
  {
    id: "pre_order",
    surfaceId: TASK_CREATION_PRE_ORDER_SURFACE_ID,
    Icon: ShoppingBag,
    label: "New pre-order",
    x: -51,
    y: -51,
  },
  {
    id: "internal",
    surfaceId: TASK_CREATION_INTERNAL_SURFACE_ID,
    Icon: Wrench,
    label: "New internal task",
    x: 0,
    y: -72,
  },
] as const;

export function TaskCreationFab(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  usePreloadSurface(preloadReturnTaskSlideSurface);
  usePreloadSurface(preloadPreOrderTaskSlideSurface);
  usePreloadSurface(preloadInternalTaskSlideSurface);

  function handleActionPress(surfaceId: string): void {
    const callbacks: TaskCreationCallbacks = {
      onTaskCreated: ({ hadUpholstery }) => {
        // A created task that consumed upholstery changes true stored amounts;
        // refresh the app-local inventory/ordering views to match.
        if (hadUpholstery) {
          invalidateAfterInventoryMutation(queryClient);
        }
      },
    };

    useSurfaceStore.getState().open(surfaceId, { callbacks });
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
          )}
          data-testid={`task-creation-fab-action-${action.id}`}
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
          type="button"
          onClick={() => handleActionPress(action.surfaceId)}
        >
          <action.Icon aria-hidden="true" className="size-5" />
        </motion.button>
      ))}

      <motion.button
        aria-label={
          isOpen ? "Close task creation menu" : "Open task creation menu"
        }
        className={`fixed ${FAB_POSITION_CLASS} z-40 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md`}
        data-testid="task-creation-fab"
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
