export const ROUTES = {
  signIn: '/sign-in',
  home: '/',
  tasks: '/tasks',
  cases: '/cases',
  caseConversation: '/cases/:caseId',
  stats: '/stats',
  settings: '/settings',
} as const;

export function buildCaseConversationRoute(caseId: string): string {
  return `${ROUTES.cases}/${caseId}`;
}

export const TAB_ORDER = [
  ROUTES.tasks,
  ROUTES.cases,
  ROUTES.home,
  ROUTES.stats,
  ROUTES.settings,
] as const;

export type TabPath = (typeof TAB_ORDER)[number];
