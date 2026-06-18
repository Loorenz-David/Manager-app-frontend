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

export const PRIMARY_TABS = [
  ROUTES.tasks,
  ROUTES.cases,
  ROUTES.home,
] as const satisfies TabPath[];

export const MORE_TABS = [ROUTES.stats, ROUTES.settings] as const satisfies
  TabPath[];

export type MoreTabPath = (typeof MORE_TABS)[number];

export const DEFAULT_MORE_TAB: MoreTabPath = ROUTES.stats;
