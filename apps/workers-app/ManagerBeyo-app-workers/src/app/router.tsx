import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { PageSkeleton, RouteErrorBoundary } from "@beyo/ui";
import { AppShell } from "@/app/AppShell";
import { RootRoute } from "@/app/RootRoute";
import { GuestRoute, ProtectedRoute } from "@/features/auth";
import { lazyRoute } from "@/lib/lazy-route";
import {
  casesPageRoute,
  homePageRoute,
  settingsPageRoute,
  statsPageRoute,
  tasksPageRoute,
} from "@/lib/primary-tab-preload";
import { ROUTES } from "@/lib/routes";

function tabRoute(Component: React.ComponentType): React.JSX.Element {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <Component />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootRoute />,
    children: [
      {
        element: <GuestRoute />,
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
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                path: ROUTES.home,
                element: tabRoute(homePageRoute.Component),
              },
              {
                path: ROUTES.tasks,
                element: tabRoute(tasksPageRoute.Component),
              },
              {
                path: ROUTES.cases,
                element: tabRoute(casesPageRoute.Component),
              },
              {
                path: ROUTES.caseCreation,
                element: lazyRoute(() =>
                  import("@/pages/cases/CaseCreationSlidePage").then(
                    (module) => ({
                      default: module.CaseCreationSlidePage,
                    }),
                  ),
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
                element: tabRoute(statsPageRoute.Component),
              },
              {
                path: ROUTES.settings,
                element: tabRoute(settingsPageRoute.Component),
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
