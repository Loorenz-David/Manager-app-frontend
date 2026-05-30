import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { RootRoute } from "@/app/RootRoute";
import { GuestRoute, ProtectedRoute } from "@beyo/auth";
import { lazyRoute } from "@/lib/lazy-route";
import { ROUTES } from "@/lib/routes";

export const router = createBrowserRouter([
  {
    element: <RootRoute />,
    children: [
      {
        element: <GuestRoute homePath={ROUTES.home} />,
        children: [
          {
            path: ROUTES.signIn,
            element: lazyRoute(() =>
              import("@/pages/auth/SignInPage").then((module) => ({
                default: module.SignInPage,
              })),
            ),
          },
        ],
      },
      {
        element: <ProtectedRoute signInPath={ROUTES.signIn} />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                path: ROUTES.home,
                element: lazyRoute(() =>
                  import("@/pages/home/HomePage").then((module) => ({
                    default: module.HomePage,
                  })),
                ),
              },
              {
                path: ROUTES.tasks,
                element: lazyRoute(() =>
                  import("@/pages/tasks/TasksPage").then((module) => ({
                    default: module.TasksPage,
                  })),
                ),
              },
              {
                path: ROUTES.cases,
                element: lazyRoute(() =>
                  import("@/pages/cases/CasesPage").then((module) => ({
                    default: module.CasesPage,
                  })),
                ),
              },
              {
                path: ROUTES.caseConversation,
                element: lazyRoute(() =>
                  import("@/pages/cases/CaseConversationPage").then(
                    (module) => ({
                      default: module.CaseConversationPage,
                    }),
                  ),
                ),
              },
              {
                path: ROUTES.stats,
                element: lazyRoute(() =>
                  import("@/pages/stats/StatsPage").then((module) => ({
                    default: module.StatsPage,
                  })),
                ),
              },
              {
                path: ROUTES.settings,
                element: lazyRoute(() =>
                  import("@/pages/settings/SettingsPage").then((module) => ({
                    default: module.SettingsPage,
                  })),
                ),
              },
            ],
          },
        ],
      },
      {
        path: "*",
        element: lazyRoute(() =>
          import("@/pages/NotFoundPage").then((module) => ({
            default: module.NotFoundPage,
          })),
        ),
      },
    ],
  },
]);
