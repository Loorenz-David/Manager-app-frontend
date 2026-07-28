import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ROUTES, TAB_ORDER, type TabPath } from "@/lib/routes";

/** Tab shown before any tab route has been visited (deep link into a page). */
const FALLBACK_TAB: TabPath = ROUTES.home;

type BackgroundLocationState = {
  background?: { pathname: string; search: string };
} | null;

export type TabNavigationContextValue = {
  /**
   * Tab the slide stack renders. Sticky on purpose: while a route-backed
   * surface is open (case conversation, Shopify OAuth result) the location is
   * not a tab path, and the tab that opened it stays mounted underneath.
   */
  activeTab: TabPath;
  /**
   * Tab the nav bar paints as selected. Runs ahead of `activeTab` while a
   * committed swipe settles, so the indicator moves when the finger lifts
   * instead of a pane-transition later.
   */
  displayTab: TabPath;
  /** False while a non-tab route (a page or a surface hydrator) is matched. */
  isTabRoute: boolean;
  goToTab: (path: TabPath) => void;
  /** Move one tab along TAB_ORDER. No-op at either end. */
  stepTab: (delta: 1 | -1) => void;
  /** Adjacent tab in TAB_ORDER, or null at the end. */
  adjacentTab: (delta: 1 | -1) => TabPath | null;
  /** Paint a tab as selected before its navigation lands (swipe commit). */
  previewTab: (path: TabPath) => void;
};

const TabNavigationContext = createContext<TabNavigationContextValue | null>(
  null,
);

function asTabPath(pathname: string | undefined): TabPath | null {
  return (TAB_ORDER as readonly string[]).includes(pathname ?? "")
    ? (pathname as TabPath)
    : null;
}

export function TabNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const routeTab = asTabPath(location.pathname);
  const backgroundTab = asTabPath(
    (location.state as BackgroundLocationState)?.background?.pathname,
  );

  // Remembering the last tab keeps it mounted (and its scroll position alive)
  // for routes that carry no background — a deep link, or a page opened
  // without going through the surface store.
  const [rememberedTab, setRememberedTab] = useState<TabPath>(
    routeTab ?? backgroundTab ?? FALLBACK_TAB,
  );
  const activeTab = routeTab ?? backgroundTab ?? rememberedTab;

  const [previewedTab, setPreviewedTab] = useState<TabPath | null>(null);

  // Adjusted during render (not in an effect) so the very render that reveals
  // a new tab already carries it: no second pass, no flash of the old value.
  if (rememberedTab !== activeTab) {
    setRememberedTab(activeTab);
  }
  if (previewedTab !== null && previewedTab === activeTab) {
    setPreviewedTab(null);
  }

  const adjacentTab = useCallback(
    (delta: 1 | -1): TabPath | null =>
      TAB_ORDER[TAB_ORDER.indexOf(activeTab) + delta] ?? null,
    [activeTab],
  );

  const goToTab = useCallback(
    (path: TabPath) => {
      if (path === routeTab) return;
      navigate(path);
    },
    [navigate, routeTab],
  );

  const stepTab = useCallback(
    (delta: 1 | -1) => {
      const next = adjacentTab(delta);
      if (next) navigate(next);
    },
    [adjacentTab, navigate],
  );

  const value = useMemo<TabNavigationContextValue>(
    () => ({
      activeTab,
      displayTab: previewedTab ?? activeTab,
      isTabRoute: routeTab !== null,
      goToTab,
      stepTab,
      adjacentTab,
      previewTab: setPreviewedTab,
    }),
    [activeTab, previewedTab, routeTab, goToTab, stepTab, adjacentTab],
  );

  return (
    <TabNavigationContext.Provider value={value}>
      {children}
    </TabNavigationContext.Provider>
  );
}

export function useTabNavigation(): TabNavigationContextValue {
  const context = useContext(TabNavigationContext);

  if (!context) {
    throw new Error(
      "useTabNavigation must be used within <TabNavigationProvider>",
    );
  }

  return context;
}
