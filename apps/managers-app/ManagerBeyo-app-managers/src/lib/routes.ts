export const ROUTES = {
  signIn: '/sign-in',
  home: '/',
  tasks: '/tasks',
  cases: '/cases',
  caseConversation: '/cases/:caseId',
  stats: '/stats',
  settings: '/settings',
  shopifyOAuthResult: '/settings/integrations/shopify/oauth-result',
  upholsteryInventory: '/upholstery-inventory',
  // TEMPORARY (stock-report UI phase): the tab currently mounts a
  // fixture-driven preview. The logic session swaps it for the real route
  // entry; the route itself stays. Code identifiers keep the feature's name,
  // the menu label reads "Stock needs" (intention §7, card 7).
  stockReport: '/stock-needs',
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
  ROUTES.stockReport,
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
  ROUTES.stockReport,
  ROUTES.settings,
] as const satisfies TabPath[];

export type MoreTabPath = (typeof MORE_TABS)[number];

export const DEFAULT_MORE_TAB: MoreTabPath = ROUTES.stats;
