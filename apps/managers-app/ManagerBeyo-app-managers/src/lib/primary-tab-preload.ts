import { lazyWithPreload } from "@beyo/ui";

import { ROUTES, type TabPath } from "@/lib/routes";

export const homePageRoute = lazyWithPreload(() =>
  import("@/pages/home/HomePage").then((m) => ({ default: m.HomePage })),
);
export const tasksPageRoute = lazyWithPreload(() =>
  import("@/pages/tasks/TasksPage").then((m) => ({ default: m.TasksPage })),
);
export const casesPageRoute = lazyWithPreload(() =>
  import("@/pages/cases/CasesPage").then((m) => ({ default: m.CasesPage })),
);
export const statsPageRoute = lazyWithPreload(() =>
  import("@/pages/stats/StatsPage").then((m) => ({ default: m.StatsPage })),
);
export const settingsPageRoute = lazyWithPreload(() =>
  import("@/pages/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);

const PRIMARY_TAB_PRELOADERS: Record<TabPath, () => Promise<void>> = {
  [ROUTES.home]: homePageRoute.preload,
  [ROUTES.tasks]: tasksPageRoute.preload,
  [ROUTES.cases]: casesPageRoute.preload,
  [ROUTES.stats]: statsPageRoute.preload,
  [ROUTES.settings]: settingsPageRoute.preload,
};

const preloadedTabs = new Set<TabPath>();

export function preloadPrimaryTabRoute(path: TabPath): Promise<void> {
  if (preloadedTabs.has(path)) {
    return Promise.resolve();
  }

  preloadedTabs.add(path);
  return PRIMARY_TAB_PRELOADERS[path]();
}

export function preloadPrimaryTabRoutes(): Promise<unknown[]> {
  return Promise.all(
    (Object.keys(PRIMARY_TAB_PRELOADERS) as TabPath[]).map((path) =>
      preloadPrimaryTabRoute(path),
    ),
  );
}
