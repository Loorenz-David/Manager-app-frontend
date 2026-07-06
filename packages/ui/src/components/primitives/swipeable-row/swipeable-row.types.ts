import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type SwipeableRowAction = {
  icon: LucideIcon;
  label: string;
  className: string;
};

export type SwipeableRowProps = {
  children: ReactNode;
  leftToRightAction?: SwipeableRowAction;
  rightToLeftAction?: SwipeableRowAction;
  onSwipeLeftToRight?: () => Promise<void> | void;
  onSwipeRightToLeft?: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
  className?: string;
};
