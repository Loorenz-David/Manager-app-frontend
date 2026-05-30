import { AnimatePresence, m } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@beyo/lib";

export type NavTabBadgeItem = {
  icon: LucideIcon;
  count: number;
};

export type NavTabBadgeProps = {
  items: NavTabBadgeItem[];
  visible: boolean;
  className?: string;
};

const badgeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 320, damping: 22 },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.12, ease: [0.2, 0, 0, 1] },
  },
} as const;

export function NavTabBadge({
  items,
  visible,
  className,
}: NavTabBadgeProps): React.JSX.Element | null {
  return (
    <AnimatePresence>
      {visible && items.length > 0 ? (
        <m.div
          key="nav-tab-badge"
          variants={badgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ transformOrigin: "bottom center" }}
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2",
            "flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5",
            "bg-[var(--color-destructive)] text-[var(--color-card)]",
            "after:absolute after:-bottom-[5px] after:left-1/2 after:-translate-x-1/2",
            "after:border-l-[5px] after:border-r-[5px] after:border-t-[6px]",
            "after:border-l-transparent after:border-r-transparent",
            "after:border-t-[var(--color-destructive)]",
            className,
          )}
          data-testid="nav-tab-badge"
          role="status"
          aria-live="polite"
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <span
                key={`${Icon.displayName ?? Icon.name}-${item.count}-${index}`}
                className="flex items-center gap-0.5 text-xs font-semibold"
                data-testid={`nav-tab-badge-item-${index}`}
              >
                <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                <span>{item.count}</span>
              </span>
            );
          })}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
