import { lazyWithPreload } from "@beyo/ui";

import { type TabPath, ROUTES } from "./routes";

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

const tabPreloaders: Partial<Record<TabPath, () => Promise<void>>> = {
  [ROUTES.home]: homePageRoute.preload,
  [ROUTES.tasks]: tasksPageRoute.preload,
  [ROUTES.cases]: casesPageRoute.preload,
  [ROUTES.stats]: statsPageRoute.preload,
  [ROUTES.settings]: settingsPageRoute.preload,
};

export function preloadPrimaryTabRoute(path: TabPath): void {
  void tabPreloaders[path]?.();
}

export function preloadPrimaryTabRoutes(): void {
  for (const preload of Object.values(tabPreloaders)) {
    void preload();
  }
}
