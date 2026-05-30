import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

import { useGlobalCaseUnreadCountQuery } from "@beyo/cases";
import type { NavTabBadgeItem } from "@beyo/ui";

import { ROUTES, type TabPath } from "@/lib/routes";

const BADGE_DISMISS_MS = 5_000;

export type TabBadgeState = {
  items: NavTabBadgeItem[];
  visible: boolean;
};

export type TabBadgeCountsController = {
  badgeState: Partial<Record<TabPath, TabBadgeState>>;
  dismissBadge: (path: TabPath) => void;
};

export function useTabBadgeCountsController(): TabBadgeCountsController {
  const { data: caseUnreadCount } = useGlobalCaseUnreadCountQuery();

  const lastShownCountRef = useRef<Partial<Record<TabPath, number>>>({});
  const timersRef = useRef<
    Partial<Record<TabPath, ReturnType<typeof setTimeout>>>
  >({});
  const [badgeState, setBadgeState] = useState<
    Partial<Record<TabPath, TabBadgeState>>
  >({});

  const dismissBadge = useCallback((path: TabPath) => {
    const timer = timersRef.current[path];

    if (timer !== undefined) {
      clearTimeout(timer);
      delete timersRef.current[path];
    }

    setBadgeState((prev) => ({
      ...prev,
      [path]: {
        items: prev[path]?.items ?? [],
        visible: false,
      },
    }));
  }, []);

  useEffect(() => {
    const count = caseUnreadCount ?? 0;
    const lastShown = lastShownCountRef.current[ROUTES.cases] ?? 0;

    if (count <= 0 || count === lastShown) {
      return;
    }

    lastShownCountRef.current[ROUTES.cases] = count;

    setBadgeState((prev) => ({
      ...prev,
      [ROUTES.cases]: {
        items: [{ icon: MessageCircle, count }],
        visible: true,
      },
    }));

    const existingTimer = timersRef.current[ROUTES.cases];
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    timersRef.current[ROUTES.cases] = setTimeout(() => {
      setBadgeState((prev) => ({
        ...prev,
        [ROUTES.cases]: {
          items: prev[ROUTES.cases]?.items ?? [],
          visible: false,
        },
      }));
      delete timersRef.current[ROUTES.cases];
    }, BADGE_DISMISS_MS);
  }, [caseUnreadCount]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => {
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      });
    };
  }, []);

  return { badgeState, dismissBadge };
}
