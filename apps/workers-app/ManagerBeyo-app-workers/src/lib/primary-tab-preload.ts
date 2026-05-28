import { type TabPath, ROUTES } from "./routes";

const tabPreloaders: Partial<Record<TabPath, () => Promise<unknown>>> = {
  [ROUTES.home]: () => import("@/pages/home/HomePage"),
  [ROUTES.tasks]: () => import("@/pages/tasks/TasksPage"),
  [ROUTES.cases]: () => import("@/pages/cases/CasesPage"),
  [ROUTES.stats]: () => import("@/pages/stats/StatsPage"),
  [ROUTES.settings]: () => import("@/pages/settings/SettingsPage"),
};

export function preloadPrimaryTabRoute(path: TabPath): void {
  void tabPreloaders[path]?.();
}

export function preloadPrimaryTabRoutes(): void {
  for (const preload of Object.values(tabPreloaders)) {
    void preload();
  }
}
