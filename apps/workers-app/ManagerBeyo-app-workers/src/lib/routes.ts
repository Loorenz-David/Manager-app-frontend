export const ROUTES = {
  signIn: "/sign-in",
  home: "/",
  tasks: "/tasks",
  cases: "/cases",
  caseCreation: "/cases/new",
  caseConversation: "/cases/:caseId",
  stats: "/stats",
  settings: "/settings",
} as const;

export function buildCaseCreationRoute(): string {
  return ROUTES.caseCreation;
}

export function buildCaseConversationRoute(caseId: string): string {
  return `${ROUTES.cases}/${caseId}`;
}

export type TabPath =
  | typeof ROUTES.tasks
  | typeof ROUTES.cases
  | typeof ROUTES.home
  | typeof ROUTES.stats
  | typeof ROUTES.settings;

export const TAB_ORDER: TabPath[] = [
  ROUTES.tasks,
  ROUTES.cases,
  ROUTES.home,
  ROUTES.stats,
  ROUTES.settings,
];
