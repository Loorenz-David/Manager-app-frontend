export const ROUTES = {
  signIn: '/sign-in',
  home: '/',
  tasks: '/tasks',
  cases: '/cases',
  caseConversation: '/cases/:caseId',
  stats: '/stats',
  settings: '/settings',
  upholsteryInventory: '/upholstery-inventory',
} as const;

export function buildCaseConversationRoute(caseId: string): string {
  return `${ROUTES.cases}/${caseId}`;
}

export const TAB_ORDER = [
  ROUTES.tasks,
  ROUTES.cases,
  ROUTES.home,
  ROUTES.stats,
  ROUTES.upholsteryInventory,
  ROUTES.settings,
] as const;

export type TabPath = (typeof TAB_ORDER)[number];

export const PRIMARY_TABS = [
  ROUTES.tasks,
  ROUTES.cases,
  ROUTES.home,
] as const satisfies TabPath[];

export const MORE_TABS = [
  ROUTES.stats,
  ROUTES.upholsteryInventory,
  ROUTES.settings,
] as const satisfies TabPath[];

export type MoreTabPath = (typeof MORE_TABS)[number];

export const DEFAULT_MORE_TAB: MoreTabPath = ROUTES.stats;
