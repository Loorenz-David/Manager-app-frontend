import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { selectUser, useAuthStore } from "@beyo/auth";
import {
  prefetchCasesData,
  prefetchCasesListData,
  useUnreadCountsQuery,
} from "@beyo/cases";
import { usePrefetchOnCondition, type NavTabBadgeItem } from "@beyo/ui";

import { preloadCaseConversationSlideSurface } from "@/features/cases/surfaces";
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
  const queryClient = useQueryClient();
  const userId = (useAuthStore(selectUser)?.id) ?? null;
  const { data: caseUnreadCountsMap } = useUnreadCountsQuery();
  const caseUnreadCount = caseUnreadCountsMap
    ? Object.values(caseUnreadCountsMap).reduce((sum, count) => sum + count, 0)
    : 0;
  const unreadCaseIds = caseUnreadCountsMap
    ? Object.keys(caseUnreadCountsMap)
    : [];

  const lastShownCountRef = useRef<Partial<Record<TabPath, number>>>({});
  const timersRef = useRef<
    Partial<Record<TabPath, ReturnType<typeof setTimeout>>>
  >({});
  const [badgeState, setBadgeState] = useState<
    Partial<Record<TabPath, TabBadgeState>>
  >({});

  usePrefetchOnCondition(userId != null, () =>
    prefetchCasesListData(queryClient, userId!),
  );

  usePrefetchOnCondition(unreadCaseIds.length > 0, () =>
    Promise.all([
      preloadCaseConversationSlideSurface(),
      prefetchCasesData(queryClient, unreadCaseIds),
    ]),
  );

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
    const count = caseUnreadCount;
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
