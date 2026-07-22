import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { GuestRoute, ProtectedRoute } from "@/components/AuthRoutes";
import { RootRoute } from "@/app/RootRoute";
import { lazyRoute } from "@/lib/lazy-route";
import { ROUTES } from "@/lib/routes";

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
              import("@/pages/SignInPage").then((module) => ({
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
                element: lazyRoute(() =>
                  import("@/pages/DashboardPage").then((module) => ({
                    default: module.DashboardPage,
                  })),
                ),
              },
              {
                path: "/editor/:presentationId",
                element: lazyRoute(() =>
                  import("@/pages/EditorPage").then((module) => ({
                    default: module.EditorPage,
                  })),
                ),
              },
            ],
          },
        ],
      },
      // Dev-only component-kit showcases (see master plan "Division of labor"); absent in prod builds.
      ...(import.meta.env.DEV
        ? [
            {
              path: "/kit/dashboard",
              element: lazyRoute(() =>
                import("@/pages/dev/DashboardKitPreviewPage").then((module) => ({
                  default: module.DashboardKitPreviewPage,
                })),
              ),
            },
            {
              path: "/kit/editor",
              element: lazyRoute(() =>
                import("@/pages/dev/EditorKitPreviewPage").then((module) => ({
                  default: module.EditorKitPreviewPage,
                })),
              ),
            },
            {
              path: "/kit/timeline",
              element: lazyRoute(() =>
                import("@/pages/dev/TimelineKitPreviewPage").then((module) => ({
                  default: module.TimelineKitPreviewPage,
                })),
              ),
            },
            {
              path: "/kit/publish",
              element: lazyRoute(() =>
                import("@/pages/dev/PublishKitPreviewPage").then((module) => ({
                  default: module.PublishKitPreviewPage,
                })),
              ),
            },
          ]
        : []),
      { path: "*", element: <Navigate to={ROUTES.home} replace /> },
    ],
  },
]);
