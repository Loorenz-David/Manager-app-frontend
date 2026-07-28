import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { RootRoute } from "@/app/RootRoute";
import { GuestRoute, ProtectedRoute } from "@beyo/auth";
import { lazyRoute } from "@/lib/lazy-route";
import { ROUTES } from "@/lib/routes";

/**
 * Tab routes render nothing of their own: the shell renders every tab itself,
 * as panes of one slide stack (TabSlideStack), so a swipe can mount the
 * neighbouring tab as its drag preview. These entries exist to match the URL.
 */
const TAB_ROUTES = [
  ROUTES.home,
  ROUTES.tasks,
  ROUTES.cases,
  ROUTES.stats,
  ROUTES.upholsteryInventory,
  ROUTES.settings,
].map((path) => ({ path, element: <></> }));

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
              ...TAB_ROUTES,
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
                path: ROUTES.shopifyOAuthResult,
                element: lazyRoute(() =>
                  import("@/pages/settings/ShopifyOAuthResultPage").then(
                    (module) => ({
                      default: module.ShopifyOAuthResultPage,
                    }),
                  ),
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
