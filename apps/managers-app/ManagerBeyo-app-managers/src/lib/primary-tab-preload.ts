import { ROUTES, type TabPath } from '@/lib/routes';

const PRIMARY_TAB_IMPORTERS: Record<TabPath, () => Promise<unknown>> = {
  [ROUTES.home]: () => import('@/pages/home/HomePage'),
  [ROUTES.tasks]: () => import('@/pages/tasks/TasksPage'),
  [ROUTES.cases]: () => import('@/pages/cases/CasesPage'),
  [ROUTES.stats]: () => import('@/pages/stats/StatsPage'),
  [ROUTES.settings]: () => import('@/pages/settings/SettingsPage'),
};

const preloadedTabs = new Set<TabPath>();

export function preloadPrimaryTabRoute(path: TabPath): Promise<unknown> {
  if (preloadedTabs.has(path)) {
    return Promise.resolve();
  }

  preloadedTabs.add(path);
  return PRIMARY_TAB_IMPORTERS[path]();
}

export function preloadPrimaryTabRoutes(): Promise<unknown[]> {
  return Promise.all(
    (Object.keys(PRIMARY_TAB_IMPORTERS) as TabPath[]).map((path) =>
      preloadPrimaryTabRoute(path),
    ),
  );
}
